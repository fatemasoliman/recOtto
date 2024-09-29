console.log('Content script loaded');

let recording = false;
let inputDebounceTimer = null;
const DEBOUNCE_DELAY = 500; // 500ms delay

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

function captureInputAction(event) {
    if (!recording) return;

    const target = event.target;

    // Clear any existing timer
    if (inputDebounceTimer) {
        clearTimeout(inputDebounceTimer);
    }

    // Set a new timer
    inputDebounceTimer = setTimeout(() => {
        let value;

        if (target.isContentEditable) {
            value = target.textContent;
        } else if (target.value !== undefined) {
            value = target.value;
        } else {
            value = target.textContent;
        }

        const action = {
            type: 'input',
            target: getCssSelector(target),
            value: value
        };

        safeSendMessage({type: "action", action: action});
        console.log("Input action recorded:", action);
    }, DEBOUNCE_DELAY);
}

// Modify the existing input event listener
document.removeEventListener('input', captureInputAction);
document.addEventListener('input', captureInputAction);

// Modify the blur event listener to clear the timer and capture immediately
document.addEventListener('blur', (event) => {
    if (recording && (event.target.isContentEditable || event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
        if (inputDebounceTimer) {
            clearTimeout(inputDebounceTimer);
        }
        captureInputAction(event);
    }
}, true);

document.addEventListener('click', (e) => {
    if (recording) {
        const action = { type: 'click', target: getCssSelector(e.target) };
        safeSendMessage({type: "action", action: action});
        console.log("Click action recorded:", action);
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
        let element = findElementFuzzy(action.target);

        if (element) {
            console.log("Element found:", element);
            setTimeout(() => {
                switch (action.type) {
                    case 'click':
                        console.log("Performing click on:", element);
                        element.click();
                        highlightElement(element, 'red');
                        resolve({status: "success"});
                        break;
                    case 'input':
                        console.log("Setting input value to:", action.value);
                        if (element.isContentEditable) {
                            element.textContent = action.value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                            element.value = action.value;
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        } else {
                            element.textContent = action.value;
                        }
                        highlightElement(element, 'blue');
                        resolve({status: "success"});
                        break;
                    // ... other cases remain the same
                }
            }, 100);
        } else {
            console.error('Element not found:', action.target);
            reject({status: "error", error: `Element not found: ${action.target}`});
        }
    });
}

function highlightElement(element, color) {
    const originalOutline = element.style.outline;
    element.style.outline = `2px solid ${color}`;
    setTimeout(() => {
        element.style.outline = originalOutline;
    }, 500);
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