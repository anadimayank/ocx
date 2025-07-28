# OpenShift AI Assistant VS Code Extension

A powerful VS Code extension that integrates GitHub Copilot with OpenShift expertise, providing intelligent assistance through the **@ocX** chat participant.

## 🚀 Features

- **Native Copilot Chat Integration**: Use `@ocX` directly in GitHub Copilot Chat
- **Slash Commands**: Quick access via `/troubleshoot`, `/docs`, `/search`, `/explain`, `/best-practices`
- **Real-time Documentation**: Access up-to-date OpenShift docs via Context7 MCP server
- **Community Solutions**: Integrated Stack Overflow search for community-driven answers
- **Context-Aware Responses**: Understands your workspace and selected code
- **Streaming Responses**: Real-time response generation with progress indicators
- **Follow-up Suggestions**: Contextual next questions based on conversation history

## 📋 Prerequisites

### Required Software
- **Node.js 18+** with npm
- **Python 3.8+** with pip
- **VS Code 1.80+**
- **GitHub Copilot Extension** (active subscription required)

### System Requirements
- Windows 10/11, macOS 10.15+, or Linux
- 4GB RAM minimum (8GB recommended)
- Stable internet connection for AI and documentation services

## 🔧 Installation & Setup

### Method 1: Quick Setup (Recommended)

1. **Download and Extract**
   ```bash
   # Extract the provided zip file
   unzip openshift-ai-assistant.zip
   cd openshift-ai-assistant
   ```

2. **Install Dependencies**
   ```bash
   # Install Node.js dependencies
   npm install

   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Launch Development Mode**
   - Open the project in VS Code: `code .`
   - Press **F5** to launch Extension Development Host
   - The extension will be active in the new window

### Method 2: Manual Development Setup

1. **Create New Extension**
   ```bash
   yo code  # Use Yeoman generator (optional)
   # Or use the provided files directly
   ```

2. **Copy Files**
   - Copy all provided files to your extension directory
   - Maintain the exact folder structure

3. **Configure VS Code**
   - Open the extension folder in VS Code
   - Ensure the GitHub Copilot extension is installed and active

## 🎯 Usage Guide

### Basic Usage

1. **Open Copilot Chat**: `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Alt+I` (macOS)
2. **Use @ocX participant**: Type `@ocX` followed by your question
3. **Try slash commands**: Use `/troubleshoot`, `/docs`, etc.

### Example Interactions

#### General Questions
```
@ocX How do I create a secure route in OpenShift?
@ocX What's the difference between DeploymentConfig and Deployment?
```

#### Troubleshooting
```
@ocX /troubleshoot My pods are stuck in CrashLoopBackOff
@ocX /troubleshoot ImagePullBackOff error with private registry
```

#### Documentation
```
@ocX /docs SecurityContext configuration
@ocX /docs persistent volume storage classes
```

#### Code Explanation
```yaml
# Select this YAML first, then ask:
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 8080
```
Then: `@ocX /explain`

#### Community Search
```
@ocX /search OpenShift route SSL termination
@ocX /search Kubernetes networking troubleshooting
```

#### Best Practices
```
@ocX /best-practices container security
@ocX /best-practices resource limits and requests
```

## 🔧 Development & Debugging

### Project Structure
```
openshift-ai-assistant/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
├── requirements.txt          # Python dependencies
│
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── types/index.ts        # TypeScript interfaces
│   │
│   ├── providers/
│   │   └── openShiftChatProvider.ts  # Chat participant implementation
│   │
│   ├── services/
│   │   ├── copilotService.ts         # GitHub Copilot integration
│   │   ├── mcpService.ts             # Context7 MCP server client
│   │   ├── stackOverflowService.ts   # Stack Overflow API client
│   │   └── pythonServiceManager.ts   # Python service orchestrator
│   │
│   └── python/
│       ├── main.py                   # Python service entry point
│       └── services/
│           └── stackoverflow_service.py  # Enhanced Stack Overflow service
```

### Debug Configuration

1. **Launch Extension Development Host**
   - Press `F5` in VS Code
   - A new window opens with the extension loaded

2. **View Debug Output**
   - Open Command Palette: `Ctrl+Shift+P`
   - Run: "Developer: Toggle Developer Tools"
   - Check Console tab for extension logs

3. **Check Output Channels**
   - View → Output
   - Select "OpenShift AI Assistant" from dropdown

### Testing Procedures

#### 1. Basic Functionality Test
```bash
# In Extension Development Host:
# 1. Open Copilot Chat
# 2. Type: @ocX hello
# Expected: Welcome message with capability overview
```

#### 2. Copilot Integration Test
```bash
# Type: @ocX How do I create a pod in OpenShift?
# Expected: Detailed response with YAML examples
```

#### 3. Slash Commands Test
```bash
# Type: @ocX /docs route
# Expected: Documentation about OpenShift routes
```

#### 4. Python Service Test
```bash
# Type: @ocX /search "pod scheduling"
# Expected: Stack Overflow results related to pod scheduling
```

#### 5. Context Awareness Test
```bash
# 1. Open a YAML file with OpenShift resources
# 2. Select some YAML content
# 3. Type: @ocX /explain
# Expected: Explanation of the selected YAML
```

### Common Issues & Solutions

#### Extension Not Loading
```bash
# Check Node.js version
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Recompile
npm run compile
```

#### Python Services Failing
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Reinstall Python packages
pip install -r requirements.txt --force-reinstall

# Test Python environment
python3 src/python/main.py
# Should show: waiting for input (Ctrl+C to exit)
```

