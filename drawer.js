let isRecording = false;
let currentActions = [];
let currentlyPlayingRecording = null;

function createDrawer() {
  const drawerContainer = document.createElement('div');
  drawerContainer.id = 'recotto-drawer-container';
  drawerContainer.style.cssText = 'position: fixed; top: 0; right: 0; bottom: 0; left: auto; width: 0; height: 0; z-index: 2147483647;';
  document.body.appendChild(drawerContainer);

  const shadowRoot = drawerContainer.attachShadow({mode: 'open'});

  const drawerHTML = `
    <div id="recotto-drawer" class="compact">
      <div class="drawer-content">
        <button id="startRecording" class="action-button start-btn" title="Start Recording">▶</button>
        <button id="stopRecording" class="action-button stop-btn" style="display: none;" title="Stop Recording">■</button>
        <button id="expandDrawer" class="action-button expand-btn" title="Expand">≡</button>
      </div>
      <div class="expanded-content">
        <div id="saveRecording" style="display: none;">
          <input type="text" id="recordingName" placeholder="Enter recording name">
          <button id="saveRecordingBtn">Save</button>
        </div>
        <div id="recordingsList"></div>
      </div>
    </div>
  `;

  shadowRoot.innerHTML = drawerHTML;
  injectStyles(shadowRoot);
  initializeDrawer(shadowRoot);
}

function injectStyles(shadowRoot) {
  const style = document.createElement('style');
  style.textContent = `
    #recotto-drawer {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 50px;
      background-color: #f8f9fa;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease-in-out;
      z-index: 2147483647;
      border-radius: 25px 0 0 25px;
      overflow: hidden;
      font-family: Arial, sans-serif;
    }

    #recotto-drawer.expanded {
      width: 250px;
      height: 70vh;
      transform: translateY(-35%);
    }

    .drawer-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
    }

    .action-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      margin: 5px 0;
      cursor: pointer;
      font-size: 18px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .start-btn { background-color: #28a745; }
    .stop-btn { background-color: #dc3545; }
    .expand-btn { background-color: #007bff; }

    .action-button:hover { transform: scale(1.1); }

    .expanded-content {
      display: none;
      padding: 15px;
      height: calc(100% - 30px);
      overflow-y: auto;
    }

    #recotto-drawer.expanded .expanded-content { display: block; }
    #recotto-drawer.expanded .drawer-content { flex-direction: row; justify-content: space-around; }

    #saveRecording {
      margin-top: 10px;
      display: flex;
      gap: 5px;
    }

    #recordingName {
      flex-grow: 1;
      padding: 5px;
      border: 1px solid #ced4da;
      border-radius: 3px;
    }

    #saveRecordingBtn {
      background-color: #28a745;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
    }

    .recording {
      margin-bottom: 10px;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 5px;
      background-color: white;
    }

    .recording-name {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .recording-actions {
      display: flex;
      gap: 5px;
    }

    .recording-actions button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }

    .recording-json {
      display: none;
      margin-top: 10px;
      background-color: #f8f9fa;
      border: 1px solid #ced4da;
      border-radius: 3px;
      padding: 10px;
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
    }

    .copy-json-btn {
      background-color: #6c757d;
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 5px;
    }
  `;
  shadowRoot.appendChild(style);
}

function initializeDrawer(shadowRoot) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  const startButton = shadowRoot.getElementById('startRecording');
  const stopButton = shadowRoot.getElementById('stopRecording');
  const expandButton = shadowRoot.getElementById('expandDrawer');
  const saveRecordingBtn = shadowRoot.getElementById('saveRecordingBtn');

  startButton.addEventListener('click', () => startRecording(shadowRoot));
  stopButton.addEventListener('click', () => stopRecording(shadowRoot));
  expandButton.addEventListener('click', () => drawer.classList.toggle('expanded'));
  saveRecordingBtn.addEventListener('click', () => saveRecording(shadowRoot));

  loadSavedRecordings(shadowRoot);
}

