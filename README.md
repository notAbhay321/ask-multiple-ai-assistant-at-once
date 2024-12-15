# Ask Multiple AI Assistants at Once

**Description**: A Chrome extension that allows users to query multiple AI models simultaneously, including ChatGPT, Claude, and Gemini. Easily manage responses and continue conversations in the same chat or create new groups for each question, enhancing your interaction with AI technologies.

## Overview

The **Ask Multiple AI Assistants at Once** extension enables users to interact with various AI models in a single interface. This extension provides a seamless way to ask questions and receive answers from multiple AI assistants, making it easier to leverage their capabilities for various tasks.

## Features

- **Multiple AI Assistants**: Interact with various AI models, including ChatGPT, Claude, Gemini, and more.
- **Continue in Same Chat**: Option to continue conversations in the same chat window or create new groups for each question.
- **Customizable Prompts**: Predefined prompts for specific tasks like code review, debugging, and multiple-choice questions.
- **User-Friendly Interface**: Easy-to-use interface with buttons for quick access to different AI models.
- **Session Management**: Save and manage sessions for later use.

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/ask-multiple-ai-assistant-at-once.git
   ```

2. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" in the top right corner.
   - Click on "Load unpacked" and select the directory where the extension files are located.

3. **Permissions**: Ensure that the extension has the necessary permissions to access the required websites.

## Usage

1. **Open the Extension**: Click on the extension icon in the Chrome toolbar to open the popup interface.
2. **Select AI Models**: Choose which AI models you want to interact with by clicking on the corresponding buttons.
3. **Enter Your Query**: Type your question in the input field. You can also select predefined prompts for specific tasks.
4. **Submit Your Query**: Click the "Ask" button or press Enter to send your query to the selected AI models.
5. **View Responses**: Responses will be displayed in the extension interface. You can continue the conversation in the same chat or create new groups for each question.

## Configuration

- **Predefined Prompts**: You can customize the predefined prompts in the `script.js` file. Modify the `defaultPrompts` array to add or change prompts.
- **Session Management**: Manage your sessions through the settings in the extension. You can create, load, and delete sessions as needed.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
