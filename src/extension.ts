import * as vscode from 'vscode';
import { OpenShiftChatProvider } from './providers/openShiftChatProvider';

let chatProvider: OpenShiftChatProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenShift AI Assistant extension is now active!');

    // Initialize the chat provider
    chatProvider = new OpenShiftChatProvider(context);

    // Register the chat participant
    const participant = vscode.chat.createChatParticipant('openshift-ai-assistant.ocX', chatProvider.handleRequest.bind(chatProvider));

    // Configure participant properties
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'openshift-icon.png');
    participant.followupProvider = {
        provideFollowups: chatProvider.provideFollowups.bind(chatProvider)
    };

    // Slash commands are not supported via commandProvider on ChatParticipant. Remove this assignment.

    // Register traditional commands for backward compatibility
    const askQuestionCommand = vscode.commands.registerCommand(
        'openshift-ai-assistant.askQuestion',
        async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Ask a question about OpenShift',
                placeHolder: 'e.g., How do I create a route?'
            });

            if (input) {
                // Open chat and send the question
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: `@ocX ${input}`
                });
            }
        }
    );

    // Register status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(robot) ocX';
    statusBarItem.tooltip = 'OpenShift AI Assistant - Click to ask a question';
    statusBarItem.command = 'openshift-ai-assistant.askQuestion';
    statusBarItem.show();

    // Add disposables to context
    context.subscriptions.push(
        participant,
        askQuestionCommand,
        statusBarItem
    );

    // Show activation message
    vscode.window.showInformationMessage(
        'OpenShift AI Assistant is ready! Use @ocX in Copilot Chat or press Ctrl+Shift+O'
    );
}

export function deactivate() {
    if (chatProvider) {
        chatProvider.dispose();
    }
    console.log('OpenShift AI Assistant extension deactivated');
}
