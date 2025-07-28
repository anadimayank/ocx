import * as vscode from 'vscode';
import * as cp from 'child_process';
import { MCPRequest, MCPResponse, DocumentationResult } from '../types';

export class MCPService implements vscode.Disposable {
    private mcpProcess: cp.ChildProcess | null = null;
    private isConnected = false;
    private requestIdCounter = 0;
    private disposed = false;
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: MCPResponse) => void;
            reject: (error: any) => void;
            timeout: NodeJS.Timeout;
        }
    >();

    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds timeout

    constructor(private context: vscode.ExtensionContext) {
        this.initializeConnection();
    }

    private initializeConnection(): void {
        if (this.disposed || this.mcpProcess) {
            // Prevent multiple initializations
            return;
        }

        try {
            const command = 'npx';
            const args = ['-y', '@upstash/context7-mcp'];

            console.log(`[MCPService] Spawning MCP server: ${command} ${args.join(' ')}`);

            this.mcpProcess = cp.spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                cwd: this.context.extensionPath,
            });

            this.isConnected = true;
            console.log('[MCPService] MCP process spawned.');

            // Buffer for stdout data to handle partial JSON lines
            let responseBuffer = '';

            this.mcpProcess.stdout!.on('data', (data: Buffer) => {
                if (this.disposed) return;

                const chunk = data.toString();
                responseBuffer += chunk;

                // Log raw stdout chunk (can be verbose; consider removing in production)
                console.log(`[MCPService] MCP stdout chunk received: ${chunk.trim()}`);

                // Process complete lines (assuming each line is a JSON message)
                let newlineIndex;
                while ((newlineIndex = responseBuffer.indexOf('\n')) !== -1) {
                    const line = responseBuffer.substring(0, newlineIndex).trim();
                    responseBuffer = responseBuffer.substring(newlineIndex + 1);

                    if (line.length === 0) continue;

                    try {
                        const response: MCPResponse = JSON.parse(line);
                        this.handleResponse(response);
                    } catch (err) {
                        console.error('[MCPService] Failed to parse MCP stdout line:', line, err);
                    }
                }
            });

            this.mcpProcess.stderr!.on('data', (data: Buffer) => {
                const errMsg = data.toString().trim();
                if (errMsg.length > 0) {
                    console.warn(`[MCPService] MCP process stderr: ${errMsg}`);
                }
            });

            this.mcpProcess.on('exit', (code: number | null) => {
                if (this.disposed) return;

                console.log(`[MCPService] MCP process exited with code ${code}`);
                this.isConnected = false;
                this.mcpProcess = null;

                // Reject any pending requests as MCP process is down
                this.rejectPendingRequests('MCP process exited unexpectedly');

                // Attempt to restart MCP process after delay
                setTimeout(() => {
                    if (!this.disposed) {
                        this.initializeConnection();
                    }
                }, 5000);
            });

            this.mcpProcess.on('error', (error: Error) => {
                if (this.disposed) return;

                console.error('[MCPService] Error starting MCP process:', error);
                this.isConnected = false;
                this.mcpProcess = null;
                this.rejectPendingRequests(`MCP process failed to start: ${error.message}`);
            });
        } catch (e) {
            console.error('[MCPService] Unexpected error during MCP process initialization:', e);
        }
    }

    /**
     * Request live documentation from MCP server.
     * @param query The search query string.
     * @returns Promise resolving to an array of DocumentationResult.
     */
    async getDocumentation(query: string): Promise<DocumentationResult[]> {
        if (!this.isConnected || !this.mcpProcess) {
            throw new Error('MCP server is not connected or process is not running.');
        }

        const request: MCPRequest = {
            method: 'tools/call',
            params: {
                name: 'search-documentation',
                arguments: { query, source: 'openshift', version: 'latest' },
            },
            id: this.generateRequestId(),
        };

        const response = await this.sendRequest(request);

        if (!response.result || !response.result.content) {
            // Return empty array if no content found
            return [];
        }

        const docContent = response.result.content;

        // Helper to process doc item into DocumentationResult
        const toDocResult = (doc: any): DocumentationResult => ({
            title: doc.title || 'OpenShift Documentation',
            content: doc.text || doc.content || '',
            source: 'Context7 MCP',
            version: doc.version || 'latest',
            url: doc.url || doc.uri || '',
        });

        if (Array.isArray(docContent)) {
            return docContent.map(toDocResult);
        } else if (typeof docContent === 'object' && docContent !== null) {
            return [toDocResult(docContent)];
        }

        return [];
    }

    /**
     * Send a JSON-RPC request to MCP process via stdin.
     * @param request MCPRequest object.
     * @returns Promise resolving to MCPResponse.
     */
    private sendRequest(request: MCPRequest): Promise<MCPResponse> {
        return new Promise((resolve, reject) => {
            if (!this.mcpProcess || !this.mcpProcess.stdin || !this.isConnected) {
                return reject(new Error('MCP server process is not available.'));
            }

            const requestId = request.id || this.generateRequestId();
            request.id = requestId;

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request to MCP server timed out (id: ${requestId}).`));
            }, this.REQUEST_TIMEOUT);

            this.pendingRequests.set(requestId, { resolve, reject, timeout });

            const payload = JSON.stringify(request) + '\n';

            console.log(`[MCPService] Sending request to MCP stdin: ${payload.trim()}`);

            // Write request payload to MCP stdin
            this.mcpProcess.stdin.write(payload, (error) => {
                if (error) {
                    clearTimeout(timeout);
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Failed to write to MCP process stdin: ${error.message}`));
                }
            });
        });
    }

    /**
     * Handle MCP server JSON-RPC responses from stdout.
     * Matches response with pending requests by request ID.
     * @param response MCPResponse object.
     */
    private handleResponse(response: MCPResponse): void {
        const requestId = response.id;
        if (!requestId) {
            console.warn('[MCPService] Received MCP response without an ID:', response);
            return;
        }

        const pending = this.pendingRequests.get(requestId);
        if (!pending) {
            console.warn(`[MCPService] No pending request found for response ID: ${requestId}`);
            return;
        }

        // Clear timeout and remove from pending
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);

        if (response.error) {
            pending.reject(new Error(response.error.message));
        } else {
            pending.resolve(response);
        }
    }

    /**
     * Reject all pending MCP requests, e.g. on process exit.
     * @param reason Reason for rejection.
     */
    private rejectPendingRequests(reason: string): void {
        for (const [, { reject, timeout }] of this.pendingRequests) {
            clearTimeout(timeout);
            reject(new Error(reason));
        }
        this.pendingRequests.clear();
    }

    /**
     * Generate unique request ID string for MCP requests.
     */
    private generateRequestId(): string {
        return `req_${++this.requestIdCounter}_${Date.now()}`;
    }

    /**
     * Check if MCP service is available.
     */
    isServiceAvailable(): boolean {
        return this.isConnected && this.mcpProcess !== null;
    }

    /**
     * Dispose MCP service, terminate MCP process and reject pending requests.
     */
    dispose(): void {
        this.disposed = true;

        this.rejectPendingRequests('MCP service is disposed');

        if (this.mcpProcess) {
            console.log('[MCPService] Killing MCP process.');
            this.mcpProcess.kill();
            this.mcpProcess = null;
        }

        this.isConnected = false;
    }
}
