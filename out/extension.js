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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const openShiftChatProvider_1 = require("./providers/openShiftChatProvider");
let chatProvider;
function activate(context) {
    console.log('ocX AI Assistant extension is now active!');
    // Initialize the chat provider
    chatProvider = new openShiftChatProvider_1.OpenShiftChatProvider(context);
    // Register the chat participant
    const participant = vscode.chat.createChatParticipant('ocx-ai-assistant.ocX', chatProvider.handleRequest.bind(chatProvider));
    // Configure participant properties
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.png');
    // The followupProvider is no longer necessary with the current implementation.
    // participant.followupProvider = {
    //     provideFollowups: chatProvider.provideFollowups.bind(chatProvider)
    // };
    // Add disposables to context
    context.subscriptions.push(participant);
    vscode.window.showInformationMessage('ocX AI Assistant is ready! Use @ocX in the chat panel.');
}
exports.activate = activate;
function deactivate() {
    if (chatProvider) {
        chatProvider.dispose();
    }
    console.log('ocX AI Assistant extension deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map