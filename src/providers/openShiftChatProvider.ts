import * as vscode from 'vscode';
import { CopilotService } from '../services/copilotService';
import { MCPService } from '../services/mcpService';
import { StackOverflowService } from '../services/stackOverflowService';

/**
 * The main chat provider for the ocX assistant, specialized for Red Hat OpenShift.
 * It provides expert-level answers and tools for documentation and community searches.
 */
export class OpenShiftChatProvider implements vscode.Disposable {
    private readonly copilotService: CopilotService;
    private readonly mcpService: MCPService;
    private readonly stackOverflowService: StackOverflowService;
    private readonly outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('ocX Assistant');
        this.copilotService = new CopilotService();
        this.mcpService = new MCPService(context);
        this.stackOverflowService = new StackOverflowService();
        this.log('ocX OpenShift Specialist Chat Provider initialized.');
    }

    /**
     * Handles incoming chat requests from the user.
     */
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        try {
            const prompt = request.prompt.trim().toLowerCase();

            if (request.command) {
                return await this.handleSlashCommand(request.command, request.prompt, stream, token);
            }

            if (prompt === 'hello' || prompt === 'hi') {
                return this.handleGreeting(stream);
            }

            // For all other queries, provide a direct AI-driven answer.
            await this.copilotService.generateStreamingResponse(request.prompt, stream, token);
            return {};

        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            this.logError('Failed to handle request', error);
            stream.markdown(`❌ **Error:** ${message}`);
            return { errorDetails: { message } };
        }
    }

    /**
     * Handles specific slash commands for tools.
     */
    private async handleSlashCommand(
        command: string,
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        this.log(`Handling command: /${command} with prompt: "${prompt}"`);
        switch (command) {
            case 'docs':
                return this.handleDocumentation(prompt, stream);
            case 'search':
                return this.handleStackOverflowSearch(prompt, stream);
            case 'explain':
                return this.handleExplain(stream, token);
            default:
                stream.markdown(`Unknown command: \`/${command}\`. Valid commands are /docs, /search, and /explain.`);
                return {};
        }
    }
    
    /**
     * Responds to a greeting with a specialized welcome message.
     */
    private handleGreeting(stream: vscode.ChatResponseStream): vscode.ChatResult {
        stream.markdown(`Hello! I'm **ocX**, your specialized AI assistant for Red Hat OpenShift.\n\nHere's how I can help:\n\n* **Ask me anything** about OpenShift administration or development.\n* **/docs [query]**: Fetch the latest official OpenShift documentation.\n  *Example: \`/docs create a route\`*\n* **/search [query]**: Search Stack Overflow for community solutions to errors or problems.\n  *Example: \`/search ImagePullBackOff\`*\n* **/explain**: Select an OpenShift YAML or code snippet in your editor and I'll explain it.\n\nHow can I help you today?`);
        return {};
    }

    /**
     * Fetches and displays documentation from the Context7 MCP service.
     */
    private async handleDocumentation(prompt: string, stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
        if (!prompt) {
            stream.markdown('Please provide a topic for the `/docs` command.');
            return {};
        }
        stream.progress(`📚 Fetching official OpenShift documentation for "${prompt}"...`);
        try {
            const docResults = await this.mcpService.getDocumentation('openshift', prompt);
            if (docResults.length === 0) {
                stream.markdown(`No specific documentation found for "${prompt}".`);
                return {};
            }

            stream.markdown(`## 📖 OpenShift Documentation for "${prompt}"\n\n`);
            for (const doc of docResults) {
                const snippet = doc.content.substring(0, 2000);
                stream.markdown(`### ${doc.title}\n\n${snippet}...\n\n`);
                if (doc.url) {
                    stream.markdown(`[Read More](${doc.url})\n\n---\n\n`);
                }
            }
        } catch (error) {
            this.logError('Documentation fetch failed', error);
            stream.markdown(`⚠️ **Sorry, I couldn't fetch live documentation at this time.**`);
        }
        return {};
    }

    /**
     * Searches Stack Overflow using the dedicated MCP server.
     */
    private async handleStackOverflowSearch(prompt: string, stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
        if (!prompt) {
            stream.markdown('Please provide a query or error message for the `/search` command.');
            return {};
        }
        stream.progress(`🔍 Searching Stack Overflow for solutions to "${prompt}"...`);
        try {
            const results = await this.stackOverflowService.searchOpenShiftQuestions(prompt);
            if (!results || results.length === 0) {
                stream.markdown('No relevant questions found on Stack Overflow.');
                return {};
            }
            stream.markdown(`## 🌐 Stack Overflow Results for "${prompt}"\n\n`);
            for (const result of results) {
                stream.markdown(`### [${result.title}](${result.link})\n`);
                stream.markdown(`**Score:** ${result.score} | **Answers:** ${result.answer_count}\n\n---\n\n`);
            }
        } catch (error) {
            this.logError('Stack Overflow search failed', error);
            stream.markdown(`⚠️ **Sorry, I was unable to search Stack Overflow at this time.**`);
        }
        return {};
    }

    /**
     * Explains a selected code snippet using the AI model.
     */
    private async handleExplain(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<vscode.ChatResult> {
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            stream.markdown('Please select an OpenShift YAML or code snippet in your editor before using the `/explain` command.');
            return {};
        }
        stream.progress('🧠 Explaining the selected OpenShift code...');
        const prompt = `Please explain the following OpenShift-related code snippet:\n\n\`\`\`\n${selectedText}\n\`\`\``;
        await this.copilotService.generateStreamingResponse(prompt, stream, token);
        return {};
    }
    
    private getSelectedText(): string | undefined {
        return vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection);
    }

    private log(message: string): void {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }

    private logError(message: string, error: any): void {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${message}\n${errorMessage}`);
    }

    dispose(): void {
        this.outputChannel.dispose();
        this.mcpService.dispose();
        // The StackOverflowService does not have a dispose method as it doesn't hold persistent resources.
        // this.stackOverflowService.dispose(); 
    }
}
