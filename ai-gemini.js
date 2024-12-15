// Gemini handler
const submitPrompt = async (prompt) => {
    const promptElem = document.querySelector("input-area-v2 rich-textarea > div");
    if (!promptElem) {
        console.warn("prompt not found!");
        return false;
    }

    promptElem.innerHTML = prompt;

    // Create a new KeyboardEvent
    const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true, // Make sure the event bubbles up through the DOM
        cancelable: true, // Allow it to be canceled
        key: 'Enter', // Specify the key to be 'Enter'
        code: 'Enter', // Specify the code to be 'Enter' for newer browsers
        which: 13 // The keyCode for Enter key (legacy property)
    });

    // Dispatch the event on the textarea element
    setTimeout(() => promptElem.dispatchEvent(enterEvent), 800);

    return true;
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
    // Check if the current page is the Gemini chat page
    if (window.location.href.includes('https://gemini.google.com/app')) {
        // Find the input field and submit button
        const inputField = document.querySelector('textarea[placeholder="Send a message..."]');
        const submitButton = document.querySelector('button[aria-label="Send message"]');

        // Function to fill the input field and submit the form
        const fillAndSubmit = (prompt) => {
            if (inputField && submitButton) {
                inputField.value = prompt;
                submitButton.click();
            }
        };

        // Listen for messages from the background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'fillGeminiPrompt') {
                fillAndSubmit(request.prompt);
            }
        });
    }
}); 