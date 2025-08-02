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
 * The main chat provider for the ocX assistant, specialized for Red Hat OpenShift.
 * It provides expert-level answers and tools for documentation and community searches.
 */
class OpenShiftChatProvider {
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('ocX Assistant');
        this.copilotService = new copilotService_1.CopilotService();
        this.mcpService = new mcpService_1.MCPService(context);
        this.stackOverflowService = new stackOverflowService_1.StackOverflowService();
        this.log('ocX OpenShift Specialist Chat Provider initialized.');
    }
    /**
     * Handles incoming chat requests from the user.
     */
    async handleRequest(request, context, stream, token) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            this.logError('Failed to handle request', error);
            stream.markdown(`❌ **Error:** ${message}`);
            return { errorDetails: { message } };
        }
    }
    /**
     * Handles specific slash commands for tools.
     */
    async handleSlashCommand(command, prompt, stream, token) {
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
    handleGreeting(stream) {
        stream.markdown(`Hello! I'm **ocX**, your specialized AI assistant for Red Hat OpenShift.\n\nHere's how I can help:\n\n* **Ask me anything** about OpenShift administration or development.\n* **/docs [query]**: Fetch the latest official OpenShift documentation.\n  *Example: \`/docs create a route\`*\n* **/search [query]**: Search Stack Overflow for community solutions to errors or problems.\n  *Example: \`/search ImagePullBackOff\`*\n* **/explain**: Select an OpenShift YAML or code snippet in your editor and I'll explain it.\n\nHow can I help you today?`);
        return {};
    }
    /**
     * Fetches and displays documentation from the Context7 MCP service.
     */
    async handleDocumentation(prompt, stream) {
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
        }
        catch (error) {
            this.logError('Documentation fetch failed', error);
            stream.markdown(`⚠️ **Sorry, I couldn't fetch live documentation at this time.**`);
        }
        return {};
    }
    /**
     * Searches Stack Overflow using the dedicated MCP server.
     */
    async handleStackOverflowSearch(prompt, stream) {
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
        }
        catch (error) {
            this.logError('Stack Overflow search failed', error);
            stream.markdown(`⚠️ **Sorry, I was unable to search Stack Overflow at this time.**`);
        }
        return {};
    }
    /**
     * Explains a selected code snippet using the AI model.
     */
    async handleExplain(stream, token) {
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
        // The StackOverflowService does not have a dispose method as it doesn't hold persistent resources.
        // this.stackOverflowService.dispose(); 
    }
}
exports.OpenShiftChatProvider = OpenShiftChatProvider;
//# sourceMappingURL=openShiftChatProvider.js.map