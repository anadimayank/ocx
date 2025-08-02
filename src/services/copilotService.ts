import * as vscode from 'vscode';
import { CopilotResponse, ChatMessage } from '../types';

/**
 * A service for interacting with GitHub Copilot's language models.
 * It selects the best available model (preferring GPT-4.1 or Claude 3.5 Sonnet)
 * and provides methods for streaming and non-streaming responses.
 */
export class CopilotService {
    // Prioritize GPT-4.1, but allow fallback to Claude 3.5 Sonnet.
    private static readonly PRIMARY_MODEL_SELECTOR = { vendor: 'copilot', family: 'gpt-4.1' };
    private static readonly FALLBACK_MODEL_SELECTOR = { vendor: 'copilot', family: 'claude-3.5-sonnet' };
    private static readonly SYSTEM_PROMPT = "You are an expert software development assistant specializing in a wide range of technologies. Provide clear, accurate, and concise information. When asked for documentation, summarize the key points and provide examples where possible.";

    /**
     * Selects the best available language model.
     * @returns A promise that resolves to the selected language model.
     * @throws An error if no suitable models are available.
     */
    private async getModel(): Promise<vscode.LanguageModelChat> {
        let models = await vscode.lm.selectChatModels(CopilotService.PRIMARY_MODEL_SELECTOR);
        if (models.length > 0) {
            console.log(`[CopilotService] Using primary model: ${models[0].name}`);
            return models[0];
        }

        models = await vscode.lm.selectChatModels(CopilotService.FALLBACK_MODEL_SELECTOR);
        if (models.length > 0) {
            console.log(`[CopilotService] Using fallback model: ${models[0].name}`);
            return models[0];
        }

        throw new Error('No suitable Copilot language models (GPT-4.1 or Claude 3.5 Sonnet) are available. Please ensure GitHub Copilot is active and updated.');
    }

    /**
     * Generates a streaming response from the language model.
     * @param prompt The user's prompt.
     * @param stream The VS Code chat response stream to write to.
     * @param token A cancellation token.
     */
    async generateStreamingResponse(
        prompt: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        try {
            const model = await this.getModel();
            const messages = [
                // The VS Code API version used here expects the system prompt to be passed with the 'User' role.
                new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, CopilotService.SYSTEM_PROMPT),
                new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, prompt)
            ];

            const response = await model.sendRequest(messages, {}, token);

            for await (const fragment of response.text) {
                if (token.isCancellationRequested) {
                    break;
                }
                stream.markdown(fragment);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error('[CopilotService] Error during streaming response:', errorMessage);
            stream.markdown(`❌ **Error interacting with the language model:** ${errorMessage}`);
        }
    }

    /**
     * Checks if a suitable language model is available.
     * @returns A promise that resolves to true if a model is available.
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.getModel();
            return true;
        } catch {
            return false;
        }
    }
}
