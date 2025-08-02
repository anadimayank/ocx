import * as vscode from 'vscode';
import { OpenShiftChatProvider } from './providers/openShiftChatProvider';

let chatProvider: OpenShiftChatProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('ocX AI Assistant extension is now active!');

    // Initialize the chat provider
    chatProvider = new OpenShiftChatProvider(context);

    // Register the chat participant
    const participant = vscode.chat.createChatParticipant('ocx-ai-assistant.ocX', chatProvider.handleRequest.bind(chatProvider));

    // Configure participant properties
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.png');
    
    // The followupProvider is no longer necessary with the current implementation.
    // participant.followupProvider = {
    //     provideFollowups: chatProvider.provideFollowups.bind(chatProvider)
    // };

    // Add disposables to context
    context.subscriptions.push(
        participant
    );

    vscode.window.showInformationMessage(
        'ocX AI Assistant is ready! Use @ocX in the chat panel.'
    );
}

export function deactivate() {
    if (chatProvider) {
        chatProvider.dispose();
    }
    console.log('ocX AI Assistant extension deactivated');
}
