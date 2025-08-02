import * as vscode from 'vscode';
/**
 * The main chat provider for the ocX assistant, specialized for Red Hat OpenShift.
 * It provides expert-level answers and tools for documentation and community searches.
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
     * Handles specific slash commands for tools.
     */
    private handleSlashCommand;
    /**
     * Responds to a greeting with a specialized welcome message.
     */
    private handleGreeting;
    /**
     * Fetches and displays documentation from the Context7 MCP service.
     */
    private handleDocumentation;
    /**
     * Searches Stack Overflow using the dedicated MCP server.
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