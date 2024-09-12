let actions = [];
let isRecording = false;

function updateUI() {
    document.getElementById('startRecord').disabled = isRecording;
    document.getElementById('stopRecord').disabled = !isRecording;
}

function updateActionList() {
    const actionList = document.getElementById('actionList');
    actionList.innerHTML = actions.map(action => `<div>${action.type}: ${action.target}</div>`).join('');
}

document.getElementById('startRecord').addEventListener('click', () => {
    chrome.runtime.sendMessage({command: "startRecording"});
    isRecording = true;
    updateUI();
});

document.getElementById('stopRecord').addEventListener('click', () => {
    chrome.runtime.sendMessage({command: "stopRecording"});
    isRecording = false;
    updateUI();
});

document.getElementById('replay').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {command: "replay", actions: actions});
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "action") {
        actions.push(message.action);
        updateActionList();
    } else if (message.type === "recordingStatus") {
        isRecording = message.isRecording;
        updateUI();
    }
});

// Initialize UI
updateUI();

// Load saved actions and recording status
chrome.storage.local.get(['actions', 'isRecording'], function(result) {
    if (result.actions) {
        actions = result.actions;
        updateActionList();
    }
    if (result.isRecording !== undefined) {
        isRecording = result.isRecording;
        updateUI();
    }
});

// Request current recording status when popup opens
chrome.runtime.sendMessage({command: "getRecordingStatus"});