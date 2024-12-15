// Mistral handler
const submitPrompt = async (prompt) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return false;

    textarea.value = prompt;
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