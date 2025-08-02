import * as vscode from 'vscode';
import { DocumentationResult } from '../types';
/**
 * Manages interaction with the MCP server for documentation retrieval.
 * This service implements the correct two-step process:
 * 1. Resolve a library name (e.g., "openshift") into a Context7 ID.
 * 2. Use the ID to fetch documentation for a specific topic.
 */
export declare class MCPService implements vscode.Disposable {
    private context;
    private config;
    private serverUrl;
    constructor(context: vscode.ExtensionContext);
    /**
     * Loads and parses the mcp.json configuration file from the extension's root directory.
     * @returns The parsed configuration object.
     */
    private loadConfiguration;
    /**
     * The main public method to fetch documentation. It orchestrates the two-step process.
     * @param technology The library/technology name (e.g., 'openshift').
     * @param query The specific topic or query.
     * @returns A promise that resolves to an array of documentation results.
     */
    getDocumentation(technology: string, query: string): Promise<DocumentationResult[]>;
    /**
     * Step 1: Calls the 'resolve-library-id' tool on the MCP server.
     * This now parses the text response to find the best matching library ID.
     * @param libraryName The name of the library to resolve.
     * @returns A promise that resolves to the Context7-compatible library ID.
     */
    private resolveLibraryId;
    /**
     * Step 2: Calls the 'get-library-docs' tool on the MCP server.
     * @param libraryId The Context7-compatible library ID.
     * @param topic The specific query/topic for the documentation.
     * @returns A promise that resolves to the documentation content.
     */
    private fetchDocsForLibrary;
    /**
     * Parses the final documentation content into a structured format.
     * @param docContent The content returned from the 'get-library-docs' tool.
     * @returns An array of DocumentationResult objects.
     */
    private parseDocumentation;
    /**
     * Sends a JSON-RPC request to the configured MCP server URL using Node's native https module.
     * @param request The MCPRequest to send.
     * @returns A promise that resolves with the MCPResponse.
     */
    private sendHttpRequest;
    dispose(): void;
}
//# sourceMappingURL=mcpService.d.ts.map