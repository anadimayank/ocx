ocX AI Assistant
ocX AI Assistant is a powerful VS Code extension that provides intelligent assistance for a wide range of technologies, with a specialization in Red Hat OpenShift. Integrated directly into the Copilot Chat interface, this extension gives you instant access to documentation, community-driven solutions, and AI-powered code explanations.

🚀 Features
Seamless Integration: Works directly within the familiar Copilot Chat interface.

Slash Commands: Quickly access features with commands like /docs, /search, and /explain.

Live Documentation: Fetches up-to-date documentation from the Context7 MCP server.

Community Solutions: Searches Stack Overflow for relevant questions and answers.

AI-Powered Explanations: Uses advanced language models to explain complex code snippets.

📋 Prerequisites
VS Code: Version 1.80 or higher.

GitHub Copilot: An active subscription is required.

Node.js: Version 16 or higher.

Python: Version 3.8 or higher.

🔧 Installation
Clone the Repository:

Bash

git clone https://github.com/your-username/ocx-ai-assistant.git
Install Dependencies:

Bash

npm install
Compile the Extension:

Bash

npm run compile
Run the Extension:

Open the project in VS Code.

Press F5 to start a new Extension Development Host window.

🎯 How to Use
Once the extension is running, you can interact with it in the Copilot Chat panel using the @ocX participant.

General Queries
You can ask ocX any question related to your development process, just like you would with Copilot.

Example:

@ocX what is the difference between a deployment and a statefulset in kubernetes
Slash Commands
For more specific tasks, you can use the following slash commands:

/docs: Fetches official documentation for a given technology.

@ocX /docs react hooks
/search: Searches Stack Overflow for community solutions.

@ocX /search python list comprehension
/explain: Explains a selected code snippet.

Highlight a piece of code in your editor.

Type @ocX /explain in the chat panel.

Architecture
The extension is built around a central OpenShiftChatProvider, which handles all incoming requests from the VS Code chat interface. Depending on the user's input, it delegates the request to one of the following services:

CopilotService: Interacts with GitHub Copilot's language models to provide AI-powered responses.

MCPService: Fetches documentation from the Context7 MCP server.

StackOverflowService: Searches for relevant questions on Stack Overflow.

🤝 Contributing
We welcome contributions! Please feel free to submit a pull request or open an issue if you have any suggestions or find any bugs.

📄 License
This project is licensed under the MIT License. See the LICENSE file for more details.