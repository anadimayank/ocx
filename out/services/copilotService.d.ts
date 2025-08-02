import * as vscode from 'vscode';
/**
 * A service for interacting with GitHub Copilot's language models.
 * It selects the best available model (preferring GPT-4.1 or Claude 3.5 Sonnet)
 * and provides methods for streaming and non-streaming responses.
 */
export declare class CopilotService {
    private static readonly PRIMARY_MODEL_SELECTOR;
    private static readonly FALLBACK_MODEL_SELECTOR;
    private static readonly SYSTEM_PROMPT;
    /**
     * Selects the best available language model.
     * @returns A promise that resolves to the selected language model.
     * @throws An error if no suitable models are available.
     */
    private getModel;
    /**
     * Generates a streaming response from the language model.
     * @param prompt The user's prompt.
     * @param stream The VS Code chat response stream to write to.
     * @param token A cancellation token.
     */
    generateStreamingResponse(prompt: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void>;
    /**
     * Checks if a suitable language model is available.
     * @returns A promise that resolves to true if a model is available.
     */
    isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=copilotService.d.ts.map