// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendQuery') {
        try {
            // Handle different chat interfaces
            if (window.location.hostname.includes('chatgpt.com')) {
                handleChatGPT(request.query);
            } else if (window.location.hostname.includes('claude.ai')) {
                handleClaude(request.query);
            } else if (window.location.hostname.includes('gemini.google.com')) {
                handleGemini(request.query);
            } else if (window.location.hostname.includes('chat.mistral.ai')) {
                handleMistral(request.query);
            } else if (window.location.hostname.includes('perplexity.ai')) {
                handlePerplexity(request.query);
            } else if (window.location.hostname.includes('bing.com')) {
                handleBing(request.query);
            } else if (window.location.hostname.includes('deepseek.com')) {
                handleDeepSeek(request.query);
            }
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error handling query:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true;
});

// Handler functions for each chat interface
function handleChatGPT(query) {
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.value = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = textarea.parentElement.querySelector('button');
        if (button) button.click();
    }
}

function handleClaude(query) {
    const textarea = document.querySelector('[role="textbox"]');
    if (textarea) {
        textarea.textContent = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('button[type="submit"]');
        if (button) button.click();
    }
}

function handleGemini(query) {
    const textarea = document.querySelector('rich-textarea p');
    if (textarea) {
        textarea.textContent = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('.send-button');
        if (button) button.click();
    }
}

function handleMistral(query) {
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.value = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('button[type="submit"]');
        if (button) button.click();
    }
}

function handlePerplexity(query) {
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.value = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('button[type="submit"]');
        if (button) button.click();
    }
}

function handleBing(query) {
    const textarea = document.querySelector('#searchbox');
    if (textarea) {
        textarea.value = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('#send-button');
        if (button) button.click();
    }
}

function handleDeepSeek(query) {
    const textarea = document.querySelector('textarea');
    if (textarea) {
        textarea.value = query;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        const button = document.querySelector('button[type="submit"]');
        if (button) button.click();
    }
} 