document.querySelector('.settings-button').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.querySelector('.ai-button').addEventListener('click', () => {
    const textarea = document.querySelector('textarea');
    if (!textarea || !textarea.value.trim()) return;

    chrome.runtime.sendMessage({
        action: "sendQueryToDeepSeek",
        query: textarea.value.trim()
    });

    window.close();
}); 