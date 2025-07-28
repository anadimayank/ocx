import * as vscode from 'vscode';
import { CopilotService } from '../services/copilotService';
import { MCPService } from '../services/mcpService';
import { StackOverflowService } from '../services/stackOverflowService';
import { PythonServiceManager } from '../services/pythonServiceManager';
import { OpenShiftQuestion, WorkspaceContext, DocumentationResult } from '../types';

export class OpenShiftChatProvider implements vscode.Disposable {
    private copilotService: CopilotService;
    private mcpService: MCPService;
    private stackOverflowService: StackOverflowService;
    private pythonServiceManager: PythonServiceManager;
    private outputChannel: vscode.OutputChannel;

    constructor(private context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('OpenShift AI Assistant');

        // Initialize services
        this.copilotService = new CopilotService();
        this.mcpService = new MCPService(context);
        this.stackOverflowService = new StackOverflowService();
        this.pythonServiceManager = new PythonServiceManager(context);

        this.log('OpenShift Chat Provider initialized');
    }

    // ... handleRequest, handleSlashCommand, and other methods ...

private async handleDocumentation(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    stream.progress('📚 Fetching documentation from local MCP server...');
    this.log(`Documentation request for: ${prompt}`);

    try {
        const docResults = await this.mcpService.getDocumentation(prompt);

        if (docResults.length === 0) {
            stream.markdown('No specific documentation found from the local server. Asking the AI...\n\n');
            throw new Error('No results from MCP');
        }

        stream.markdown('## 📖 OpenShift Documentation\n\n');
        for (const doc of docResults) {
            stream.markdown(`### ${doc.title}\n\n`);
            stream.markdown(`${doc.content.substring(0, 1000)}...\n\n`); // Increased snippet size
            if (doc.url) {
                stream.markdown(`[View full documentation](${doc.url})\n\n`);
            }
        }
    } catch (error) {
        this.logError('Error fetching documentation, falling back to AI', error);
        stream.markdown('⚠️ Unable to fetch live documentation. Using AI knowledge...\n\n');
        
        const fallbackPrompt = `Provide comprehensive documentation about: ${prompt}\n\nInclude API references, examples, and best practices for OpenShift.`;
        // Using the streaming response for the fallback
        await this.copilotService.generateStreamingResponse(fallbackPrompt, stream, token);
    }

    return {};
}

    private async provideComprehensiveAssistance(
        question: OpenShiftQuestion,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress('🤖 Analyzing your question...');
        const enhancedPrompt = this.buildEnhancedPrompt(question);
        await this.copilotService.generateStreamingResponse(enhancedPrompt, stream, token);

        // Since the MCP connection is via stdio, let's not fetch docs here
        // to keep the primary response fast and clean. Users can use /docs.

        return {};
    }