#### Copilot Not Responding
1. Ensure GitHub Copilot extension is installed and active
2. Check Copilot subscription status
3. Restart VS Code
4. Re-authenticate with GitHub if needed

#### MCP Connection Issues
1. Check internet connectivity
2. Verify corporate firewall/proxy settings
3. Check if WebSocket connections are allowed

### Performance Optimization

#### Memory Usage
- Extension uses ~50-100MB RAM
- Python processes are short-lived (< 30 seconds)
- WebSocket connections are reused

#### Network Usage
- MCP server: ~1-5KB per documentation request
- Stack Overflow: ~10-50KB per search
- Copilot: Varies by query complexity

#### Response Times
- Copilot responses: 2-10 seconds
- Documentation lookup: 1-3 seconds
- Stack Overflow search: 2-5 seconds

## 📦 Building & Distribution

### Development Build
```bash
npm run compile
```

### Production Package
```bash
# Create VSIX package
npm run package
# or
npx vsce package

# Install locally
code --install-extension openshift-ai-assistant-2.0.0.vsix
```

### Publishing to Marketplace
```bash
# Login to Visual Studio Marketplace
npx vsce login your-publisher-name

# Publish
npx vsce publish
```

## 🔐 Security & Privacy

### Data Handling
- **No cluster credentials required**: Extension works without OpenShift login
- **Copilot authentication**: Uses existing GitHub Copilot session
- **Anonymous API calls**: Stack Overflow queries don't require authentication
- **Secure connections**: All external APIs use HTTPS/WSS

### Privacy Considerations
- Code snippets may be sent to GitHub Copilot for analysis
- Documentation queries sent to Context7 MCP server
- Stack Overflow searches are anonymous
- No persistent storage of user data

### Network Communications
- **GitHub Copilot**: Encrypted communication via VS Code API
- **Context7 MCP**: WebSocket over TLS (wss://)
- **Stack Overflow**: HTTPS REST API
- **No telemetry**: Extension doesn't collect usage statistics

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

### Code Style
- TypeScript: Follow ESLint configuration
- Python: Follow PEP 8 guidelines
- Documentation: Use clear, concise language

### Testing Guidelines
- Test all slash commands
- Verify error handling
- Check different query types
- Validate response formatting

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

### Getting Help
1. Check this README for common issues
2. Review VS Code Output channels for errors
3. Test Python environment separately
4. Verify all prerequisites are met

### Reporting Issues
When reporting issues, please include:
- VS Code version
- Extension version
- Operating system
- Error messages from Output channels
- Steps to reproduce

### Feature Requests
We welcome suggestions for new features that would improve OpenShift development workflows.

---

**Happy OpenShift Development!** 🚀

For questions or support, please check the documentation or open an issue in the repository.
