let isRecording = false;
let recordedActions = [];
let isReplaying = false;
let replayTabId = null;
let currentlyPlayingRecording = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log('Message received in background:', message);
	
	if (message.command === "startRecording") {
		isRecording = true;
		recordedActions = [];
		chrome.tabs.sendMessage(sender.tab.id, {command: "startRecording"}).catch(console.error);
	} else if (message.command === "stopRecording") {
		isRecording = false;
		chrome.tabs.sendMessage(sender.tab.id, {command: "stopRecording"}).catch(console.error);
	} else if (message.type === "action" && isRecording) {
		recordedActions.push(message.action);
		// Send the action to the drawer for display
		chrome.tabs.sendMessage(sender.tab.id, {type: "action", action: message.action}).catch(console.error);
	} else if (message.command === "replayRecording") {
		isReplaying = true;
		replayTabId = sender.tab.id;
		currentlyPlayingRecording = message.name;
		const { actions } = message.recording;
		const speed = message.speed || 1;
		replayActions(sender.tab.id, actions, speed);
		// Notify drawer about the currently playing recording
		chrome.tabs.sendMessage(sender.tab.id, {command: "updatePlayingRecording", name: currentlyPlayingRecording}).catch(console.error);
	} else if (message.command === "stopReplay") {
		isReplaying = false;
		replayTabId = null;
		currentlyPlayingRecording = null;
		// Notify drawer that replay has stopped
		chrome.tabs.sendMessage(sender.tab.id, {command: "updatePlayingRecording", name: null}).catch(console.error);
	} else if (message.command === "saveRecording") {
		console.log('Saving recording:', message.name);
		console.log('Actions to save:', message.actions);
		saveRecording(message.name, message.actions, sender.tab, (result) => {
			console.log('Save recording result:', result);
			sendResponse(result);
		});
		return true; // Indicates that the response is asynchronous
	} else if (message.command === "deleteRecording") {
		deleteRecording(message.name, sendResponse);
		return true; // Indicates that the response is asynchronous
	} else if (message.command === "captureScreenshot") {
		chrome.tabs.captureVisibleTab(null, {format: 'png'}, (dataUrl) => {
			if (chrome.runtime.lastError) {
				console.error('Error capturing screenshot:', chrome.runtime.lastError);
				sendResponse({error: chrome.runtime.lastError.message});
			} else {
				sendResponse({screenshot: dataUrl});
			}
		});
		return true; // Indicates that the response is asynchronous
	}
	
	if (message.command !== "saveRecording" && message.command !== "deleteRecording") {
		sendResponse({status: "processed"});
	}
	return true;
});

function replayActions(tabId, actions, speed) {
	console.log(`Starting to replay ${actions.length} actions at ${speed}x speed:`, actions);
	if (!Array.isArray(actions)) {
		console.error('Actions is not an array:', actions);
		return;
	}
	
	let actionIndex = 0;
	
	function performNextAction() {
		if (actionIndex < actions.length && isReplaying && tabId === replayTabId) {
			console.log(`Replaying action ${actionIndex + 1}/${actions.length}:`, actions[actionIndex]);
			chrome.tabs.sendMessage(tabId, {command: "replay", action: actions[actionIndex]})
				.then((response) => {
					console.log(`Action ${actionIndex + 1} replay response:`, response);
					if (response && response.status === "success") {
						actionIndex++;
						setTimeout(performNextAction, 1000 / speed);
					} else {
						console.warn(`Action ${actionIndex + 1} replay response was not successful:`, response);
						actionIndex++;
						setTimeout(performNextAction, 1000 / speed);
					}
				})
				.catch(error => {
					console.error(`Error replaying action ${actionIndex + 1}:`, error);
					actionIndex++;
					setTimeout(performNextAction, 1000 / speed);
				});
		} else {
			console.log("Replay finished or stopped");
			isReplaying = false;
			replayTabId = null;
			currentlyPlayingRecording = null;
			chrome.tabs.sendMessage(tabId, {command: "updatePlayingRecording", name: null}).catch(console.error);
		}
	}
	
	performNextAction();
}

function saveRecording(name, actions, tab, callback) {
	const url = tab.url;
	console.log(`Saving recording "${name}" with URL: ${url}`);
	const recording = {
		url: url,
		actions: actions
	};
	chrome.storage.local.get({recordings: {}}, (result) => {
		result.recordings[name] = recording;
		chrome.storage.local.set({recordings: result.recordings}, () => {
			if (chrome.runtime.lastError) {
				console.error('Error saving recording:', chrome.runtime.lastError);
				callback({status: "error", error: chrome.runtime.lastError.message});
			} else {
				console.log(`Recording "${name}" saved successfully`);
				callback({status: "saved"});
			}
		});
	});
}

function deleteRecording(name, sendResponse) {
	chrome.storage.local.get({recordings: {}}, (result) => {
		if (result.recordings.hasOwnProperty(name)) {
			delete result.recordings[name];
			chrome.storage.local.set({recordings: result.recordings}, () => {
				sendResponse({status: "deleted"});
			});
		} else {
			sendResponse({status: "error", error: "Recording not found"});
		}
	});
}

chrome.action.onClicked.addListener((tab) => {
	chrome.tabs.sendMessage(tab.id, {command: "toggleDrawer"}).catch(console.error);
});

// We can remove this listener as we're no longer navigating during replay
// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { ... });
