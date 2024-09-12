let currentActions = [];
let isRecording = false;
let recordings = {};

function createDrawer() {
  fetch(chrome.runtime.getURL('drawer.html'))
    .then(response => response.text())
    .then(data => {
      const drawerContainer = document.createElement('div');
      drawerContainer.id = 'recotto-container';
      drawerContainer.attachShadow({ mode: 'open' });
      document.body.appendChild(drawerContainer);
      drawerContainer.shadowRoot.innerHTML = data;
      injectStyles(drawerContainer.shadowRoot);
      initializeDrawer(drawerContainer.shadowRoot);
    });
}

function injectStyles(shadowRoot) {
  fetch(chrome.runtime.getURL('styles.css'))
    .then(response => response.text())
    .then(css => {
      const styleElement = document.createElement('style');
      styleElement.textContent = css;
      shadowRoot.appendChild(styleElement);
    });
}

function initializeDrawer(shadowRoot) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  const handle = drawer.querySelector('.recotto-drawer-handle');

  handle.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  shadowRoot.getElementById('startRecord').addEventListener('click', startRecording);
  shadowRoot.getElementById('stopRecord').addEventListener('click', stopRecording);
  shadowRoot.getElementById('saveRecordingBtn').addEventListener('click', saveRecording);

  updateUI(shadowRoot);
  loadSavedRecordings(shadowRoot);
}

function updateUI(shadowRoot) {
  const startBtn = shadowRoot.getElementById('startRecord');
  const stopBtn = shadowRoot.getElementById('stopRecord');
  const saveRecordingDiv = shadowRoot.getElementById('saveRecording');

  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  saveRecordingDiv.style.display = isRecording ? 'none' : 'block';

  if (isRecording) {
    startBtn.classList.add('recording');
    stopBtn.classList.remove('recording');
  } else {
    startBtn.classList.remove('recording');
    stopBtn.classList.add('recording');
  }
}

function updateRecordingsList(shadowRoot) {
  const recordingsList = shadowRoot.getElementById('recordingsList');
  recordingsList.innerHTML = '';
  
  for (const [name, actions] of Object.entries(recordings)) {
    const recordingDiv = document.createElement('div');
    recordingDiv.className = 'recording';
    
    const chevronIcon = document.createElement('span');
    chevronIcon.innerHTML = '&#9656;'; // Unicode for right-pointing triangle
    chevronIcon.className = 'chevron-icon';
    chevronIcon.addEventListener('click', () => {
      chevronIcon.innerHTML = chevronIcon.innerHTML === '&#9656;' ? '&#9662;' : '&#9656;';
      actionsList.classList.toggle('hidden');
    });
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.className = 'recording-name';
    nameSpan.addEventListener('click', () => replayActions(actions));
    
    const actionsList = document.createElement('ul');
    actionsList.className = 'actions-list hidden';
    actions.forEach(action => {
      const li = document.createElement('li');
      li.textContent = `${action.type}: ${action.target}`;
      actionsList.appendChild(li);
    });
    
    recordingDiv.appendChild(chevronIcon);
    recordingDiv.appendChild(nameSpan);
    recordingDiv.appendChild(actionsList);
    recordingsList.appendChild(recordingDiv);
  }
}

function startRecording() {
  chrome.runtime.sendMessage({command: "startRecording"});
  isRecording = true;
  currentActions = [];
  updateUI(document.getElementById('recotto-container').shadowRoot);
}

function stopRecording() {
  chrome.runtime.sendMessage({command: "stopRecording"});
  isRecording = false;
  const shadowRoot = document.getElementById('recotto-container').shadowRoot;
  updateUI(shadowRoot);
  shadowRoot.getElementById('saveRecording').style.display = 'block';
  console.log("Stop recording clicked, currentActions:", currentActions);
}

function saveRecording() {
  const shadowRoot = document.getElementById('recotto-container').shadowRoot;
  const name = shadowRoot.getElementById('recordingName').value;
  if (name) {
    recordings[name] = currentActions;
    chrome.storage.local.set({recordings: recordings}, () => {
      console.log("Recording saved:", name, currentActions);
    });
    updateRecordingsList(shadowRoot);
    shadowRoot.getElementById('recordingName').value = '';
    shadowRoot.getElementById('saveRecording').style.display = 'none';
  }
}

function replayActions(actions) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {command: "replay", actions: actions});
  });
}

function loadSavedRecordings(shadowRoot) {
  chrome.storage.local.get(['recordings', 'isRecording'], function(result) {
    if (result.recordings) {
      recordings = result.recordings;
      updateRecordingsList(shadowRoot);
    }
    if (result.isRecording !== undefined) {
      isRecording = result.isRecording;
      updateUI(shadowRoot);
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const shadowRoot = document.getElementById('recotto-container').shadowRoot;
  if (message.type === "action") {
    currentActions.push(message.action);
    console.log("Action received:", message.action);
  } else if (message.type === "recordingStatus") {
    isRecording = message.isRecording;
    updateUI(shadowRoot);
  }
});

createDrawer();