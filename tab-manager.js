export class TabManager {
    constructor() {
        this.aiModelToTabMap = new Map();
        this.setupTabListeners();
    }

    setupTabListeners() {
        chrome.tabs.onRemoved.addListener((tabId) => {
            for (const [model, mappedTabId] of this.aiModelToTabMap.entries()) {
                if (mappedTabId === tabId) {
                    this.aiModelToTabMap.delete(model);
                }
            }
        });
    }

    async getOrCreateTab(model, reuseTab = false) {
        const existingTabId = this.aiModelToTabMap.get(model);
        
        if (existingTabId && reuseTab) {
            try {
                const tab = await chrome.tabs.get(existingTabId);
                return tab;
            } catch (error) {
                this.aiModelToTabMap.delete(model);
            }
        }

        // Get the base URL for the model
        const baseUrl = this.getBaseUrl(model);

        // Create new tab
        const tab = await chrome.tabs.create({ 
            url: baseUrl, 
            active: false,
            pinned: reuseTab // Only pin if we're reusing tabs
        });
        
        if (reuseTab) {
            this.aiModelToTabMap.set(model, tab.id);
        }
        
        await this.waitForTabLoad(tab.id);
        return tab;
    }

    getBaseUrl(model) {
        switch (model.toLowerCase()) {
            case 'chatgpt':
                return 'https://chat.openai.com/';
            case 'claude':
                return 'https://claude.ai/chat';
            case 'gemini':
                return 'https://gemini.google.com/app';
            case 'mistral':
                return 'https://chat.mistral.ai/chat';
            case 'perplexity':
                return 'https://www.perplexity.ai/';
            case 'bing':
                return 'https://www.bing.com/chat';
            case 'deepseek':
                return 'https://chat.deepseek.com';
            default:
                return model; // Default to a direct URL if not matched
        }
    }

    async waitForTabLoad(tabId) {
        return new Promise((resolve) => {
            const listener = (tid, info) => {
                if (tid === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }

    async sendQueryToTab(tabId, query, botName) {
        await this.waitForTabLoad(tabId);

        // Handle different bots
        switch(botName.toLowerCase()) {
            case 'gemini':
                // Inject script specific to Gemini
                break;
            case 'chatgpt':
                // Inject script specific to ChatGPT
                break;
            // Add other cases as needed
        }
    }

    async initializeEnabledBots(enabledBots) {
        for (const botName of Object.keys(enabledBots)) {
            if (!this.aiModelToTabMap.has(botName)) {
                await this.getOrCreateTab(botName, true);
            }
        }
    }
} 