    // ... (rest of the file remains the same)
    // Make sure to include handleRequest, handleSlashCommand, handleTroubleshooting, etc.
    async handleRequest(
        request: vscode.ChatRequest,
        context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        try {
            this.log(`Handling request: ${request.prompt}`);
            const workspaceContext = await this.getWorkspaceContext();
            const question: OpenShiftQuestion = {
                question: request.prompt,
                selectedText: this.getSelectedText(),
                workspaceContext
            };
            if (request.command) {
                return await this.handleSlashCommand(request.command, request.prompt, stream, token);
            }
            return await this.provideComprehensiveAssistance(question, stream, token);
        } catch (error) {
            this.logError('Error handling request', error);
            stream.markdown(`❌ **Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            return { errorDetails: { message: error instanceof Error ? error.message : 'Unknown error' } };
        }
    }

    private async handleSlashCommand(
        command: string,
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress(`Processing /${command} command...`);
        switch (command) {
            case 'troubleshoot':
                return await this.handleTroubleshooting(prompt, stream, token);
            case 'docs':
                return await this.handleDocumentation(prompt, stream, token);
            case 'search':
                return await this.handleStackOverflowSearch(prompt, stream, token);
            case 'explain':
                return await this.handleCodeExplanation(prompt, stream, token);
            case 'best-practices':
                return await this.handleBestPractices(prompt, stream, token);
            default:
                stream.markdown(`❌ Unknown command: /${command}`);
                return {};
        }
    }

    private async handleTroubleshooting(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress('🔍 Analyzing issue...');
        const troubleshootingPrompt = `You are an OpenShift expert. Help troubleshoot this issue: ${prompt}\n\nProvide:\n1. Possible root causes\n2. Step-by-step debugging commands\n3. Common solutions\n4. Prevention strategies\n\nFormat your response with clear sections and actionable steps.`;
        await this.copilotService.generateStreamingResponse(troubleshootingPrompt, stream, token);
        
        stream.progress('🌐 Searching community solutions...');
        const stackResults = await this.stackOverflowService.searchQuestions(prompt + ' OpenShift', 3);
        if (stackResults.length > 0) {
            stream.markdown('\n\n---\n\n## 💡 Community Solutions\n\n');
            for (const result of stackResults) {
                stream.markdown(`**[${result.title}](${result.link})** (Score: ${result.score})\n`);
                if (result.answers && result.answers.length > 0) {
                    const topAnswer = result.answers[0];
                    const preview = topAnswer.body.substring(0, 200) + '...';
                    stream.markdown(`${preview}\n\n`);
                }
            }
        }
        return {};
    }
    
    private async handleStackOverflowSearch(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress('🔍 Searching Stack Overflow...');
        const results = await this.stackOverflowService.searchQuestions(prompt + ' OpenShift Kubernetes', 5);
        stream.markdown('## 🌐 Stack Overflow Results\n\n');
        if (results.length === 0) {
            stream.markdown('No relevant Stack Overflow questions found for this query.');
            return {};
        }
        for (const result of results) {
            stream.markdown(`### [${result.title}](${result.link})\n`);
            stream.markdown(`**Score:** ${result.score} | **Answers:** ${result.answer_count} | **Tags:** ${result.tags.join(', ')}\n\n`);
            if (result.answers && result.answers.length > 0) {
                const topAnswer = result.answers.find(a => a.is_accepted) || result.answers[0];
                stream.markdown('**Top Answer:**\n');
                const cleanAnswer = topAnswer.body.replace(/<[^>]*>/g, '').substring(0, 500) + '...';
                stream.markdown(cleanAnswer + '\n\n');
            }
        }
        return {};
    }

    private async handleCodeExplanation(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        const selectedText = this.getSelectedText();
        const codeToExplain = selectedText || prompt;
        if (!codeToExplain.trim()) {
            stream.markdown('❌ No code selected or provided. Please select YAML/code or provide it in your message.');
            return {};
        }
        stream.progress('🔍 Analyzing code...');
        const explanationPrompt = `Explain this OpenShift/Kubernetes YAML or code in detail:\n\n\`\`\`\n${codeToExplain}\n\`\`\`\n\nProvide:\n1. What this configuration does\n2. Key components and their purposes\n3. Best practices and potential improvements\n4. Common issues and how to avoid them\n\nFormat with clear sections and examples.`;
        await this.copilotService.generateStreamingResponse(explanationPrompt, stream, token);
        return {};
    }

    private async handleBestPractices(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> {
        stream.progress('📚 Gathering best practices...');
        const bestPracticesPrompt = `Provide OpenShift best practices for: ${prompt}\n\nInclude:\n1. Security considerations\n2. Performance optimization\n3. Operational practices\n4. Common pitfalls to avoid\n5. Example configurations\n\nFocus on practical, actionable advice.`;
        await this.copilotService.generateStreamingResponse(bestPracticesPrompt, stream, token);
        return {};
    }

    async provideFollowups(
        result: vscode.ChatResult,
        context: vscode.ChatContext,
        token: vscode.CancellationToken
    ): Promise<vscode.ChatFollowup[]> {
        const lastMessage = context.history[context.history.length - 1];
        if (!lastMessage) return [];
        let prompt = '';
        if ('prompt' in lastMessage && typeof lastMessage.prompt === 'string') {
            prompt = lastMessage.prompt;
        } else {
            return [];
        }
        const followups: vscode.ChatFollowup[] = [];
        if (prompt.includes('route') || prompt.includes('service')) {
            followups.push(
                { prompt: '@ocX /docs Ingress vs Route differences', label: '📚 Ingress vs Route' },
                { prompt: '@ocX /troubleshoot route not accessible', label: '🔧 Route troubleshooting' }
            );
        }
        if (prompt.includes('pod') || prompt.includes('deployment')) {
            followups.push(
                { prompt: '@ocX /best-practices pod security', label: '🔒 Pod security' },
                { prompt: '@ocX /troubleshoot pod startup issues', label: '🐛 Pod issues' }
            );
        }
        followups.push(
            { prompt: '@ocX /search', label: '🔍 Search community' },
            { prompt: '@ocX /best-practices', label: '⭐ Best practices' }
        );
        return followups.slice(0, 4);
    }
    
    private buildEnhancedPrompt(question: OpenShiftQuestion): string {
        let prompt = `You are an expert OpenShift and Kubernetes consultant. Answer this question: ${question.question}\n\nProvide comprehensive, accurate, and practical guidance.`;
        if (question.selectedText) {
            prompt += `\n\nSelected code/YAML:\n\`\`\`\n${question.selectedText}\n\`\`\``;
        }
        if (question.workspaceContext?.activeFileName?.endsWith('.yaml') || 
            question.workspaceContext?.activeFileName?.endsWith('.yml')) {
            prompt += '\n\nNote: User is working with YAML files, provide YAML examples where relevant.';
        }
        return prompt;
    }

    private shouldFetchDocs(question: string): boolean {
        const docKeywords = ['api', 'spec', 'configuration', 'reference', 'how to', 'documentation'];
        return docKeywords.some(keyword => question.toLowerCase().includes(keyword));
    }

    private async getWorkspaceContext(): Promise<WorkspaceContext> {
        const activeEditor = vscode.window.activeTextEditor;
        const visibleEditors = vscode.window.visibleTextEditors;
        return {
            activeFileName: activeEditor?.document.fileName,
            selectedText: activeEditor?.selection ? activeEditor.document.getText(activeEditor.selection) : undefined,
            visibleFiles: visibleEditors.map(editor => editor.document.fileName),
            openTabs: vscode.workspace.textDocuments.map(doc => doc.fileName)
        };
    }
    private getSelectedText(): string | undefined {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && !activeEditor.selection.isEmpty) {
            return activeEditor.document.getText(activeEditor.selection);
        }
        return undefined;
    }

    private log(message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    private logError(message: string, error: any): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ERROR: ${message}`);
        this.outputChannel.appendLine(`[${timestamp}] ${error.stack || error.message || error}`);
    }

    dispose(): void {
        this.outputChannel.dispose();
        this.mcpService.dispose();
        this.pythonServiceManager.dispose();
    }
}