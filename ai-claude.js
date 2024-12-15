// Claude handler
const submitPrompt = async (prompt) => {
    const textarea = document.querySelector('[role="textbox"]');
    if (!textarea) return false;

    textarea.textContent = prompt;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    const button = document.querySelector('button[type="submit"]');
    if (button) {
        button.click();
        return true;
    }
    return false;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendQuery') {
        submitPrompt(request.query)
            .then(success => sendResponse({ success }))
            .catch(error => sendResponse({ success: false, error }));
        return true;
    }
});

// Wait for the page to load
window.addEventListener('load', function() {
    // Check if the current page is the Claude AI chat page
    if (window.location.href.includes('https://claude.ai/new')) {
        // Find the input field and submit button
        const inputField = document.querySelector('textarea[placeholder="Send a message..."]');
        const submitButton = document.querySelector('button[type="submit"]');

        // Function to fill the input field and submit the form
        const fillAndSubmit = (prompt) => {
            if (inputField && submitButton) {
                inputField.value = prompt;
                submitButton.click();
            }
        };

        // Listen for messages from the background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'fillClaudePrompt') {
                fillAndSubmit(request.prompt);
            }
        });
    }
}); 