const disabledBots = [];
let predefinedPrompts = [];
let editingID = -1;
let submitByCtrlEnter = false;
let setOfPredefinedPrompts = new Set();
let selectedModels = [];
let currentPrePrompt = null;

const defaultPrompts = [
    {
        title: "MCQ-v1",
        prompt: "Please read the following multiple-choice question and provide the most appropriate single answer from the options given. Do not provide any additional explanations or details, just the answer itself. Additionally, please assess the accuracy of the answer you provide and state your confidence level as a percentage."
    },
    {
        title: "Code Review",
        prompt: "Please review the following code and provide feedback on: 1) Potential bugs 2) Performance improvements 3) Best practices"
    },
    {
        title: "Explain Code",
        prompt: "Please explain what this code does in simple terms, and break down how it works step by step"
    },
    {
        title: "Debug Help",
        prompt: "Please help me debug this code. Identify potential issues and suggest solutions"
    }
];

const storage = async () => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        return await chrome.storage.local.get([
            "predefinedPrompts", 
            "ctrlEnter", 
            "css", 
            "defaultPrompt", 
            "botList", 
            "compactTheme", 
            "darkMode", 
            "queryHistory", 
            "categories", 
            "sessions",
            "useSameChat"
        ]);
    }
    return {};
};

const storageSet = async (data) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        await chrome.storage.local.set(data);
    } else {
        localStorage.setItem(Object.keys(data)[0], Object.values(data)[0]);
    }
};

const storageGet = (key) => {
    if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
        if (Object.prototype.hasOwnProperty.call(allData, key)) return allData[key];
        return null;
    } else {
        return localStorage.getItem(key);
    }
};

let allData = {};

const initCategories = async () => {
    const categoriesContainer = document.querySelector('.category-buttons');
    if (!categoriesContainer) return;

    try {
        const data = await storage();
        let savedCategories = data.categories ? JSON.parse(data.categories) : defaultCategories;
        
        categoriesContainer.innerHTML = '';
        
        savedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'outline category-button';
            button.setAttribute('data-category', category);
            button.textContent = category;
            
            // Add click handler for category selection
            button.addEventListener('click', () => {
                // If this category is already selected, deselect it
                if (selectedCategory === category) {
                    selectedCategory = '';
                    button.classList.remove('selected');
                    button.style.backgroundColor = '#e74c3c'; // Red for unselected
                } else {
                    // Deselect previously selected category
                    const prevSelected = categoriesContainer.querySelector('.category-button.selected');
                    if (prevSelected) {
                        prevSelected.classList.remove('selected');
                        prevSelected.style.backgroundColor = '#e74c3c';
                    }
                    
                    // Select this category
                    selectedCategory = category;
                    button.classList.add('selected');
                    button.style.backgroundColor = '#2ecc71'; // Green for selected
                }
            });
            
            categoriesContainer.appendChild(button);
        });
        
        const addButton = document.createElement('button');
        addButton.className = 'outline add-category-button';
        addButton.id = 'addCategory';
        addButton.innerHTML = '<span>+</span>';
        categoriesContainer.appendChild(addButton);
    } catch (error) {
        console.error('Error initializing categories:', error);
    }
};

const defaultCategories = ['Programming', 'Design', 'Database', 'DevOps', 'Security'];
let selectedCategory = '';

const updateSessionSelect = async () => {
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect) {
        return;
    }
    
    const data = await storage();
    const sessions = data.sessions ? JSON.parse(data.sessions) : [];
    
    // Clear existing options except the first one
    while (sessionSelect.options.length > 1) {
        sessionSelect.remove(1);
    }
    
    // Add sessions to select
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = session.name;
        sessionSelect.appendChild(option);
    });
};

