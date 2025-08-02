export interface OpenShiftQuestion {
    question: string;
    context?: string;
    selectedText?: string;
    workspaceContext?: WorkspaceContext;
}
export interface WorkspaceContext {
    activeFileName?: string;
    selectedText?: string;
    visibleFiles?: string[];
    openTabs?: string[];
}
export interface CopilotResponse {
    content: string;
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}
export interface MCPRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id?: string;
}
export interface MCPResponse {
    result?: any;
    error?: {
        code: number;
        message: string;
    };
    id?: string;
}
export interface StackOverflowQuestion {
    question_id: number;
    title: string;
    score: number;
    answer_count: number;
    tags: string[];
    creation_date: number;
    last_activity_date: number;
    is_answered: boolean;
    accepted_answer_id?: number;
    link: string;
    body?: string;
    answers?: StackOverflowAnswer[];
}
export interface StackOverflowAnswer {
    answer_id: number;
    score: number;
    is_accepted: boolean;
    creation_date: number;
    body: string;
}
export interface DocumentationResult {
    title: string;
    content: string;
    source: string;
    version?: string;
    url?: string;
}
export interface PythonServiceResponse {
    success: boolean;
    data?: any;
    error?: string;
}
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}
export interface SlashCommand {
    name: string;
    description: string;
    handler: (args: string[], context: any) => Promise<void>;
}
export declare enum MessageType {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    SUCCESS = "success"
}
export interface ProgressIndicator {
    increment: (value?: number) => void;
    report: (value: {
        message?: string;
        increment?: number;
    }) => void;
}
//# sourceMappingURL=index.d.ts.map