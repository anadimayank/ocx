import * as vscode from 'vscode';
import { CopilotService } from '../services/copilotService';
import { MCPService } from '../services/mcpService';
import { StackOverflowService } from '../services/stackOverflowService';

/**
 * The main chat provider for the ocX assistant. It handles user requests,
 * routes them to the appropriate service (documentation, AI, etc.),
 * and streams responses back to the chat UI.
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
        this.log('ocX Chat Provider initialized.');
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
            if (request.command) {
                return await this.handleSlashCommand(request.command, request.prompt, stream, token);
            }
            // For general queries, defer to the AI model.
            const prompt = `User is asking about: "${request.prompt}". Provide a helpful response.`;
            await this.copilotService.generateStreamingResponse(prompt, stream, token);
            return {};
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            this.logError('Failed to handle request', error);
            stream.markdown(`❌ **Error:** ${message}`);
            return { errorDetails: { message } };
        }
    }

    /**
     * Handles specific slash commands like /docs or /search.
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
                return this.handleDocumentation(prompt, stream, token);
            case 'search':
                return this.handleStackOverflowSearch(prompt, stream, token);
            case 'explain':
                return this.handleExplain(stream, token);
            default:
                stream.markdown(`Unknown command: \`/${command}\`.`);
                return {};
        }
    }

    /**
     * Fetches and displays documentation from the MCP service.
     */
    private async handleDocumentation(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        const [technology, ...queryParts] = prompt.split(' ');
        const query = queryParts.join(' ').trim();

        if (!technology || !query) {
            stream.markdown('Please provide a technology and a query for the `/docs` command.\n\n**Example:** `/docs openshift create route`');
            return {};
        }

        stream.progress(`📚 Fetching documentation for "${query}" on ${technology}...`);
        try {
            // Correctly call getDocumentation with two arguments.
            const docResults = await this.mcpService.getDocumentation(technology, query);
            if (docResults.length === 0) {
                stream.markdown(`No documentation found for "${query}" on ${technology}. I will ask the AI assistant for help.\n\n`);
                const aiPrompt = `Provide documentation and examples for "${query}" related to ${technology}.`;
                await this.copilotService.generateStreamingResponse(aiPrompt, stream, token);
                return {};
            }

            stream.markdown(`## 📖 Documentation for "${query}" on ${technology}\n\n`);
            for (const doc of docResults) {
                const snippet = doc.content.substring(0, 1500);
                stream.markdown(`### ${doc.title}\n\n${snippet}...\n\n`);
                if (doc.url) {
                    stream.markdown(`[Read More](${doc.url})\n\n---\n\n`);
                }
            }
        } catch (error) {
            this.logError('Documentation fetch failed', error);
            stream.markdown(`⚠️ **Sorry, I couldn't fetch live documentation.** I'll ask the AI assistant instead.\n\n`);
            const aiPrompt = `Provide documentation and examples for "${query}" related to ${technology}.`;
            await this.copilotService.generateStreamingResponse(aiPrompt, stream, token);
        }
        return {};
    }
    
    /**
     * Searches Stack Overflow for community-provided answers.
     */
    private async handleStackOverflowSearch(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress(`🔍 Searching Stack Overflow for "${prompt}"...`);
        try {
            const results = await this.stackOverflowService.searchQuestions(prompt, 5);
            if (results.length === 0) {
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
            stream.markdown('Sorry, I was unable to search Stack Overflow at this time.');
        }
        return {};
    }

    /**
     * Explains a selected code snippet using the AI model.
     */
    private async handleExplain(
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            stream.markdown('Please select a code snippet in your editor before using the `/explain` command.');
            return {};
        }

        stream.progress('🧠 Explaining the selected code...');
        const prompt = `Please explain the following code snippet:\n\n\`\`\`\n${selectedText}\n\`\`\``;
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
    }
}