function startRecording(shadowRoot) {
  isRecording = true;
  currentActions = [];
  updateUI(shadowRoot);
  chrome.runtime.sendMessage({command: "startRecording"});
}

function stopRecording(shadowRoot) {
  isRecording = false;
  updateUI(shadowRoot);
  chrome.runtime.sendMessage({command: "stopRecording"});
  shadowRoot.getElementById('saveRecording').style.display = 'flex';
}

function saveRecording(shadowRoot) {
  const name = shadowRoot.getElementById('recordingName').value;
  if (name) {
    chrome.runtime.sendMessage({
      command: "saveRecording",
      name: name,
      actions: currentActions,
      url: window.location.href
    }, (response) => {
      if (response.status === "saved") {
        loadSavedRecordings(shadowRoot);
        shadowRoot.getElementById('saveRecording').style.display = 'none';
        shadowRoot.getElementById('recordingName').value = '';
        currentActions = []; // Reset current actions after saving
      }
    });
  }
}

function loadSavedRecordings(shadowRoot) {
  chrome.storage.local.get({recordings: {}}, (result) => {
    const recordingsList = shadowRoot.getElementById('recordingsList');
    recordingsList.innerHTML = '';
    Object.entries(result.recordings).forEach(([name, recording]) => {
      const recordingDiv = document.createElement('div');
      recordingDiv.className = 'recording';
      recordingDiv.innerHTML = `
        <div class="recording-name">${name}</div>
        <div class="recording-actions">
          <button class="replay-btn">Replay</button>
          <button class="delete-btn">Delete</button>
          <button class="view-json-btn">View JSON</button>
        </div>
        <div class="recording-json" style="display: none;">
          <pre>${JSON.stringify(recording.actions, null, 2)}</pre>
          <button class="copy-json-btn">Copy JSON</button>
        </div>
      `;
      recordingDiv.querySelector('.replay-btn').addEventListener('click', () => replayRecording(recording, name));
      recordingDiv.querySelector('.delete-btn').addEventListener('click', () => deleteRecording(name, shadowRoot));
      recordingDiv.querySelector('.view-json-btn').addEventListener('click', (e) => toggleJsonView(e.target));
      recordingDiv.querySelector('.copy-json-btn').addEventListener('click', (e) => copyJsonToClipboard(e.target));
      recordingsList.appendChild(recordingDiv);
    });
  });
}

function toggleJsonView(button) {
  const jsonDiv = button.closest('.recording').querySelector('.recording-json');
  if (jsonDiv.style.display === 'none' || jsonDiv.style.display === '') {
    jsonDiv.style.display = 'block';
    button.textContent = 'Hide JSON';
  } else {
    jsonDiv.style.display = 'none';
    button.textContent = 'View JSON';
  }
}

function copyJsonToClipboard(button) {
  const jsonContent = button.previousElementSibling.textContent;
  navigator.clipboard.writeText(jsonContent).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

function replayRecording(recording, name) {
  console.log(`Starting replay of recording: ${name}`);
  
  const actions = recording.actions;
  
  // Send the exact actions to be replayed
  chrome.runtime.sendMessage({
    command: "replayRecording",
    name: name,
    recording: { actions: actions },
    speed: 1 // You can adjust this if you want to control replay speed
  });
}

function deleteRecording(name, shadowRoot) {
  chrome.runtime.sendMessage({
    command: "deleteRecording",
    name: name
  }, (response) => {
    if (response.status === "deleted") {
      loadSavedRecordings(shadowRoot);
    }
  });
}

function updateUI(shadowRoot) {
  shadowRoot.getElementById('startRecording').style.display = isRecording ? 'none' : 'flex';
  shadowRoot.getElementById('stopRecording').style.display = isRecording ? 'flex' : 'none';
}

function addAction(action) {
  if (isRecording) {
    currentActions.push(action);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "action") {
    addAction(message.action);
  }
  sendResponse({status: "processed"});
  return true;
});

// Create the drawer when the script loads
createDrawer();