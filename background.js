let isRecording = false;

function updateRecordingStatus(status) {
    isRecording = status;
    chrome.storage.local.set({isRecording: status});
    sendMessageToActiveTab({type: "recordingStatus", isRecording: status});
}

function sendMessageToActiveTab(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                }
            });
        }
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "startRecording") {
        updateRecordingStatus(true);
        sendMessageToActiveTab({command: "startRecording"});
    } else if (message.command === "stopRecording") {
        updateRecordingStatus(false);
        sendMessageToActiveTab({command: "stopRecording"});
    } else if (message.type === "action" && isRecording) {
        sendMessageToActiveTab(message);
    } else if (message.command === "getRecordingStatus") {
        sendResponse({isRecording: isRecording});
    }
});

// Listen for tab changes to update recording state
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.sendMessage(activeInfo.tabId, {command: isRecording ? "startRecording" : "stopRecording"}, function(response) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
});

// Listen for tab updates to ensure content script is loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, {command: "checkContentScriptLoaded"}, function(response) {
            if (chrome.runtime.lastError) {
                console.log("Content script not yet loaded for tab " + tabId);
            } else {
                console.log("Content script loaded for tab " + tabId);
                // Send initial recording state
                chrome.tabs.sendMessage(tabId, {command: isRecording ? "startRecording" : "stopRecording"});
            }
        });
    }
});

// Initialize recording status from storage
chrome.storage.local.get(['isRecording'], function(result) {
    if (result.isRecording !== undefined) {
        isRecording = result.isRecording;
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, {command: "toggleDrawer"}, function(response) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
});