import * as vscode from 'vscode';
/**
 * The main chat provider for the ocX assistant. It handles user requests,
 * routes them to the appropriate service (documentation, AI, etc.),
 * and streams responses back to the chat UI.
 */
export declare class OpenShiftChatProvider implements vscode.Disposable {
    private context;
    private readonly copilotService;
    private readonly mcpService;
    private readonly stackOverflowService;
    private readonly outputChannel;
    constructor(context: vscode.ExtensionContext);
    /**
     * Handles incoming chat requests from the user.
     */
    handleRequest(request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<vscode.ChatResult>;
    /**
     * Handles specific slash commands like /docs or /search.
     */
    private handleSlashCommand;
    /**
     * Fetches and displays documentation from the MCP service.
     */
    private handleDocumentation;
    /**
     * Searches Stack Overflow for community-provided answers.
     */
    private handleStackOverflowSearch;
    /**
     * Explains a selected code snippet using the AI model.
     */
    private handleExplain;
    private getSelectedText;
    private log;
    private logError;
    dispose(): void;
}
//# sourceMappingURL=openShiftChatProvider.d.ts.map