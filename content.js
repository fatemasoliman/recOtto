console.log('Content script loaded');

let recording = false;

// Add this debounce function at the beginning of the file
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Keep track of the latest input state for each input
let latestInputStates = {};

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
    let value;

    if (target.isContentEditable) {
        value = target.textContent;
    } else if (target.value !== undefined) {
        value = target.value;
    } else {
        value = target.textContent;
    }

    const inputId = target.id || target.name || getCssSelector(target);
    
    latestInputStates[inputId] = {
        type: 'input',
        target: getCssSelector(target),
        value: value
    };
}

// Create a debounced version of the function that sends the message
const debouncedSendInputAction = debounce((inputId) => {
    const action = latestInputStates[inputId];
    if (action) {
        safeSendMessage({type: "action", action: action});
        console.log("Input action recorded:", action);
        delete latestInputStates[inputId];
    }
}, 1000); // Adjust the debounce delay as needed (e.g., 1000ms = 1 second)

// Modify the input event listener
document.addEventListener('input', (event) => {
    if (recording) {
        captureInputAction(event);
        const inputId = event.target.id || event.target.name || getCssSelector(event.target);
        debouncedSendInputAction(inputId);
    }
});

// Modify the blur event listener
document.addEventListener('blur', (event) => {
    if (recording && (event.target.isContentEditable || event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
        captureInputAction(event);
        const inputId = event.target.id || event.target.name || getCssSelector(event.target);
        debouncedSendInputAction.flush(); // Immediately send the latest state
    }
}, true);

document.addEventListener('click', (e) => {
    if (recording) {
        const action = { type: 'click', target: getCssSelector(e.target) };
        
        // Check if the clicked element is part of a custom dropdown
        const dropdownOption = e.target.closest('[role="option"]');
        if (dropdownOption) {
            action.type = 'select';
            action.value = dropdownOption.textContent.trim();
            
            // Find the parent dropdown container
            const dropdownContainer = dropdownOption.closest('[class*="select"]');
            if (dropdownContainer) {
                action.dropdownSelector = getCssSelector(dropdownContainer);
                
                // Try to get the actual selected value
                const input = dropdownContainer.querySelector('input');
                if (input) {
                    action.value = input.value;
                }
            }
        }
        
        safeSendMessage({type: "action", action: action});
        console.log("Action recorded:", action);
    }
});

// Remove or modify the existing 'change' event listener as it may not be needed for these custom dropdowns

function replayAction(action) {
    return new Promise((resolve, reject) => {
        console.log("Attempting to replay action:", action);
        let element;

        if (action.type === 'select' && action.dropdownSelector) {
            element = findElementFuzzy(action.dropdownSelector);
        } else {
            element = findElementFuzzy(action.target);
        }

        if (element) {
            console.log("Element found:", element);
            setTimeout(() => {
                switch (action.type) {
                    case 'click':
                        console.log("Performing click on:", element);
                        simulateMouseEvents(element, ['mouseover', 'mousedown', 'mouseup', 'click']);
                        highlightElement(element, 'red');
                        resolve({status: "success"});
                        break;
                    case 'select':
                        console.log("Selecting option:", action.value);
                        setReactSelectValue(element, action.value)
                            .then(() => {
                                highlightElement(element, 'green');
                                resolve({status: "success"});
                            })
                            .catch((error) => {
                                console.error('Failed to set dropdown value:', error);
                                reject({status: "error", error: "Failed to set dropdown value"});
                            });
                        break;
                    case 'input':
                        console.log("Setting input value:", action.value);
                        if (element.isContentEditable) {
                            element.textContent = action.value;
                        } else {
                            element.value = action.value;
                        }
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        highlightElement(element, 'blue');
                        resolve({status: "success"});
                        break;
                    default:
                        console.error('Unknown action type:', action.type);
                        reject({status: "error", error: `Unknown action type: ${action.type}`});
                }
            }, 500);
        } else {
            console.error('Element not found:', action.target);
            reject({status: "error", error: `Element not found: ${action.target}`});
        }
    });
}

function setReactSelectValue(selectElement, value) {
    return new Promise((resolve, reject) => {
        console.log("Setting React Select value:", value);

        // Simulate opening the dropdown
        simulateMouseEvents(selectElement, ['mouseover', 'mousedown', 'mouseup', 'click']);

        // Wait for the dropdown to open and options to appear
        waitForOptions(value, 5000)
            .then((option) => {
                console.log("Option found:", option);
                // Simulate hovering over the option
                simulateMouseEvents(option, ['mouseover']);

                // Wait a bit to simulate user decision time
                setTimeout(() => {
                    // Simulate clicking the option
                    simulateMouseEvents(option, ['mousedown', 'mouseup', 'click']);

                    // Wait for the dropdown to close
                    setTimeout(() => {
                        // Verify if the value was set correctly
                        const input = selectElement.querySelector('input');
                        if (input && input.value.trim().toLowerCase() === value.trim().toLowerCase()) {
                            console.log("Value set successfully");
                            resolve();
                        } else {
                            console.error("Failed to set value");
                            reject(new Error('Failed to set dropdown value'));
                        }
                    }, 500);
                }, 200);
            })
            .catch((error) => {
                console.error("Error in setReactSelectValue:", error);
                reject(error);
            });
    });
}

function simulateMouseEvents(element, events) {
    events.forEach(eventType => {
        const rect = element.getBoundingClientRect();
        const event = new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        });
        element.dispatchEvent(event);
    });
}

function waitForOptions(optionValue, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const intervalId = setInterval(() => {
            const options = document.querySelectorAll('[role="option"]');
            for (let option of options) {
                if (option.textContent.trim().toLowerCase().includes(optionValue.toLowerCase())) {
                    clearInterval(intervalId);
                    resolve(option);
                    return;
                }
            }
            if (Date.now() - startTime > timeout) {
                clearInterval(intervalId);
                reject(new Error(`Option "${optionValue}" not found within ${timeout}ms`));
            }
        }, 100);
    });
}

function setValueDirectly(element, value) {
    const input = element.querySelector('input');
    if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        highlightElement(input, 'yellow');
    } else {
        console.error("Couldn't find input element to set value directly");
    }
}

// Add this new function to wait for an element to appear in the DOM
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const intervalId = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(intervalId);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(intervalId);
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }
        }, 100);
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