document.addEventListener("DOMContentLoaded", async () => {
    await displayWelcomeMessage();
    await initCategories();
    let mouseDownTime = 0;
    await initSettings();

    const queryElement = document.querySelector("#query");
    if (queryElement) {
        queryElement.addEventListener("keydown", submitPrompt());
    } else {
        console.error("Query element not found");
    }

    // Initialize sections as collapsed
    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.add('collapsed');
    });
    
    // Add click handler for section headers
    document.querySelectorAll('.settings-section .section-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.settings-section');
            section.classList.toggle('collapsed');
        });
    });

    const askButton = document.querySelector(".mainAsk");
    if (askButton) {
        askButton.addEventListener("click", submitSimplePrompt());
        
        askButton.addEventListener("mousedown", () => {
            askButton.style.transform = "scale(0.98)";
        });
        
        askButton.addEventListener("mouseup", () => {
            askButton.style.transform = "scale(1)";
        });
    } else {
        console.error("Ask button not found");
    }

    document.addEventListener("contextmenu", predefinedPromptsMiddleButton());
    document.addEventListener("mouseup", predefinedPromptsButtonMouseUp());
    document.addEventListener("mousedown", predefinedPromptsButtonMoouseDown());

    document.querySelector("#shortcutEditor").addEventListener("click", () => chrome.runtime.sendMessage({ action: "openShortcutEditor" }));

    document.querySelectorAll(".closeEvent").forEach((button) => button.addEventListener("click", (event) => handleModalOpen(event)));

    document.querySelector("#ctrlEnter").addEventListener("change", () =>
        storageSet({ "ctrlEnter": JSON.stringify(submitByCtrlEnter = document.querySelector("#ctrlEnter").checked) }));

    document.querySelector("#compactTheme").addEventListener("change", (e) =>
        storageSet({ "compactTheme": JSON.stringify(e.target.checked) }));

    const darkModeToggle = document.querySelector("#darkModeToggle");
    if (darkModeToggle) {
        const isDarkMode = JSON.parse(storageGet("darkMode")) ?? false;
        darkModeToggle.checked = isDarkMode;
        document.body.classList.toggle("dark-mode", isDarkMode);
        
        darkModeToggle.addEventListener("change", (e) => {
            const isDarkMode = e.target.checked;
            document.body.classList.toggle("dark-mode", isDarkMode);
            storageSet({ "darkMode": JSON.stringify(isDarkMode) });
        });
    } else {
        console.error("Dark mode toggle not found");
    }

    function submitSimplePrompt() {
        return async (e) => {
            e.preventDefault();
            const queryText = document.querySelector("#query").value;
            
            if (!queryText || queryText.trim().length === 0) {
                showWarning("Please enter a query before asking AI Assistants");
                return;
            }

            try {
                await openChatBots(queryText);
                console.log("Query sent successfully");
            } catch (error) {
                console.error("Error sending query:", error);
                showWarning("An error occurred while sending your query");
            }
        };
    }

    function submitPrompt() {
        return (event) => {
            if (!document.querySelector("#query").value.length) return;
            if (event.key === "Enter") {
                if (!event.ctrlKey && submitByCtrlEnter) return;
                event.preventDefault();

                let text = document.querySelector("#query").value;
                if (defaultPrompt !== -1)
                    text = `${predefinedPrompts[defaultPrompt].prompt}\n${text}`;

                openChatBots(text);
            }
        };
    }

    async function initSettings() {
        await loadSettings();
        initChatBots();
        addPredefinedButtons();
    }

    async function loadSettings() {
        if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
            document.querySelector("html").classList.add("app");
            document.querySelectorAll(".websiteVisible").forEach((element) => element.style.display = "none");
            allData = await storage();

            const keys = await chrome.commands.getAll();
            if (keys.length) {
                if (keys[0].shortcut.length < 2) keys[0].shortcut = "Edit Shortcut";
                document.querySelector("#shortcutEditor").innerText = `${keys[0].shortcut}`;
            }
        } else {
            document.querySelector("html").classList.add("web");
            document.querySelectorAll(".extVisisble").forEach((element) => element.style.display = "none");
        }

        initBotListSettings();

        predefinedPrompts = JSON.parse(storageGet("predefinedPrompts")) ?? [...setOfPredefinedPrompts];
        defaultPrompt = parseInt(storageGet("defaultPrompt") ?? -1);
        if (defaultPrompt > predefinedPrompts.length - 1) defaultPrompt = -1;
        submitByCtrlEnter = JSON.parse(storageGet("ctrlEnter")) ?? false;
    }

    function initChatBots() {
        const bots = getBots("{prompt}");
        chatBots = Object.keys(bots);
        disabledBots.length = 0;
        
        const chatButtonsDiv = document.querySelector("#chatButtons div[role='group']");
        if (chatButtonsDiv) {
            chatButtonsDiv.innerHTML = ''; // Clear existing buttons
            
            for (const botName of chatBots) {
                if (bots[botName].state === "hidden") continue;
                
                const isDisabled = bots[botName].state === "disabled";
                const buttonColor = isDisabled ? "#e74c3c" : "#2ecc71"; // Red if disabled, green if enabled
                
                const button = document.createElement('button');
                button.className = `chat_button outline ${isDisabled ? 'disabled' : ''}`;
                button.value = botName;
                button.textContent = botName;
                button.style.backgroundColor = buttonColor;
                
                // Add click event directly to the button
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const currentState = this.classList.contains('disabled');
                    const bots = getBots("{prompt}");
                    
                    if (currentState) {
                        // Enable the bot
                        bots[this.value].state = "enabled";
                        this.classList.remove('disabled');
                        this.style.backgroundColor = "#2ecc71"; // Green
                    } else {
                        // Disable the bot
                        bots[this.value].state = "disabled";
                        this.classList.add('disabled');
                        this.style.backgroundColor = "#e74c3c"; // Red
                    }
                    
                    storageSet({ "botList": JSON.stringify(bots) });
                    updateGeminiInfo();
                });
                
                chatButtonsDiv.appendChild(button);
            }
        }
        
        updateGeminiInfo();
    }

    function initBotListSettings() {
        const bots = getBots("{prompt}");
        if (!Object.keys(bots).length) return;
        chatBots = Object.keys(bots);
        const botEl = document.querySelector("#botList");
        botEl.innerHTML = "";
        for (const bot of Object.keys(bots))
            botEl.innerHTML += getBotTemplate(bot, bots[bot]);
        document.querySelectorAll(".botTemplate").forEach(button => button.addEventListener("click", botAction));
        document.querySelectorAll(".botSetting [name=\"title\"]").forEach(button => button.addEventListener("blur", botAction));
        document.querySelectorAll(".botSetting [name=\"botState\"]").forEach(button => button.addEventListener("change", botAction));
    }

    function getBotTemplate(bot, data) {
        return `
            <div class="botSetting" data-id="${bot}">
                <div class="part1 grid">
                    <input type="text" data-action="save" name="title" placeholder="title" aria-label="title" value="${bot}">   
                    <select name="botState" data-action="save" aria-label="Select" required>
                        <option id="enabled" value="enabled" name="botState" ${data.state === "enabled" ? "selected" : ""}>Enabled</option>
                        <option id="disabled" value="disabled" name="botState" ${data.state === "disabled" ? "selected" : ""}>Disabled</option>
                        <option id="hidden" value="hidden" name="botState" ${data.state === "hidden" ? "selected" : ""}>Hidden</option>
                    </select>
                    <div class="sort">
                        <button class="outline secondary botTemplate" data-action="moveUp" data-tooltip="Move Up">
                            <svg enable-background="new 0 0 32 32" height="16px" id="Layer_1" version="1.1" viewBox="0 0 32 32" width="16px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M18.221,7.206l9.585,9.585c0.879,0.879,0.879,2.317,0,3.195l-0.8,0.801c-0.877,0.878-2.316,0.878-3.194,0  l-7.315-7.315l-7.315,7.315c-0.878,0.878-2.317,0.878-3.194,0l-0.8-0.801c-0.879-0.878-0.879-2.316,0-3.195l9.587-9.585  c0.471-0.472,1.103-0.682,1.723-0.647C17.115,6.524,17.748,6.734,18.221,7.206z" fill="#515151"/></svg>
                        </button>
                        <button class="outline botTemplate" data-action="moveDown" data-tooltip="Move Down">
                            <svg enable-background="new 0 0 32 32" height="16px" id="Layer_1" version="1.1" viewBox="0 0 32 32" width="16px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M14.77,23.795L5.185,14.21c-0.879-0.879-0.879-2.317,0-3.195l0.8-0.801c0.877-0.878,2.316-0.878,3.194,0  l7.315,7.315l7.316-7.315c0.878-0.878,2.317-0.878,3.194,0l0.8,0.801c0.879,0.878,0.879,2.316,0,3.195l-9.587,9.585  c-0.471,0.472-1.104,0.682-1.723,0.647C15.875,24.477,15.243,24.267,14.77,23.795z" fill="#515151"/></svg>
                        </button>
                    </div>
                </div>
                <div class="part2 grid">
                    <input type="text" name="url" placeholder="url" aria-label="url" value="${data.link}">
                    <div role="group">
                        <button class="outline secondary botTemplate" data-action="delete" data-tooltip="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    document.querySelector("#resetBots").addEventListener("click", async () => {
        await storageSet({ "botList": JSON.stringify(getBots("{prompt}", true)) });
        window.location.reload();
    });

    document.querySelector("#addNewBot").addEventListener("click", async () => {
        const bots = getBots("{prompt}");
        const newBot = {
            "state": "enabled",
            "link": "https://chat.deepseek.com/?q={prompt}" // Default URL for new bots
        };
        bots["New Bot"] = newBot;
        await storageSet({ "botList": JSON.stringify(bots) });
        initBotListSettings();
    });

    function botAction(e) {
        e.preventDefault();
        const event = e.target;
        let bot = event.closest(".botSetting").dataset.id;
        let bots = { ...getBots("{prompt}") };
        const botNames = Object.keys(bots);
        const botIndex = botNames.indexOf(bot);

        if (event.dataset.action === "save") {
            const newTitle = event.closest(".botSetting").querySelector("[name='title']").value;
            if (bot !== newTitle) {
                bots = changeKey(bots, bot, newTitle);
                bot = newTitle;
            }
            bots[bot].state = event.closest(".botSetting").querySelector("[name='botState']").value;
            
            // Get and validate the URL
            let newUrl = event.closest(".botSetting").querySelector("[name='url']").value.trim();
            const validUrl = validateBotUrl(newUrl);
            
            if (validUrl) {
                bots[bot].link = validUrl;
                storageSet({ "botList": JSON.stringify(bots) });
                initBotListSettings();
            }
            return;
        }
        if (event.dataset.action === "moveUp" || event.dataset.action === "moveDown") {
            if (botIndex > -1) {
                if (event.dataset.action === "moveUp" && botIndex > 0) {
                    botNames.splice(botIndex, 1);
                    botNames.splice(botIndex - 1, 0, bot);
                } else if (event.dataset.action === "moveDown" && botIndex < botNames.length - 2) {
                    botNames.splice(botIndex, 1);
                    botNames.splice(botIndex + 1, 0, bot);
                }
                const newBots = {};
                for (const bot of botNames)
                    newBots[bot] = bots[bot];
                bots = { ...newBots };
                storageSet({ "botList": JSON.stringify(newBots) });
            }
        }
        if (event.dataset.action === "delete") {
            delete bots[bot];
            storageSet({ "botList": JSON.stringify(bots) });
        }
        initBotListSettings();
    }

    function predefinedPromptsMiddleButton() {
        return (event) => {
            if (event.target.classList.contains("prefPromptButton")) {
                event.preventDefault();

                editingID = parseInt(event.target.dataset.id);
                if (editingID === undefined) return alert("Error, no ID found");

                document.querySelector("[name='promptName']").value = predefinedPrompts[editingID].title;
                document.querySelector("[name='prompt']").value = predefinedPrompts[editingID].prompt;

                openModal(document.getElementById("edit-modal"));
            } else if (event.target.classList.contains("chatButton")) {
                openModal(document.getElementById("settings"));
                event.preventDefault();
            }
        };
    }

    function predefinedPromptsButtonMoouseDown() {
        return (event) => {
            if (event.target.classList.contains("prefPromptButton")) {
                if (event.button === 0)
                    mouseDownTime = new Date().getTime();

                if (event.button === 1) {
                    editingID = parseInt(event.target.dataset.id);
                    if (editingID === undefined) alert("Error, no ID found");

                    predefinedPrompts = moveElementUp(predefinedPrompts, editingID);

                    addPredefinedButtons();

                    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
                }
            }
        };
    }

    function predefinedPromptsButtonMouseUp() {
        return (event) => {
            if (event.button === 0 && event.target.classList.contains("prefPromptButton")) {
                const id = parseInt(event.target.dataset.id);
                
                if (defaultPrompt === id) {
                    event.target.classList.remove('selected');
                    defaultPrompt = -1;
                    storageSet({ "defaultPrompt": defaultPrompt });
                    return;
                }
                
                const allPromptButtons = document.querySelectorAll('.prefPromptButton');
                allPromptButtons.forEach(btn => {
                    btn.classList.remove('selected');
                    btn.style.backgroundColor = '#e74c3c'; // Red for unselected
                });
                
                event.target.classList.add('selected');
                event.target.style.backgroundColor = '#3498db'; // Blue for selected
                
                defaultPrompt = id;
                storageSet({ "defaultPrompt": defaultPrompt });
            }
        };
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Alt") {
            document.querySelector(".preprompt-buttons").classList.add("shortcutEnabled");
            event.preventDefault();
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === "Alt") {
            document.querySelector(".preprompt-buttons").classList.remove("shortcutEnabled");
            event.preventDefault();
        }

        if (event.altKey && parseInt(event.key) >= 1 && parseInt(event.key) <= 9) {
            if (!document.querySelector("#query").value.length) return;
            event.preventDefault();

            const num = predefinedPrompts.length - parseInt(event.key);

            if (num >= 0 && num < predefinedPrompts.length) {
                const text = predefinedPrompts[num].prompt + "\n" + document.querySelector("#query").value;
                openChatBots(text);
            }
        }
    });

    document.querySelector("#settingsButton").addEventListener("click", () => {
        const settingsModal = document.getElementById("settings-modal");
        if (settingsModal) {
            openModal(settingsModal);
        } else {
            console.error("Settings modal not found");
        }
    });

    document.addEventListener("click", (e) => {
        const addPromptButton = e.target.closest("#addPrompt");
        if (addPromptButton) {
            openModal(document.getElementById("add-prompt-modal"));
        }
    });

    initCategories();

    // Initialize same chat toggle
    const sameChatToggle = document.getElementById('sameChatToggle');
    if (sameChatToggle) {
        const data = await storage();
        const useSameChat = data.useSameChat ? JSON.parse(data.useSameChat) : false;
        sameChatToggle.checked = useSameChat;
        
        sameChatToggle.addEventListener("change", (e) => {
            storageSet({ "useSameChat": JSON.stringify(e.target.checked) });
        });
    }

    await initPredefinedPrompts();

    const allAiLoginPanelButton = document.querySelector("#allAiLoginPanel");
    if (allAiLoginPanelButton) {
        allAiLoginPanelButton.addEventListener("click", async () => {
            const bots = getBots("{prompt}");
            const botUrls = Object.values(bots).map(bot => bot.link.replace("{prompt}", ""));

            const tabIds = [];

            for (const url of botUrls) {
                const tab = await chrome.tabs.create({ url, active: false });
                tabIds.push(tab.id);
            }

            if (tabIds.length > 0) {
                try {
                    const groupId = await chrome.tabs.group({ tabIds });
                    await chrome.tabGroups.update(groupId, {
                        collapsed: false,
                        title: "AI Login Panels",
                        color: "blue"
                    });
                } catch (error) {
                    console.error('Error grouping tabs:', error);
                }
            }
        });
    }
});

const updatePredefinedPromptsSet = () => {
    setOfPredefinedPrompts.clear();
    predefinedPrompts.forEach(prompt => {
        setOfPredefinedPrompts.add(prompt.title.toLowerCase());
    });
};

const addPredefinedButtons = () => {
    const container = document.querySelector('.preprompt-buttons');
    if (!container) return;

    // Clear existing buttons
    container.innerHTML = '';

    // Add predefined prompt buttons
    predefinedPrompts.forEach((prompt, index) => {
        const button = document.createElement('button');
        button.className = 'outline prefPromptButton';
        button.setAttribute('data-id', index);
        button.textContent = prompt.title;
        
        // Add click handler
        button.addEventListener('click', () => {
            // Store the selected prompt index instead of modifying textarea
            defaultPrompt = index;
            
            // Update visual feedback
            container.querySelectorAll('.prefPromptButton').forEach(btn => {
                btn.classList.remove('selected');
                btn.style.backgroundColor = '#e74c3c';
            });
            button.classList.add('selected');
            button.style.backgroundColor = '#2ecc71';
        });
        
        container.appendChild(button);
    });

    // Add the + button
    const addButton = document.createElement('button');
    addButton.className = 'outline add-prompt-button';
    addButton.id = 'addPrompt';
    addButton.innerHTML = '<span>+</span>';
    container.appendChild(addButton);
};

const openChatBots = async (query) => {
    if (!query) return;
    
    let finalQuery = query;  // Start with the user's query

    // Build the complete query only once
    let completeQuery = '';

    // Add category if selected (at the top)
    if (selectedCategory) {
        completeQuery += `[Category: ${selectedCategory}]\n`;
    }

    // Add pre-prompt if selected
    if (defaultPrompt !== -1 && predefinedPrompts[defaultPrompt]) {
        completeQuery += predefinedPrompts[defaultPrompt].prompt + "\n\n";
    }

    // Add the user's query at the end
    completeQuery += finalQuery;

    try {
        const encodedQuery = encodeURIComponent(completeQuery);
        const botLinks = getBots(encodedQuery);
        const bots = filterEnabledBots(botLinks, selectedModels);

        if (Object.keys(bots).length === 0) {
            console.warn("No enabled bots found");
            showWarning("Please select at least one AI Assistant");
            return;
        }

        if (Object.prototype.hasOwnProperty.call(chrome, "storage")) {
            await chrome.runtime.sendMessage({
                action: "sendQueryToAssistants",
                query: completeQuery,  // Send the complete query with everything included
                originalQuery: query,   // Send the original query separately if needed
                links: bots,
                minTitle: query.substring(0, 50)
            });
        } else {
            bots.forEach(bot => window.open(bot, "_blank"));
        }
    } catch (error) {
        console.error("Error opening chatbots:", error);
        showWarning("An error occurred while opening chatbots. Please try again.");
    }
};

document.querySelector("#savePrompt").addEventListener("click", (event) => handleModalOpen(event));

document.querySelector("#deletePrompt").addEventListener("click", (event) => handleModalOpen(event));

function moveElementUp(array, index) {
    if (index < 0 || index >= array.length)
        throw new Error("Index out of bounds");

    const newIndex = (index + 1) % array.length;
    const element = array[index];
    array.splice(index, 1);
    array.splice(newIndex, 0, element);

    return array;
}

function updateGeminiInfo() {
    const geminiInfo = document.querySelector("#geminiInfo");
    if (geminiInfo) {
        const geminiEnabled = document.querySelector(".chat_button[value='Gemini']:not(.disabled)");
        geminiInfo.style.display = geminiEnabled ? "block" : "none";
    }
}

function showWarning(message) {
    // Remove any existing warning
    const existingWarning = document.querySelector('.warning-message');
    if (existingWarning) {
        existingWarning.remove();
    }

    // Create warning element
    const warning = document.createElement('div');
    warning.className = 'warning-message';
    warning.textContent = message;

    // Insert warning after the textarea
    const textarea = document.querySelector('#query');
    textarea.parentNode.insertBefore(warning, textarea.nextSibling);

    // Remove warning after 3 seconds
    setTimeout(() => {
        warning.remove();
    }, 3000);
}

function validateBotUrl(url) {
    // If URL starts with @, it's a direct URL
    if (url.startsWith('@')) {
        url = url.substring(1);
    }

    // Check if URL is valid
    try {
        // Add https:// if protocol is missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        new URL(url);

        // Handle DeepSeek URL format
        if (url.includes("chat.deepseek.com")) {
            // Extract base URL up to /chat/
            const baseUrl = url.split('/chat/')[0] + '/chat/';
            return baseUrl + '?q={prompt}';
        } else {
            // For other bots
            if (!url.includes("{prompt}")) {
                url = url + (url.includes("?") ? "&q={prompt}" : "?q={prompt}");
            }
        }
        return url;
    } catch (error) {
        console.error("Invalid URL:", error);
        showWarning("Please enter a valid URL");
        return false;
    }
}

// Define the filterEnabledBots function
function filterEnabledBots(botLinks, selectedModels) {
    console.log("Selected Models:", selectedModels);
    console.log("Bot Links:", botLinks);
    
    const enabledBots = {};
    for (const bot in botLinks) {
        console.log("Checking bot:", bot);
        
        // Only check if the bot is selected, don't check state
        if (selectedModels.includes(bot)) {
            enabledBots[bot] = botLinks[bot].link;
            console.log(`Enabled bot ${bot} with link ${botLinks[bot].link}`);
        }
    }
    
    console.log("Enabled Bots:", enabledBots);
    return enabledBots;
}

// Add save handler for new prompts
document.querySelector("#saveNewPrompt").addEventListener("click", () => {
    const title = document.querySelector("#newPromptTitle").value.trim();
    const prompt = document.querySelector("#newPromptText").value.trim();
    
    if (!title || !prompt) {
        showWarning("Please enter both title and prompt");
        return;
    }
    
    // Add new prompt to the beginning of the array
    predefinedPrompts = [{ title, prompt }, ...predefinedPrompts];
    storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
    
    // Clear inputs
    document.querySelector("#newPromptTitle").value = "";
    document.querySelector("#newPromptText").value = "";
    
    // Close modal
    const event = { 
        preventDefault: () => {},
        currentTarget: { dataset: { target: "add-prompt-modal" } }
    };
    handleModalOpen(event);
    
    // Refresh buttons
    addPredefinedButtons();
});

// Add this function to handle draggable modals
function makeDraggable(modal) {
    const article = modal.querySelector('article');
    const header = article.querySelector('header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    function dragStart(e) {
        if (e.type === "touchstart") {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }

        if (e.target.closest('header')) {
            isDragging = true;
        }
    }

    function dragEnd() {
        isDragging = false;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, article);
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    header.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);
}

// Initialize draggable for all modals
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('dialog');
    modals.forEach(modal => {
        // Reset position when modal is closed
        modal.addEventListener('close', () => {
            const article = modal.querySelector('article');
            article.style.transform = 'translate(0, 0)';
        });
    });
});

function handleModalOpen(event) {
    const modal = document.getElementById(event.currentTarget.dataset.target);
    if (!modal) return;

    if (modal.id === 'add-prompt-modal') {
        const inputs = modal.querySelectorAll('input, textarea');
        inputs.forEach(input => input.value = '');
    }
    
    modal.showModal();
    modal.style.transform = 'translate(-50%, -50%)';
}

// Update the close button behavior
document.addEventListener('click', (e) => {
    if (e.target.matches('.modal-close-btn') || e.target.matches('.closeEvent')) {
        e.preventDefault();
        e.stopPropagation();
        const modal = e.target.closest('dialog');
        if (modal) {
            // Clear inputs for add-prompt-modal
            if (modal.id === 'add-prompt-modal') {
                const inputs = modal.querySelectorAll('input, textarea');
                inputs.forEach(input => input.value = '');
            }
            
            // Properly close the modal
            modal.close();
            
            // Reset any modal-related states
            document.body.style.pointerEvents = 'auto';
            document.body.style.overflow = 'auto';
            
            // Remove any backdrop or overlay
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    }
});

// Also update the dialog close event listener
document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
        // Reset modal and page state when dialog closes
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        
        // Reset dialog position
        dialog.style.transform = '';
        
        // Reset article transform if it exists
        const article = dialog.querySelector('article');
        if (article) {
            article.style.transform = '';
        }
    });
});

// Add this function to fetch and display username
async function displayWelcomeMessage() {
    try {
        // Get the current Chrome profile info
        const profileInfo = await chrome.storage.sync.get(['profileInfo']);
        let profileName = 'User';
        
        // Try to get the profile name from Chrome
        try {
            const windows = await chrome.windows.getCurrent();
            if (windows) {
                const tabs = await chrome.tabs.query({ active: true, windowId: windows.id });
                if (tabs && tabs[0]) {
                    profileName = tabs[0].incognito ? 'Incognito' : profileInfo?.profileInfo?.name || 'Default';
                }
            }
        } catch (error) {
            console.error('Error getting profile name:', error);
        }
        
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${profileName}!`;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}
// Add ARIA roles and labels
document.querySelectorAll(".chat_button").forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", `Enable/disable ${button.value} bot`);
});

