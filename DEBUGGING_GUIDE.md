# OpenShift AI Assistant - Debugging & Testing Guide

## 🔧 Step-by-Step Setup Process

### Phase 1: Environment Preparation

#### Step 1: Verify Prerequisites
```bash
# Check Node.js version (must be 18+)
node --version
npm --version

# Check Python version (must be 3.8+)
python3 --version
pip --version

# Check VS Code version (must be 1.80+)
code --version
```

#### Step 2: Check GitHub Copilot
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "GitHub Copilot"
4. Ensure it's installed AND enabled
5. Check subscription status in Command Palette: `GitHub Copilot: Check Status`

### Phase 2: Project Setup

#### Step 3: Extract and Setup Project
```bash
# Extract the zip file
unzip openshift-ai-assistant-complete.zip
cd openshift-ai-assistant

# Verify all files are present
ls -la
# Should see: package.json, tsconfig.json, requirements.txt, src/, README.md
```

#### Step 4: Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Check for any installation errors
echo $?  # Should output 0 if successful

# Install Python dependencies
pip install -r requirements.txt

# Verify Python packages
python3 -c "import requests, stackapi, websockets; print('All packages installed successfully')"
```

#### Step 5: Compile TypeScript
```bash
# Compile the extension
npm run compile

# Check if compilation was successful
ls -la out/
# Should see compiled .js files
```

### Phase 3: Extension Testing

#### Step 6: Launch Extension Development Host
1. Open VS Code in the project directory: `code .`
2. Press **F5** (or Run → Start Debugging)
3. A new "Extension Development Host" window should open
4. Look for "OpenShift AI Assistant is ready!" notification

**Troubleshooting:**
- If F5 doesn't work, check `.vscode/launch.json` exists
- If compilation errors, run `npm run compile` again
- Check Terminal tab for any error messages

#### Step 7: Basic Functionality Test
In the Extension Development Host window:

1. **Open Copilot Chat**
   - Press `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Alt+I` (macOS)
   - Or use Command Palette: `Chat: Focus on Chat View`

2. **Test Basic Response**
   ```
   Type: @ocX hello
   Expected: Welcome message explaining capabilities
   ```

3. **Test Slash Command**
   ```
   Type: @ocX /docs route
   Expected: Documentation about OpenShift routes
   ```

### Phase 4: Comprehensive Testing

#### Test 1: Copilot Integration
```
Input: @ocX How do I create a deployment in OpenShift?
Expected Output:
- Detailed explanation of deployments
- YAML example
- Best practices
- Streaming response (text appears gradually)

Debug if failed:
- Check GitHub Copilot is active
- Look at Debug Console (F12) for errors
- Check Output panel: "OpenShift AI Assistant"
```

#### Test 2: Documentation Service (MCP)
```
Input: @ocX /docs SecurityContext
Expected Output:
- OpenShift SecurityContext documentation
- API references
- Examples and explanations

Debug if failed:
- Check internet connection
- Look for WebSocket connection errors in Debug Console
- Corporate firewall may block wss:// connections
```

#### Test 3: Stack Overflow Integration
```
Input: @ocX /search pod crashloopbackoff
Expected Output:
- List of relevant Stack Overflow questions
- Question scores and answer counts
- Preview of top answers

Debug if failed:
- Check Python service is working (see Python Debug section)
- Verify Stack Overflow API is accessible
- Check rate limiting issues
```

#### Test 4: Code Explanation
```
Steps:
1. Create a new file: test.yaml
2. Add OpenShift YAML content:
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: test-pod
   spec:
     containers:
     - name: app
       image: nginx
   ```
3. Select the YAML content
4. Type: @ocX /explain
Expected: Detailed explanation of the pod configuration

Debug if failed:
- Check if text selection is working
- Verify extension can read active editor content
```

#### Test 5: Follow-up Suggestions
```
Input: @ocX route configuration
Expected: 
- Response about routes
- Follow-up buttons like "📚 Ingress vs Route", "🔧 Route troubleshooting"

Debug if failed:
- Check follow-up provider implementation
- Look for JavaScript errors in Debug Console
```

## 🐛 Debugging Procedures

### Debug Level 1: Extension Loading Issues

#### Problem: Extension doesn't activate
```bash
# Check package.json syntax
npm run compile 2>&1 | grep -i error

# Verify extension manifest
code package.json
# Check: name, main, activationEvents, contributes sections
```

#### Problem: TypeScript compilation errors
```bash
# Clean and rebuild
rm -rf out/
npm run compile

# Check for missing dependencies
npm install --save-dev @types/node @types/vscode
```

### Debug Level 2: Chat Participant Issues

#### Problem: @ocX not recognized
1. Check Extension Development Host console (F12)
2. Look for registration errors:
   ```javascript
   // Should see in console:
   // "OpenShift AI Assistant extension is now active!"
   ```
3. Verify chat participant registration in `extension.ts`

