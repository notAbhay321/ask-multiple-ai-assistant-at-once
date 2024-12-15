if (!window.chatGPTHandler) {
    window.chatGPTHandler = {
        submitPrompt: async (prompt) => {
            const textarea = document.querySelector('textarea[placeholder*="Send a message"]');
            if (!textarea) return false;

            textarea.value = prompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            const button = textarea.parentElement.querySelector('button');
            if (button) {
                button.click();
                return true;
            }
            return false;
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'sendQuery') {
            window.chatGPTHandler.submitPrompt(request.query)
                .then(success => sendResponse({ success }))
                .catch(error => sendResponse({ success: false, error }));
            return true;
        }
    });
} 