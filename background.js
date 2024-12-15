import { TabManager } from './tab-manager.js';

const tabManager = new TabManager();

const openChatBots = async (request, sendResponse) => {
    try {
        const chatBots = request.links;
        const tabs = [];
        const continueSameChat = request.continueSameChat || false;

        for (const botName of Object.keys(chatBots)) {
            try {
                // Create new chat with query URL
                const newChatUrl = getNewChatUrl(botName, request.query);
                
                // Get or create tab based on continueSameChat setting
                const tab = continueSameChat ? 
                    await tabManager.getOrCreateTab(botName, newChatUrl) :
                    await chrome.tabs.create({ url: newChatUrl, active: false });

                if (tab?.id) {
                    tabs.push(tab.id);
                    
                    // Wait for tab to load and send query
                    await new Promise((resolve) => {
                        const listener = (tabId, info) => {
                            if (tabId === tab.id && info.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                
                                // Handle different bots
                                switch(botName) {
                                    case 'Claude':
                                    case 'DeepSeek':
                                        chrome.tabs.sendMessage(tab.id, {
                                            action: 'sendQuery',
                                            query: request.query
                                        });
                                        break;
                                    case 'Gemini':
                                        chrome.scripting.executeScript({
                                            target: { tabId: tab.id },
                                            func: submitGemini,
                                            args: [request.query]
                                        });
                                        break;
                                }
                                resolve();
                            }
                        };
                        chrome.tabs.onUpdated.addListener(listener);
                    });
                }
            } catch (error) {
                console.error(`Error handling ${botName}:`, error);
            }
        }

        // Group the tabs if new ones were created
        if (tabs.length > 0 && !continueSameChat) {
            try {
                const groupId = await chrome.tabs.group({ tabIds: tabs });
                await chrome.tabGroups.update(groupId, {
                    collapsed: false,
                    title: request.minTitle || 'AI Assistants',
                    color: 'blue'
                });
            } catch (error) {
                console.error('Error grouping tabs:', error);
            }
        }

        sendResponse({ success: true });
    } catch (error) {
        console.error('Error in openChatBots:', error);
        sendResponse({ success: false, error: error.message });
    }
};

function submitGemini(query) {
    setTimeout(() => {
        const promptElem = document.querySelector("input-area-v2 rich-textarea > div");
        if (!promptElem) {
            console.warn("prompt not found!");
            return;
        }
        
        promptElem.innerHTML = query;

        // Create a new KeyboardEvent
        const enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            which: 13
        });
        
        setTimeout(() => promptElem.dispatchEvent(enterEvent), 800);
    }, 1000);
}

function getNewChatUrl(botName, query) {
    const baseUrl = getBaseUrl(botName);
    if (botName === 'Gemini') {
        return baseUrl;
    }
    return `${baseUrl}?q=${encodeURIComponent(query)}`;
}

function getBaseUrl(botName) {
    switch (botName.toLowerCase()) {
        case 'chatgpt':
            return 'https://chat.openai.com/';
        case 'claude':
            return 'https://claude.ai/new';
        case 'gemini':
            return 'https://gemini.google.com/app';
        case 'mistral':
            return 'https://chat.mistral.ai/chat';
        case 'perplexity':
            return 'https://www.perplexity.ai/search/new';
        case 'bing':
            return 'https://www.bing.com/chat';
        case 'deepseek':
            return 'https://chat.deepseek.com';
        default:
            return botName;
    }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendQueryToAssistants') {
        openChatBots(request, sendResponse);
        return true;  // Keep the message channel open for async response
    }
});