#### Problem: Slash commands not working
```javascript
// In Debug Console, check:
console.log(vscode.chat.participants);
// Should show 'openshift-ai-assistant.ocX'
```

### Debug Level 3: Service Integration Issues

#### Copilot Service Debug
```javascript
// Add to copilotService.ts for debugging:
console.log('Available models:', await vscode.lm.selectChatModels({vendor: 'copilot'}));

// Common issues:
// - No models returned: GitHub Copilot not installed/active
// - Auth errors: Re-authenticate with GitHub
```

#### MCP Service Debug
```javascript
// Check WebSocket connection:
// In mcpService.ts, add logging:
this.ws.on('open', () => {
    console.log('MCP WebSocket connected successfully');
});

this.ws.on('error', (error) => {
    console.error('MCP WebSocket error:', error);
});

// Common issues:
// - Connection refused: Corporate firewall
// - Timeout: Network issues
// - 403 Forbidden: Service unavailable
```

#### Python Service Debug
```bash
# Test Python environment separately:
cd openshift-ai-assistant
echo '{"service": "test", "params": {}}' | python3 src/python/main.py

# Should output:
# {
#   "success": true,
#   "message": "Python service is working"
# }

# Test Stack Overflow service:
echo '{"service": "stackoverflow", "params": {"action": "search", "query": "test", "limit": 1}}' | python3 src/python/main.py
```

### Debug Level 4: Advanced Debugging

#### Enable Verbose Logging
Add to `extension.ts`:
```typescript
const outputChannel = vscode.window.createOutputChannel('OpenShift AI Debug');

// Log all requests
context.subscriptions.push(
    vscode.commands.registerCommand('extension.debug', () => {
        outputChannel.show();
        outputChannel.appendLine('Debug mode enabled');
    })
);
```

#### Monitor Network Requests
1. Open Extension Development Host
2. Press F12 → Network tab
3. Filter by:
   - `api.stackexchange.com` (Stack Overflow)
   - `mcp.context7.com` (Documentation)
   - `github.com` (Copilot, if visible)

#### Check Memory Usage
```javascript
// Add to any service:
const memUsage = process.memoryUsage();
console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
});
```

## 🧪 Automated Testing Setup

### Unit Testing
```bash
# Install testing dependencies
npm install --save-dev mocha @types/mocha

# Create test files in src/test/
# Run tests
npm test
```

### Integration Testing
Create `test-scenarios.js`:
```javascript
const testScenarios = [
    {
        name: 'Basic Chat Response',
        input: '@ocX hello',
        expectedContains: ['OpenShift', 'assistant', 'help']
    },
    {
        name: 'Documentation Lookup',
        input: '@ocX /docs pod',
        expectedContains: ['Pod', 'container', 'spec']
    },
    {
        name: 'Stack Overflow Search',
        input: '@ocX /search networking',
        expectedContains: ['stackoverflow', 'questions', 'answers']
    }
];
```

### Performance Testing
```javascript
// Measure response times
const startTime = Date.now();
await chatProvider.handleRequest(request, context, stream, token);
const responseTime = Date.now() - startTime;
console.log(`Response time: ${responseTime}ms`);
```

## 📊 Health Check Dashboard

### Service Status Check
```typescript
async function checkAllServices() {
    const status = {
        copilot: await copilotService.isAvailable(),
        mcp: mcpService.isServiceAvailable(),
        stackoverflow: await stackOverflowService.isServiceAvailable(),
        python: await pythonManager.testPythonEnvironment()
    };

    console.log('Service Status:', status);
    return status;
}
```

### Error Rate Monitoring
```typescript
let errorCount = 0;
let totalRequests = 0;

// Track in handleRequest method
totalRequests++;
if (error) {
    errorCount++;
}

const errorRate = (errorCount / totalRequests) * 100;
console.log(`Error rate: ${errorRate.toFixed(2)}%`);
```

## 🚨 Common Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Extension not loading | No activation notification | Check package.json, recompile |
| @ocX not found | Chat participant not recognized | Verify registration, restart VS Code |
| Copilot errors | "No models available" | Check Copilot subscription, re-auth |
| Python failures | Stack Overflow search fails | Test Python environment separately |
| MCP connection issues | Documentation lookup fails | Check network/firewall settings |
| Memory leaks | VS Code becomes slow | Check for unclosed connections |
| Rate limiting | API errors from Stack Overflow | Implement proper request delays |

## 🎯 Success Criteria

### ✅ Extension is working correctly if:
1. Extension activates without errors
2. @ocX responds in Copilot Chat
3. All slash commands work
4. Documentation lookup succeeds
5. Stack Overflow search returns results
6. Follow-up suggestions appear
7. Context awareness works with selected text
8. No memory leaks or performance issues

### 📈 Performance Benchmarks:
- Extension activation: < 2 seconds
- Chat response time: < 10 seconds
- Memory usage: < 100MB
- Error rate: < 5%

---

**Remember:** Always test in a clean Extension Development Host window for accurate results!
