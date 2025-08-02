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
exports.OpenShiftChatProvider = void 0;
const vscode = __importStar(require("vscode"));
const copilotService_1 = require("../services/copilotService");
const mcpService_1 = require("../services/mcpService");
const stackOverflowService_1 = require("../services/stackOverflowService");
/**
 * The main chat provider for the ocX assistant. It handles user requests,
 * routes them to the appropriate service (documentation, AI, etc.),
 * and streams responses back to the chat UI.
 */
class OpenShiftChatProvider {
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('ocX Assistant');
        this.copilotService = new copilotService_1.CopilotService();
        this.mcpService = new mcpService_1.MCPService(context);
        this.stackOverflowService = new stackOverflowService_1.StackOverflowService();
        this.log('ocX Chat Provider initialized.');
    }
    /**
     * Handles incoming chat requests from the user.
     */
    async handleRequest(request, context, stream, token) {
        try {
            if (request.command) {
                return await this.handleSlashCommand(request.command, request.prompt, stream, token);
            }
            // For general queries, defer to the AI model.
            const prompt = `User is asking about: "${request.prompt}". Provide a helpful response.`;
            await this.copilotService.generateStreamingResponse(prompt, stream, token);
            return {};
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            this.logError('Failed to handle request', error);
            stream.markdown(`❌ **Error:** ${message}`);
            return { errorDetails: { message } };
        }
    }
    /**
     * Handles specific slash commands like /docs or /search.
     */
    async handleSlashCommand(command, prompt, stream, token) {
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
    async handleDocumentation(prompt, stream, token) {
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
        }
        catch (error) {
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
    async handleStackOverflowSearch(prompt, stream, token) {
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
        }
        catch (error) {
            this.logError('Stack Overflow search failed', error);
            stream.markdown('Sorry, I was unable to search Stack Overflow at this time.');
        }
        return {};
    }
    /**
     * Explains a selected code snippet using the AI model.
     */
    async handleExplain(stream, token) {
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
    getSelectedText() {
        return vscode.window.activeTextEditor?.document.getText(vscode.window.activeTextEditor.selection);
    }
    log(message) {
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
    }
    logError(message, error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR: ${message}\n${errorMessage}`);
    }
    dispose() {
        this.outputChannel.dispose();
        this.mcpService.dispose();
    }
}
exports.OpenShiftChatProvider = OpenShiftChatProvider;
//# sourceMappingURL=openShiftChatProvider.js.map