document.querySelectorAll(".predefined-prompt-btn").forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", `Select ${button.textContent} prompt`);
});

// Session Management
const initSessionManagement = () => {
    const createSessionBtn = document.getElementById('createSession');
    const exportTxtBtn = document.getElementById('exportTxt');
    const exportPdfBtn = document.getElementById('exportPdf');
    
    // Create new session
    createSessionBtn.addEventListener('click', async () => {
        const name = document.getElementById('sessionName').value;
        const category = document.getElementById('sessionCategory').value;
        
        if (!name) {
            showWarning('Please enter a session name');
            return;
        }
        
        const session = {
            id: Date.now(),
            name,
            category,
            date: new Date().toISOString(),
            queries: [],
            responses: []
        };
        
        try {
            // Save session to storage
            const data = await storage();
            const sessions = data.sessions ? JSON.parse(data.sessions) : [];
            sessions.push(session);
            await storageSet({ 'sessions': JSON.stringify(sessions) });
            
            // Update both the session list and select dropdown
            await updateSessionList();
            await updateSessionSelect();
            
            // Clear the input fields
            document.getElementById('sessionName').value = '';
            document.getElementById('sessionCategory').value = '';
            
            // Show success message
            showWarning('Session created successfully');
            
            // Optionally, select the newly created session in the dropdown
            const sessionSelect = document.getElementById('sessionSelect');
            sessionSelect.value = session.id;
        } catch (error) {
            console.error('Error creating session:', error);
            showWarning('Failed to create session');
        }
    });
    
    // Export as TXT
    exportTxtBtn.addEventListener('click', () => {
        const text = document.querySelector('#query').value;
        if (!text) {
            showWarning('No content to export');
            return;
        }
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    // Export as PDF (requires jsPDF)
    exportPdfBtn.addEventListener('click', () => {
        const text = document.querySelector('#query').value;
        if (!text) {
            showWarning('No content to export');
            return;
        }
        
        // You'll need to add jsPDF library to implement PDF export
        // This is a placeholder for PDF export functionality
        showWarning('PDF export coming soon!');
    });
};

// Update session list
const updateSessionList = async () => {
    const sessionList = document.getElementById('sessionList');
    const data = await storage();
    const sessions = data.sessions ? JSON.parse(data.sessions) : [];
    
    sessionList.innerHTML = sessions.map(session => `
        <div class="session-item">
            <div class="session-info">
                <div class="session-name">${session.name}</div>
                <div class="session-date">${new Date(session.date).toLocaleDateString()}</div>
            </div>
            <div class="session-actions">
                <button class="outline" onclick="loadSession(${session.id})">Load</button>
                <button class="outline" onclick="deleteSession(${session.id})">Delete</button>
            </div>
        </div>
    `).join('');
};

// Initialize session management
document.addEventListener('DOMContentLoaded', () => {
    initSessionManagement();
    updateSessionList();
});

// Update the start session button handler
document.getElementById('startSession').addEventListener('click', async () => {
    const sessionSelect = document.getElementById('sessionSelect');
    if (!sessionSelect.value) {
        showWarning('Please select a session before starting');
        return;
    }
    
    // Start the selected session
    const data = await storage();
    const sessions = data.sessions ? JSON.parse(data.sessions) : [];
    const selectedSession = sessions.find(s => s.id.toString() === sessionSelect.value);
    
    if (selectedSession) {
        // Set as current session
        await storageSet({ 'currentSession': JSON.stringify(selectedSession) });
        showWarning('Session started successfully');
    }
});

// Initialize session select
document.addEventListener('DOMContentLoaded', async () => {
    await updateSessionSelect();
    // ... rest of your DOMContentLoaded code
});

// Update session select when sessions change
const updateSession = async (session) => {
    const data = await storage();
    const sessions = data.sessions ? JSON.parse(data.sessions) : [];
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index !== -1) {
        sessions[index] = session;
    } else {
        sessions.push(session);
    }
    
    await storageSet({ 'sessions': JSON.stringify(sessions) });
    await updateSessionSelect();
};

// Add this to handle continuous chat
const handleContinuousChat = async () => {
    const data = await storage();
    const useContinuousChat = data.continuousChat || false;
    
    if (useContinuousChat) {
        // Logic for continuous chat
        console.log('Using continuous chat');
    } else {
        // Logic for new chat windows
        console.log('Using new chat windows');
    }
};

const getBots = (prompt, getDefault) => {
    if (prompt === undefined) prompt = "{prompt}";
    const botList = storageGet("botList");
    if (botList && getDefault === undefined) {
        try {
            const bots = JSON.parse(botList);
            for (const bot of Object.keys(bots))
                bots[bot].link = bots[bot].link.replace("{prompt}", prompt);

            return { ...bots };
        } catch (error) {
            console.error("Error while loading botList from storage:", error);
        }
    }
    return {
        "ChatGPT": { "state": "enabled", "link": `https://www.chatgpt.com/?q=${prompt}` },
        "Claude": { "state": "enabled", "link": `https://claude.ai/new?q=${prompt}` },
        "Gemini": { "state": "enabled", "link": `https://gemini.google.com/app?q=${prompt}` },
        "Mistral": { "state": "enabled", "link": `https://chat.mistral.ai/chat?q=${prompt}` },
        "Perplexity": { "state": "enabled", "link": `https://www.perplexity.ai/search/new?q=${prompt}` },
        "Bing": { "state": "enabled", "link": `https://www.bing.com/chat?q=${prompt}&sendquery=1&FORM=SCCODX` },
        "DeepSeek": { "state": "enabled", "link": `https://chat.deepseek.com/?q=${prompt}` }
    };
};

document.addEventListener('DOMContentLoaded', function() {
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            deactivateAllTabs();
            activateTab(this.id); // Assuming each tab has a unique ID
        });
    });
});

