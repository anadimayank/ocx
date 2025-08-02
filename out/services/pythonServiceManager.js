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
exports.PythonServiceManager = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const path = __importStar(require("path"));
class PythonServiceManager {
    constructor(context) {
        this.context = context;
        this.activeProcesses = new Set();
        this.pythonPath = this.findPythonExecutable();
        this.serviceScriptPath = path.join(context.extensionPath, 'src', 'python', 'main.py');
    }
    async callStackOverflowService(query, limit = 5) {
        return this.callPythonService('stackoverflow', {
            action: 'search',
            query,
            limit
        });
    }
    async getStackOverflowAnswers(questionId) {
        return this.callPythonService('stackoverflow', {
            action: 'get_answers',
            question_id: questionId
        });
    }
    async searchStackOverflowWithTags(tags, query) {
        return this.callPythonService('stackoverflow', {
            action: 'search_with_tags',
            tags,
            query
        });
    }
    async callPythonService(service, params) {
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
                    }
                    catch (parseError) {
                        reject(new Error(`Failed to parse Python service response: ${parseError}`));
                    }
                }
                else {
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
    async testPythonEnvironment() {
        try {
            const result = await this.callPythonService('test', {});
            return result.success;
        }
        catch (error) {
            console.error('Python environment test failed:', error);
            return false;
        }
    }
    async installRequirements() {
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
                }
                else {
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
    async checkRequirements() {
        const requiredPackages = ['requests', 'stackapi', 'websockets'];
        const missingPackages = [];
        for (const pkg of requiredPackages) {
            try {
                const result = await this.callPythonService('check_package', { package: pkg });
                if (!result.success) {
                    missingPackages.push(pkg);
                }
            }
            catch {
                missingPackages.push(pkg);
            }
        }
        return missingPackages;
    }
    findPythonExecutable() {
        // Try common Python executable names
        const pythonCommands = ['python3', 'python', 'py'];
        for (const cmd of pythonCommands) {
            try {
                cp.execSync(`${cmd} --version`, { stdio: 'ignore' });
                return cmd;
            }
            catch {
                // Continue to next command
            }
        }
        // Default to python3 and let it fail with a clear error
        return 'python3';
    }
    async getPythonVersion() {
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
    async setupPythonEnvironment() {
        try {
            // Check Python version
            const version = await this.getPythonVersion();
            console.log(`Python version: ${version}`);
            // Check if required packages are installed
            const missingPackages = await this.checkRequirements();
            if (missingPackages.length > 0) {
                console.log(`Missing packages: ${missingPackages.join(', ')}`);
                // Ask user if they want to install
                const choice = await vscode.window.showInformationMessage(`OpenShift AI Assistant needs to install Python packages: ${missingPackages.join(', ')}`, 'Install Now', 'Skip');
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
        }
        catch (error) {
            return {
                success: false,
                message: `Python setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    killAllProcesses() {
        for (const process of this.activeProcesses) {
            try {
                process.kill('SIGTERM');
            }
            catch (error) {
                console.error('Error killing Python process:', error);
            }
        }
        this.activeProcesses.clear();
    }
    dispose() {
        this.killAllProcesses();
    }
}
exports.PythonServiceManager = PythonServiceManager;
//# sourceMappingURL=pythonServiceManager.js.map