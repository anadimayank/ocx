import * as vscode from 'vscode';
import { PythonServiceResponse } from '../types';
export declare class PythonServiceManager implements vscode.Disposable {
    private context;
    private pythonPath;
    private serviceScriptPath;
    private activeProcesses;
    constructor(context: vscode.ExtensionContext);
    callStackOverflowService(query: string, limit?: number): Promise<PythonServiceResponse>;
    getStackOverflowAnswers(questionId: number): Promise<PythonServiceResponse>;
    searchStackOverflowWithTags(tags: string[], query?: string): Promise<PythonServiceResponse>;
    callPythonService(service: string, params: any): Promise<PythonServiceResponse>;
    testPythonEnvironment(): Promise<boolean>;
    installRequirements(): Promise<boolean>;
    checkRequirements(): Promise<string[]>;
    private findPythonExecutable;
    getPythonVersion(): Promise<string>;
    setupPythonEnvironment(): Promise<{
        success: boolean;
        message: string;
    }>;
    killAllProcesses(): void;
    dispose(): void;
}
//# sourceMappingURL=pythonServiceManager.d.ts.map