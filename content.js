console.log('Content script loaded');

let recording = false;

function getCssSelector(element) {
    let path = [];
    while (element.nodeType === Node.ELEMENT_NODE) {
        let selector = element.nodeName.toLowerCase();
        if (element.id) {
            selector += '#' + element.id;
            path.unshift(selector);
            break;
        } else {
            let sibling = element;
            let nth = 1;
            while (sibling = sibling.previousElementSibling) {
                if (sibling.nodeName.toLowerCase() == selector)
                    nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type("+nth+")";
        }
        path.unshift(selector);
        element = element.parentNode;
    }
    return path.join(" > ");
}

document.addEventListener('click', (e) => {
    if (recording) {
        const action = { type: 'click', target: getCssSelector(e.target) };
        safeSendMessage({type: "action", action: action});
        console.log("Click action recorded:", action);
    }
});

document.addEventListener('input', (e) => {
    if (recording) {
        const action = { type: 'input', target: getCssSelector(e.target), value: e.target.value };
        safeSendMessage({type: "action", action: action});
        console.log("Input action recorded:", action);
    }
});

document.addEventListener('change', (e) => {
    if (recording) {
        if (e.target.tagName === 'SELECT') {
            const action = { type: 'select', target: getCssSelector(e.target), value: e.target.value };
            safeSendMessage({type: "action", action: action});
            console.log("Select action recorded:", action);
        } else {
            // For custom dropdowns, we might need to capture the selected text
            const selectedOption = e.target.querySelector('.selected') || e.target;
            const action = { type: 'select', target: getCssSelector(e.target), value: selectedOption.textContent.trim() };
            safeSendMessage({type: "action", action: action});
            console.log("Custom select action recorded:", action);
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script:", message);
    if (message.command === "startRecording") {
        recording = true;
        console.log("Recording started");
        sendResponse({status: "success"});
    } else if (message.command === "stopRecording") {
        recording = false;
        console.log("Recording stopped");
        sendResponse({status: "success"});
    } else if (message.command === "replay") {
        console.log("Replaying action:", message.action);
        replayAction(message.action)
            .then(() => {
                console.log("Action replayed successfully");
                sendResponse({status: "success"});
            })
            .catch((error) => {
                console.error("Error replaying action:", error);
                sendResponse({status: "error", error: error.message});
            });
        return true; // Indicates that the response is asynchronous
    } else if (message.command === "toggleDrawer") {
        console.log("Toggling drawer");
        toggleDrawer();
        sendResponse({status: "success"});
    } else if (message.command === "stopReplay") {
        console.log("Stopping replay");
        sendResponse({status: "success"});
    }
    return true; // This line is important for asynchronous response
});

function toggleDrawer() {
    const drawerContainer = document.getElementById('recotto-drawer-container');
    if (drawerContainer) {
        const drawer = drawerContainer.shadowRoot.getElementById('recotto-drawer');
        if (drawer) {
            console.log("Drawer found, toggling class");
            drawer.classList.toggle('open');
            console.log("Drawer is open:", drawer.classList.contains('open'));
        } else {
            console.error("Drawer element not found in shadow root");
        }
    } else {
        console.error("Drawer container not found");
    }
}

function replayAction(action) {
    return new Promise((resolve, reject) => {
        console.log("Attempting to replay action:", action);
        let element;

        if (action.target === '.') {
            element = document.body;
        } else {
            element = findElementFuzzy(action.target);
        }

        if (element) {
            console.log("Element found:", element);
            setTimeout(() => {
                switch (action.type) {
                    case 'click':
                        console.log("Performing click on:", element);
                        element.click();
                        element.style.outline = '2px solid red';
                        setTimeout(() => {
                            element.style.outline = '';
                        }, 500);
                        resolve({status: "success"});
                        break;
                    case 'input':
                        if (element.tagName === 'DIV' && element.querySelector('input')) {
                            element = element.querySelector('input');
                        }
                        console.log("Setting input value to:", action.value);
                        element.value = action.value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.style.outline = '2px solid blue';
                        setTimeout(() => {
                            element.style.outline = '';
                        }, 500);
                        resolve({status: "success"});
                        break;
                    case 'select':
                        console.log("Attempting to select:", action.value);
                        if (element.tagName === 'SELECT') {
                            element.value = action.value;
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            resolve({status: "success"});
                        } else {
                            element.click(); // Open the dropdown
                            setTimeout(() => {
                                const options = Array.from(document.querySelectorAll('*')).filter(el => 
                                    el.textContent.trim() === action.value && 
                                    (el.offsetWidth > 0 || el.offsetHeight > 0)
                                );
                                console.log("Found potential options:", options);
                                if (options.length > 0) {
                                    options[0].click();
                                    console.log("Clicked option:", options[0]);
                                    element.style.outline = '2px solid green';
                                    setTimeout(() => {
                                        element.style.outline = '';
                                    }, 500);
                                    resolve({status: "success"});
                                } else {
                                    console.error('Option not found:', action.value);
                                    reject({status: "error", error: `Option not found: ${action.value}`});
                                }
                            }, 500);
                        }
                        break;
                    default:
                        console.warn("Unknown action type:", action.type);
                        reject({status: "error", error: `Unknown action type: ${action.type}`});
                }
            }, 100);
        } else {
            console.error('Element not found:', action.target);
            reject({status: "error", error: `Element not found: ${action.target}`});
        }
    });
}

function findElementFuzzy(selector) {
    console.log("Searching for element:", selector);
    // Try exact match first
    let element = document.querySelector(selector);
    if (element) {
        console.log("Exact match found:", element);
        return element;
    }

    // If not found, try fuzzy matching
    const allElements = document.querySelectorAll('*');
    let bestMatch = null;
    let highestScore = 0;

    allElements.forEach(el => {
        const score = calculateSimilarity(getElementIdentifiers(el), selector);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = el;
        }
    });

    if (bestMatch) {
        console.log(`Fuzzy match found for "${selector}":`, bestMatch, "with score:", highestScore);
    } else {
        console.log(`No match found for "${selector}"`);
    }

    return bestMatch;
}

function getElementIdentifiers(element) {
    return [
        element.id,
        element.name,
        element.className,
        element.tagName.toLowerCase(),
        element.getAttribute('data-testid'),
        ...Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`)
    ].filter(Boolean).join(' ');
}

function calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/\W+/));
    const set2 = new Set(str2.toLowerCase().split(/\W+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    return intersection.size / Math.max(set1.size, set2.size);
}

function injectStyles() {
    const link = document.createElement('link');
    link.href = chrome.runtime.getURL('styles.css');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.id = 'recotto-styles';
    document.head.appendChild(link);
}

function removeStyles() {
    const existingLink = document.getElementById('recotto-styles');
    if (existingLink) {
        existingLink.remove();
    }
}

// Call injectStyles when you show your extension's UI
// Call removeStyles when you hide your extension's UI

console.log("RecOtto content script fully loaded and initialized");

// Add this function to handle page unload
window.addEventListener('beforeunload', () => {
    try {
        chrome.runtime.sendMessage({command: "stopReplay"});
    } catch (error) {
        console.log("Failed to send stopReplay message, extension context may be invalid:", error);
    }
});

// Add a new function to safely send messages
function safeSendMessage(message) {
    try {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                console.log("Failed to send message:", chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.log("Failed to send message, extension context may be invalid:", error);
    }
}