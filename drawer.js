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
        <button id="startRecording" class="action-button start-btn" title="Start Recording"></button>
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
  
  // Add Font Awesome CSS
  fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css')
    .then(response => response.text())
    .then(css => {
      style.textContent += css;
      
      // Add our custom styles
      style.textContent += `
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
          border: 2px solid #000;
          margin: 5px 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          background-color: white;
          position: relative;
        }

        .start-btn {
          font-size: 0; /* Hide the text content */
        }

        .start-btn::after {
          content: '';
          width: 16px;
          height: 16px;
          background-color: #000;
          border-radius: 50%;
          position: absolute;
        }

        .start-btn.recording {
          background-color: #ff0000;
        }

        .start-btn.recording::after {
          background-color: #fff;
        }

        .stop-btn {
          background-color: #ff0000;
        }

        .stop-btn::after {
          content: '';
          width: 16px;
          height: 16px;
          background-color: #fff;
          position: absolute;
        }

        .expand-btn { 
          background-color: #007bff; 
          color: white;
          border: none;
        }

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
          gap: 10px;
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
          font-size: 12px;
        }

        .recording-json pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 200px;
          overflow-y: auto;
        }

        .copy-json-btn {
          display: block;
          margin-bottom: 10px;
          background-color: #6c757d;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }

        .icon-button {
          background: white;
          border: 2px solid #3137fd;
          cursor: pointer;
          padding: 5px;
          font-size: 18px;
          line-height: 1;
          color: #3137fd;
          transition: all 0.3s ease;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-button:hover {
          background-color: #3137fd;
          color: white;
        }

        .delete-btn {
          color: #dc3545;
          border-color: #dc3545;
        }

        .delete-btn:hover {
          background-color: #dc3545;
          color: white;
        }

        .recording-actions {
          display: flex;
          gap: 10px;
        }

        .action-button {
          margin: 5px;
          padding: 8px 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .action-button:hover {
          background-color: #0056b3;
        }

        #capturedData {
          max-height: 300px;
          overflow-y: auto;
          background-color: #f8f9fa;
          border: 1px solid #ced4da;
          border-radius: 4px;
          padding: 10px;
          font-family: monospace;
        }

        #copyCapturedData {
          margin-top: 10px;
        }
      `;
      
      shadowRoot.appendChild(style);
    })
    .catch(error => console.error('Error loading Font Awesome CSS:', error));
}

function initializeDrawer(shadowRoot) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  const startButton = shadowRoot.getElementById('startRecording');
  const stopButton = shadowRoot.getElementById('stopRecording');
  const expandButton = shadowRoot.getElementById('expandDrawer');
  const saveRecordingBtn = shadowRoot.getElementById('saveRecordingBtn');

  startButton.addEventListener('click', () => {
    startRecording(shadowRoot);
    startButton.classList.add('recording');
  });
  stopButton.addEventListener('click', () => {
    stopRecording(shadowRoot);
    startButton.classList.remove('recording');
  });
  expandButton.addEventListener('click', () => drawer.classList.toggle('expanded'));
  saveRecordingBtn.addEventListener('click', () => saveRecording(shadowRoot));

  loadSavedRecordings(shadowRoot);

  // Add new buttons
  const captureFieldsBtn = createButton(shadowRoot, 'Capture Fields', captureAllFields);
  const captureCookiesBtn = createButton(shadowRoot, 'Capture Cookies', captureCookies);

  // Append new buttons to the drawer
  const drawerContent = shadowRoot.querySelector('.drawer-content');
  drawerContent.appendChild(captureFieldsBtn);
  drawerContent.appendChild(captureCookiesBtn);
}

function createButton(shadowRoot, text, clickHandler) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = 'action-button';
  button.addEventListener('click', () => clickHandler(shadowRoot));
  return button;
}

function captureAllFields(shadowRoot) {
  const fields = [];

  // Capture standard form inputs
  document.querySelectorAll('input, select, textarea').forEach(el => {
    fields.push({
      type: el.tagName.toLowerCase(),
      inputType: el.type,
      name: el.name,
      id: el.id,
      value: el.value,
      selector: getCssSelector(el)
    });
  });

  // Capture contenteditable elements
  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    fields.push({
      type: 'contenteditable',
      name: el.getAttribute('name'),
      id: el.id,
      value: el.textContent,
      selector: getCssSelector(el)
    });
  });

  // Capture custom dropdowns and comboboxes
  document.querySelectorAll('[role="listbox"], [role="combobox"]').forEach(el => {
    const selectedOption = el.querySelector('[aria-selected="true"]');
    fields.push({
      type: 'custom-dropdown',
      name: el.getAttribute('name'),
      id: el.id,
      value: selectedOption ? selectedOption.textContent : '',
      selector: getCssSelector(el)
    });
  });

  // Display captured fields
  displayCapturedData(shadowRoot, 'Captured Fields', fields);
}

function captureCookies(shadowRoot) {
  const cookies = document.cookie.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return { name, value };
  });

  // Display captured cookies
  displayCapturedData(shadowRoot, 'Captured Cookies', cookies);
}

function displayCapturedData(shadowRoot, title, data) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  drawer.classList.add('expanded');

  const expandedContent = shadowRoot.querySelector('.expanded-content');
  expandedContent.innerHTML = `
    <h2>${title}</h2>
    <pre id="capturedData">${JSON.stringify(data, null, 2)}</pre>
    <button id="copyCapturedData" class="icon-button">Copy to Clipboard</button>
  `;

  const copyButton = expandedContent.querySelector('#copyCapturedData');
  copyButton.addEventListener('click', () => {
    const capturedData = expandedContent.querySelector('#capturedData').textContent;
    navigator.clipboard.writeText(capturedData).then(() => {
      alert('Data copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy data: ', err);
    });
  });
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
          <button class="icon-button replay-btn" title="Replay">▶</button>
          <button class="icon-button delete-btn" title="Delete">✕</button>
          <button class="icon-button view-json-btn" title="View JSON">⋯</button>
        </div>
        <div class="recording-json" style="display: none;">
          <button class="icon-button copy-json-btn" title="Copy JSON">⎘</button>
          <pre>${JSON.stringify(recording.actions, null, 2)}</pre>
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
    button.textContent = '−';
    button.title = 'Hide JSON';
  } else {
    jsonDiv.style.display = 'none';
    button.textContent = '⋯';
    button.title = 'View JSON';
  }
}

function copyJsonToClipboard(button) {
  const jsonContent = button.nextElementSibling.textContent;
  navigator.clipboard.writeText(jsonContent).then(() => {
    const originalText = button.textContent;
    button.textContent = '✓';
    button.title = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
      button.title = 'Copy JSON';
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
  const startButton = shadowRoot.getElementById('startRecording');
  const stopButton = shadowRoot.getElementById('stopRecording');
  
  if (isRecording) {
    startButton.style.display = 'none';
    stopButton.style.display = 'flex';
  } else {
    startButton.style.display = 'flex';
    stopButton.style.display = 'none';
  }
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
