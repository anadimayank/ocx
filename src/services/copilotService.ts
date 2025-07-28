import * as vscode from 'vscode';
import { CopilotResponse, ChatMessage } from '../types';

export class CopilotService {
    private static readonly MODEL_SELECTOR = {
        vendor: 'copilot',
        family: 'gpt-4.1'
    };

    private static readonly FALLBACK_MODEL_SELECTOR = {
        vendor: 'copilot',
        family: 'claude sonnet 3.5'
    };

    async generateResponse(
        prompt: string,
        token: vscode.CancellationToken,
        systemPrompt?: string
    ): Promise<CopilotResponse> {
        try {
            // Select the best available model
            const models = await vscode.lm.selectChatModels(CopilotService.MODEL_SELECTOR);
            let model = models[0];

            // Fallback to GPT-4o mini if GPT-4o is not available
            if (!model) {
                const fallbackModels = await vscode.lm.selectChatModels(CopilotService.FALLBACK_MODEL_SELECTOR);
                model = fallbackModels[0];
            }

            if (!model) {
                throw new Error('No Copilot language models available. Please ensure GitHub Copilot is installed and authenticated.');
            }

            // Prepare messages
            const messages: vscode.LanguageModelChatMessage[] = [];

            if (systemPrompt) {
                messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, systemPrompt));
            }

            messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, prompt));

            // Make the request
            const response = await model.sendRequest(messages, {}, token);

            // Collect the response
            let content = '';
            for await (const fragment of response.text) {
                if (token.isCancellationRequested) {
                    throw new Error('Request was cancelled');
                }
                content += fragment;
            }

            return {
                content: content.trim(),
                model: model.name,
                usage: {
                    promptTokens: this.estimateTokens(prompt + (systemPrompt || '')),
                    completionTokens: this.estimateTokens(content)
                }
            };

        } catch (error) {
            console.error('Error generating Copilot response:', error);
            throw new Error(`Copilot API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async generateStreamingResponse(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken,
        systemPrompt?: string
    ): Promise<void> {
        try {
            const models = await vscode.lm.selectChatModels(CopilotService.MODEL_SELECTOR);
            let model = models[0];

            if (!model) {
                const fallbackModels = await vscode.lm.selectChatModels(CopilotService.FALLBACK_MODEL_SELECTOR);
                model = fallbackModels[0];
            }

            if (!model) {
                throw new Error('No Copilot language models available');
            }

            const messages: vscode.LanguageModelChatMessage[] = [];

            if (systemPrompt) {
                messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, systemPrompt));
            }
            
            messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, prompt));

            const response = await model.sendRequest(messages, {}, token);

            for await (const fragment of response.text) {
                if (token.isCancellationRequested) {
                    break;
                }
                stream.markdown(fragment);
            }

        } catch (error) {
            console.error('Error in streaming response:', error);
            stream.markdown(`❌ **Error**: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        }
    }

    async generateWithContext(
        prompt: string,
        context: ChatMessage[],
        token: vscode.CancellationToken
    ): Promise<CopilotResponse> {
        try {
            const models = await vscode.lm.selectChatModels(CopilotService.MODEL_SELECTOR);
            const model = models[0];

            if (!model) {
                throw new Error('No Copilot language models available');
            }

            const messages: vscode.LanguageModelChatMessage[] = [];

            // Add conversation context
            for (const msg of context) {
                if (msg.role === 'system') {
                    messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, msg.content));
                } else if (msg.role === 'user') {
                    messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, msg.content));
                } else if (msg.role === 'assistant') {
                    messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.Assistant, msg.content));
                }
            }

            // Add current prompt
            messages.push(new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, prompt));

            const response = await model.sendRequest(messages, {}, token);

            let content = '';
            for await (const fragment of response.text) {
                if (token.isCancellationRequested) {
                    throw new Error('Request was cancelled');
                }
                content += fragment;
            }

            return {
                content: content.trim(),
                model: model.name,
                usage: {
                    promptTokens: this.estimateTokens(messages.map(m => m.content).join(' ')),
                    completionTokens: this.estimateTokens(content)
                }
            };

        } catch (error) {
            console.error('Error generating contextual response:', error);
            throw new Error(`Copilot API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            const models = await vscode.lm.selectChatModels(CopilotService.MODEL_SELECTOR);
            return models.length > 0;
        } catch {
            return false;
        }
    }

    async getAvailableModels(): Promise<vscode.LanguageModelChat[]> {
        try {
            const primaryModels = await vscode.lm.selectChatModels(CopilotService.MODEL_SELECTOR);
            const fallbackModels = await vscode.lm.selectChatModels(CopilotService.FALLBACK_MODEL_SELECTOR);

            return [...primaryModels, ...fallbackModels];
        } catch {
            return [];
        }
    }

    private estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }

    private formatOpenShiftPrompt(prompt: string): string {
        return `You are an expert OpenShift and Kubernetes consultant with deep knowledge of:
- Red Hat OpenShift Container Platform
- Kubernetes orchestration
- Container technologies
- DevOps best practices
- Security and compliance
- Troubleshooting and debugging

Please provide accurate, practical, and actionable guidance.

Question: ${prompt}`;
    }
}