function deactivateAllTabs() {
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function(tab) {
        tab.classList.remove('active');
        // Additional code to close the tab content
    });
}

function activateTab(tabId) {
    var tab = document.getElementById(tabId);
    tab.classList.add('active');
    // Additional code to open the tab content
}

// Add this code to initialize the model buttons and store the selected models
document.addEventListener('DOMContentLoaded', function() {
    const modelButtons = document.querySelectorAll('.model-button');
    
    // Load selected models from storage
    chrome.storage.local.get('selectedModels', function(result) {
        selectedModels = result.selectedModels || [];
        console.log("Loaded selected models:", selectedModels);
        
        // Set the initial state of the buttons based on the stored selected models
        modelButtons.forEach(function(button) {
            console.log("Button value:", button.value);
            const isSelected = selectedModels.includes(button.value);
            button.classList.toggle('selected', isSelected);
            button.style.backgroundColor = isSelected ? '#2ecc71' : '#e74c3c';
        });
    });
    
    // Update selected models whenever a button is clicked
    modelButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const modelName = this.value;
            const index = selectedModels.indexOf(modelName);
            
            if (index > -1) {
                selectedModels.splice(index, 1);
                this.classList.remove('selected');
                this.style.backgroundColor = '#e74c3c'; // Set to red when not selected
            } else {
                selectedModels.push(modelName);
                this.classList.add('selected');
                this.style.backgroundColor = '#2ecc71'; // Set to green when selected
            }
            
            console.log("Updated selected models:", selectedModels);
            // Store the updated selected models
            chrome.storage.local.set({ 'selectedModels': selectedModels });
        });
    });
});

