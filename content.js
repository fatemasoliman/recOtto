let recording = false;

function getCssSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;
    return element.tagName.toLowerCase();
}

document.addEventListener('click', (e) => {
    if (recording) {
        const action = { type: 'click', target: getCssSelector(e.target) };
        chrome.runtime.sendMessage({type: "action", action: action});
        console.log("Click action sent:", action);
    }
});

document.addEventListener('input', (e) => {
    if (recording) {
        const action = { type: 'input', target: getCssSelector(e.target), value: e.target.value };
        chrome.runtime.sendMessage({type: "action", action: action});
        console.log("Input action sent:", action);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script:", message);
    if (message.command === "startRecording") {
        recording = true;
        console.log("Recording started");
    } else if (message.command === "stopRecording") {
        recording = false;
        console.log("Recording stopped");
    } else if (message.command === "replay") {
        replayActions(message.actions);
    } else if (message.command === "toggleDrawer") {
        toggleDrawer();
    } else if (message.command === "checkContentScriptLoaded") {
        sendResponse({loaded: true});
    }
    return true; // Indicates that the response will be sent asynchronously
});

function replayActions(actions) {
    actions.forEach((action, index) => {
        setTimeout(() => {
            const element = document.querySelector(action.target);
            if (element) {
                switch (action.type) {
                    case 'click':
                        element.click();
                        break;
                    case 'input':
                        element.value = action.value;
                        element.dispatchEvent(new Event('input'));
                        break;
                }
            }
        }, index * 1000);
    });
}

function toggleDrawer() {
    const drawerContainer = document.getElementById('recotto-container');
    if (drawerContainer) {
        const drawer = drawerContainer.shadowRoot.getElementById('recotto-drawer');
        drawer.classList.toggle('open');
    } else {
        console.error('RecOtto drawer not found');
    }
}

console.log("RecOtto content script loaded");