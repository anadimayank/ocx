"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
/**
 * Manages interaction with the MCP server for documentation retrieval.
 * This service implements the correct two-step process:
 * 1. Resolve a library name (e.g., "openshift") into a Context7 ID.
 * 2. Use the ID to fetch documentation for a specific topic.
 */
class MCPService {
    constructor(context) {
        this.context = context;
        this.config = this.loadConfiguration();
        this.serverUrl = new URL(this.config.mcpServers.context7.url);
    }
    /**
     * Loads and parses the mcp.json configuration file from the extension's root directory.
     * @returns The parsed configuration object.
     */
    loadConfiguration() {
        const configPath = path.join(this.context.extensionPath, 'mcp.json');
        try {
            if (fs.existsSync(configPath)) {
                const rawConfig = fs.readFileSync(configPath, 'utf-8');
                console.log('[MCPService] Successfully loaded mcp.json configuration.');
                return JSON.parse(rawConfig);
            }
        }
        catch (error) {
            console.error('[MCPService] Error reading or parsing mcp.json:', error);
        }
        // Fallback to a default configuration if the file is missing or invalid.
        vscode.window.showErrorMessage('Could not load mcp.json. Using default MCP configuration.');
        return {
            mcpServers: {
                context7: { url: 'https://mcp.context7.com/mcp', type: 'http' }
            },
            defaultTimeout: 30000,
            retryAttempts: 3
        };
    }
    /**
     * The main public method to fetch documentation. It orchestrates the two-step process.
     * @param technology The library/technology name (e.g., 'openshift').
     * @param query The specific topic or query.
     * @returns A promise that resolves to an array of documentation results.
     */
    async getDocumentation(technology, query) {
        try {
            let effectiveTechnology = technology;
            // Heuristic to correct a misidentified technology name. If a generic term
            // like "latest" is passed as the technology, scan the query for a known tech keyword.
            if (['latest', 'version', 'current'].includes(technology.toLowerCase())) {
                const knownTechs = ['openshift', 'kubernetes', 'python', 'go', 'rust', 'react', 'behat', 'mongo', 'next.js'];
                const queryWords = query.toLowerCase().split(' ');
                for (const tech of knownTechs) {
                    if (queryWords.includes(tech)) {
                        effectiveTechnology = tech;
                        console.log(`[MCPService] Corrected technology from "${technology}" to "${effectiveTechnology}" based on query.`);
                        break; // Use the first match
                    }
                }
            }
            console.log(`[MCPService] Starting documentation fetch for technology: "${effectiveTechnology}"`);
            // Step 1: Resolve the library name into a Context7-compatible ID.
            const libraryId = await this.resolveLibraryId(effectiveTechnology);
            console.log(`[MCPService] Resolved library ID: "${libraryId}"`);
            // Step 2: Use the resolved ID to fetch the actual documentation.
            const docContent = await this.fetchDocsForLibrary(libraryId, query);
            // Step 3: Parse and return the final results.
            return this.parseDocumentation(docContent);
        }
        catch (error) {
            console.error(`[MCPService] Failed to get documentation for "${technology}" - "${query}":`, error);
            throw error; // Re-throw for the provider to handle.
        }
    }
    /**
     * Step 1: Calls the 'resolve-library-id' tool on the MCP server.
     * This now parses the text response to find the best matching library ID.
     * @param libraryName The name of the library to resolve.
     * @returns A promise that resolves to the Context7-compatible library ID.
     */
    async resolveLibraryId(libraryName) {
        const request = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'resolve-library-id',
                arguments: { libraryName },
            },
            id: `req_resolve_${Date.now()}`,
        };
        const response = await this.sendHttpRequest(request);
        if (response.error) {
            throw new Error(response.error.message);
        }
        if (!response.result || !response.result.content || !Array.isArray(response.result.content) || response.result.content.length === 0) {
            throw new Error(`Could not resolve library ID for "${libraryName}". No content returned.`);
        }
        // The server returns a text block within the first element of the content array.
        const responseText = response.result.content[0]?.text;
        if (typeof responseText !== 'string') {
            throw new Error('Invalid response format from resolve-library-id tool.');
        }
        // Regex to find library entries and extract their title and ID.
        const libraryRegex = /- Title: (.*?)\n- Context7-compatible library ID: (.*?)\n/g;
        let match;
        const libraries = [];
        while ((match = libraryRegex.exec(responseText)) !== null) {
            libraries.push({ title: match[1], id: match[2] });
        }
        if (libraries.length === 0) {
            throw new Error(`No libraries found in the response for "${libraryName}".`);
        }
        // Find the first library whose title includes the requested library name (case-insensitive).
        const lowerCaseLibraryName = libraryName.toLowerCase();
        const foundLibrary = libraries.find(lib => lib.title.toLowerCase().includes(lowerCaseLibraryName));
        if (!foundLibrary) {
            throw new Error(`Could not find a matching library for "${libraryName}" in the server's response.`);
        }
        return foundLibrary.id;
    }
    /**
     * Step 2: Calls the 'get-library-docs' tool on the MCP server.
     * @param libraryId The Context7-compatible library ID.
     * @param topic The specific query/topic for the documentation.
     * @returns A promise that resolves to the documentation content.
     */
    async fetchDocsForLibrary(libraryId, topic) {
        const request = {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'get-library-docs',
                arguments: {
                    context7CompatibleLibraryID: libraryId,
                    topic: topic,
                },
            },
            id: `req_fetch_${Date.now()}`,
        };
        const response = await this.sendHttpRequest(request);
        if (response.error) {
            throw new Error(response.error.message);
        }
        if (!response.result || !response.result.content) {
            console.log(`[MCPService] No documentation content found for topic: "${topic}"`);
            return null;
        }
        return response.result.content;
    }
    /**
     * Parses the final documentation content into a structured format.
     * @param docContent The content returned from the 'get-library-docs' tool.
     * @returns An array of DocumentationResult objects.
     */
    parseDocumentation(docContent) {
        if (!docContent)
            return [];
        const toDocResult = (doc) => ({
            title: doc.title || 'Documentation',
            content: doc.text || doc.content || '',
            source: 'Context7 MCP',
            version: doc.version || 'latest',
            url: doc.url || doc.uri || '',
        });
        if (Array.isArray(docContent)) {
            return docContent.map(toDocResult);
        }
        else if (typeof docContent === 'object' && docContent !== null) {
            return [toDocResult(docContent)];
        }
        return [];
    }
    /**
     * Sends a JSON-RPC request to the configured MCP server URL using Node's native https module.
     * @param request The MCPRequest to send.
     * @returns A promise that resolves with the MCPResponse.
     */
    sendHttpRequest(request) {
        const postData = JSON.stringify(request);
        const options = {
            hostname: this.serverUrl.hostname,
            path: this.serverUrl.pathname,
            method: 'POST',
            timeout: this.config.defaultTimeout,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json, text/event-stream',
                'User-Agent': 'Node.js-https'
            }
        };
        console.log(`[MCPService] Sending native HTTPS request to ${this.serverUrl.href} for tool: ${request.params.name}`);
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    console.log(`[MCPService] Received HTTP response with status: ${res.statusCode}`);
                    console.log(`[MCPService] Raw response body:`, responseBody);
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonStartIndex = responseBody.indexOf('{');
                            if (jsonStartIndex === -1) {
                                throw new Error('No JSON object found in the server response.');
                            }
                            const jsonString = responseBody.substring(jsonStartIndex);
                            const parsedResponse = JSON.parse(jsonString);
                            resolve(parsedResponse);
                        }
                        catch (e) {
                            reject(new Error(`Failed to parse JSON response. Error: ${e instanceof Error ? e.message : 'Unknown'}`));
                        }
                    }
                    else {
                        reject(new Error(`Server responded with status code ${res.statusCode}. Body: ${responseBody}`));
                    }
                });
            });
            req.on('error', (e) => reject(new Error(`HTTPS request failed: ${e.message}`)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timed out after ${this.config.defaultTimeout}ms.`));
            });
            req.write(postData);
            req.end();
        });
    }
    dispose() {
        // Nothing to dispose.
    }
}
exports.MCPService = MCPService;
//# sourceMappingURL=mcpService.js.map