// Add this function to initialize pre-prompts
const initPredefinedPrompts = async () => {
    try {
        const data = await storage();
        if (!data.predefinedPrompts) {
            // If no prompts exist in storage, use default prompts
            predefinedPrompts = [...defaultPrompts];
            await storageSet({ "predefinedPrompts": JSON.stringify(predefinedPrompts) });
        } else {
            predefinedPrompts = JSON.parse(data.predefinedPrompts);
        }
        addPredefinedButtons();
    } catch (error) {
        console.error('Error initializing predefined prompts:', error);
        // Fallback to default prompts if there's an error
        predefinedPrompts = [...defaultPrompts];
        addPredefinedButtons();
    }
};

// Function to handle pre-prompt button clicks
function handlePrePromptClick(promptText) {
    currentPrePrompt = promptText;
    // Highlight the selected button (you may want to add UI feedback)
    updateButtonStyles();
}

// Function to update button styles based on selection
function updateButtonStyles() {
    const buttons = document.querySelectorAll('.pre-prompt-button');
    buttons.forEach(button => {
        if (button.getAttribute('data-prompt') === currentPrePrompt) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
}

// Function to submit the prompt
async function submitPrompt(input) {
    console.log("submitPrompt called with input:", input);
    console.log("currentPrePrompt:", currentPrePrompt);
    
    debugger; // Pause execution here for debugging
    
    if (currentPrePrompt && !input.includes(currentPrePrompt)) {
        console.log("Adding pre-prompt to input");
        const fullPrompt = `${currentPrePrompt}\n\n${input}`;
        currentPrePrompt = null;
        updateButtonStyles();
        return fullPrompt;
    }
    return input;
}
