// Store active tabs for each AI service
const activeTabs = new Map();

// Function to get or create tab for an AI service
export async function getOrCreateTab(url, name) {
    // Check if we have an active tab for this service
    const existingTabId = activeTabs.get(name);
    if (existingTabId) {
        try {
            // Try to get the tab - this will throw if tab was closed
            const tab = await chrome.tabs.get(existingTabId);
            if (tab) {
                // Update tab URL if needed
                if (tab.url !== url) {
                    await chrome.tabs.update(tab.id, { url });
                }
                return tab;
            }
        } catch (e) {
            // Tab was closed or doesn't exist, remove from our map
            activeTabs.delete(name);
        }
    }

    // Create new tab if we don't have one
    const tab = await chrome.tabs.create({
        url: url,
        active: false,
        pinned: true
    });
    
    // Store the new tab
    activeTabs.set(name, tab.id);
    return tab;
}

// Listen for tab removal to clean up our map
chrome.tabs.onRemoved.addListener((tabId) => {
    for (const [name, id] of activeTabs.entries()) {
        if (id === tabId) {
            activeTabs.delete(name);
            break;
        }
    }
});

export const aiToggle = {
    getOrCreateTab,
    activeTabs
}; 