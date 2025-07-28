import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { PythonServiceResponse } from '../types';

export class PythonServiceManager implements vscode.Disposable {
    private pythonPath: string;
    private serviceScriptPath: string;
    private activeProcesses = new Set<cp.ChildProcess>();

    constructor(private context: vscode.ExtensionContext) {
        this.pythonPath = this.findPythonExecutable();
        this.serviceScriptPath = path.join(context.extensionPath, 'src', 'python', 'main.py');
    }

    async callStackOverflowService(query: string, limit: number = 5): Promise<PythonServiceResponse> {
        return this.callPythonService('stackoverflow', {
            action: 'search',
            query,
            limit
        });
    }

    async getStackOverflowAnswers(questionId: number): Promise<PythonServiceResponse> {
        return this.callPythonService('stackoverflow', {
            action: 'get_answers',
            question_id: questionId
        });
    }

    async searchStackOverflowWithTags(tags: string[], query?: string): Promise<PythonServiceResponse> {
        return this.callPythonService('stackoverflow', {
            action: 'search_with_tags',
            tags,
            query
        });
    }

    async callPythonService(service: string, params: any): Promise<PythonServiceResponse> {
        return new Promise((resolve, reject) => {
            const requestData = {
                service,
                params,
                timestamp: Date.now()
            };

            const pythonProcess = cp.spawn(this.pythonPath, [this.serviceScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: this.context.extensionPath
            });

            this.activeProcesses.add(pythonProcess);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pythonProcess.on('close', (code) => {
                this.activeProcesses.delete(pythonProcess);

                if (code === 0) {
                    try {
                        const response = JSON.parse(stdout);
                        resolve(response);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse Python service response: ${parseError}`));
                    }
                } else {
                    reject(new Error(`Python service failed with code ${code}: ${stderr}`));
                }
            });

            pythonProcess.on('error', (error) => {
                this.activeProcesses.delete(pythonProcess);
                reject(new Error(`Failed to start Python service: ${error.message}`));
            });

            // Send input data
            pythonProcess.stdin.write(JSON.stringify(requestData));
            pythonProcess.stdin.end();

            // Set timeout
            setTimeout(() => {
                if (this.activeProcesses.has(pythonProcess)) {
                    pythonProcess.kill('SIGTERM');
                    this.activeProcesses.delete(pythonProcess);
                    reject(new Error('Python service timeout'));
                }
            }, 30000); // 30 second timeout
        });
    }

    async testPythonEnvironment(): Promise<boolean> {
        try {
            const result = await this.callPythonService('test', {});
            return result.success;
        } catch (error) {
            console.error('Python environment test failed:', error);
            return false;
        }
    }

    async installRequirements(): Promise<boolean> {
        return new Promise((resolve) => {
            const requirementsPath = path.join(this.context.extensionPath, 'requirements.txt');

            const pipProcess = cp.spawn(this.pythonPath, ['-m', 'pip', 'install', '-r', requirementsPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: this.context.extensionPath
            });

            let stderr = '';

            pipProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            pipProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('Python requirements installed successfully');
                    resolve(true);
                } else {
                    console.error('Failed to install Python requirements:', stderr);
                    resolve(false);
                }
            });

            pipProcess.on('error', (error) => {
                console.error('Error installing Python requirements:', error);
                resolve(false);
            });
        });
    }

    async checkRequirements(): Promise<string[]> {
        const requiredPackages = ['requests', 'stackapi', 'websockets'];
        const missingPackages: string[] = [];

        for (const pkg of requiredPackages) {
            try {
                const result = await this.callPythonService('check_package', { package: pkg });
                if (!result.success) {
                    missingPackages.push(pkg);
                }
            } catch {
                missingPackages.push(pkg);
            }
        }

        return missingPackages;
    }

    private findPythonExecutable(): string {
        // Try common Python executable names
        const pythonCommands = ['python3', 'python', 'py'];

        for (const cmd of pythonCommands) {
            try {
                cp.execSync(`${cmd} --version`, { stdio: 'ignore' });
                return cmd;
            } catch {
                // Continue to next command
            }
        }

        // Default to python3 and let it fail with a clear error
        return 'python3';
    }

    async getPythonVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(`${this.pythonPath} --version`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const version = stdout.trim() || stderr.trim();
                resolve(version);
            });
        });
    }

    async setupPythonEnvironment(): Promise<{success: boolean; message: string}> {
        try {
            // Check Python version
            const version = await this.getPythonVersion();
            console.log(`Python version: ${version}`);

            // Check if required packages are installed
            const missingPackages = await this.checkRequirements();

            if (missingPackages.length > 0) {
                console.log(`Missing packages: ${missingPackages.join(', ')}`);

                // Ask user if they want to install
                const choice = await vscode.window.showInformationMessage(
                    `OpenShift AI Assistant needs to install Python packages: ${missingPackages.join(', ')}`,
                    'Install Now',
                    'Skip'
                );

                if (choice === 'Install Now') {
                    const installed = await this.installRequirements();
                    if (!installed) {
                        return {
                            success: false,
                            message: 'Failed to install required Python packages'
                        };
                    }
                }
            }

            // Test the environment
            const envTest = await this.testPythonEnvironment();
            if (!envTest) {
                return {
                    success: false,
                    message: 'Python environment test failed'
                };
            }

            return {
                success: true,
                message: 'Python environment ready'
            };

        } catch (error) {
            return {
                success: false,
                message: `Python setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    killAllProcesses(): void {
        for (const process of this.activeProcesses) {
            try {
                process.kill('SIGTERM');
            } catch (error) {
                console.error('Error killing Python process:', error);
            }
        }
        this.activeProcesses.clear();
    }

    dispose(): void {
        this.killAllProcesses();
    }
}
