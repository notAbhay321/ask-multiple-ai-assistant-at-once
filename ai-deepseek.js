// DeepSeek handler
if (!window.deepseekHandler) {
    window.deepseekHandler = {
        submitPrompt: async (prompt) => {
            const promptElem = document.querySelector("textarea");
            if (!promptElem) {
                console.warn("prompt not found!");
                return false;
            }
            promptElem.value = prompt;
            promptElem.dispatchEvent(new Event('input', { 'bubbles': true }));
            
            // Create a new KeyboardEvent
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true, // Make sure the event bubbles up through the DOM
                cancelable: true, // Allow it to be canceled
                key: 'Enter', // Specify the key to be 'Enter'
                code: 'Enter', // Specify the code to be 'Enter' for newer browsers
                which: 13 // The keyCode for Enter key (legacy property)
            });
            
            // Dispatch the event on the textarea element
            promptElem.dispatchEvent(enterEvent);

            return true;
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'sendQuery') {
            window.deepseekHandler.submitPrompt(request.query)
                .then(success => sendResponse({ success }))
                .catch(error => sendResponse({ success: false, error }));
            return true;
        }
    });
} 