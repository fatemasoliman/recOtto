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
      <div class="drawer-tab">
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
        <div class="capture-buttons">
          <button id="captureFieldsBtn" class="action-button">Capture Fields</button>
          <button id="captureCookiesBtn" class="action-button">Capture Cookies</button>
        </div>
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
      background-color: #f5f5f5;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease-in-out;
      z-index: 2147483647;
      border-radius: 25px 0 0 25px;
      overflow: hidden;
    }

    #recotto-drawer.expanded {
      width: 300px;
      height: 70vh;
      transform: translateY(-35%);
    }

    .drawer-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px;
    }

    .expanded-content {
      display: none;
      padding: 15px;
      height: calc(100% - 30px);
      overflow-y: auto;
    }

    #recotto-drawer.expanded .expanded-content { display: block; }
    #recotto-drawer.expanded .drawer-tab { flex-direction: row; justify-content: space-around; }

    .action-button {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      margin: 5px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      background-color: white;
      color: black;
    }

    .action-button:hover {
      background-color: #e0e0e0;
    }

    .action-button.start-btn {
      position: relative;
      overflow: hidden;
    }

    .action-button.start-btn::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background-color: black;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .action-button.start-btn.recording {
      background-color: black;
    }

    .action-button.start-btn.recording::after {
      background-color: red;
      width: 12px;
      height: 12px;
    }

    .recording {
      margin-bottom: 10px;
      border: 1px solid #ccc;
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
      background-color: white;
      color: black;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .recording-actions button:hover {
      background-color: #e0e0e0;
    }

    .capture-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
    }

    .capture-buttons .action-button {
      width: 48%;
      height: auto;
      border-radius: 5px;
      padding: 8px;
    }

    #recotto-drawer, #recotto-drawer * {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    }

    #recotto-drawer {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 50px;
      background-color: #f5f5f5;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      transition: all 0.3s ease-in-out;
      z-index: 2147483647;
      border-radius: 25px 0 0 25px;
      overflow: hidden;
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
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      background-color: white;
      color: black;
    }

    .action-button:hover {
      background-color: #e0e0e0;
    }

    .action-button.start-btn {
      position: relative;
      overflow: hidden;
    }

    .action-button.start-btn::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background-color: black;
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .action-button.start-btn.recording {
      background-color: black;
    }

    .action-button.start-btn.recording::after {
      background-color: red;
      width: 12px;
      height: 12px;
    }

    .expanded-content {
      display: none;
      padding: 15px;
      height: calc(100% - 30px);
      overflow-y: auto;
    }

    #recotto-drawer.expanded .expanded-content { display: block; }
    #recotto-drawer.expanded .drawer-content { flex-direction: row; justify-content: space-around; }

    h2 {
      font-size: 18px;
      margin-bottom: 10px;
    }

    #saveRecording {
      margin-top: 10px;
      display: flex;
      gap: 5px;
    }

    #recordingName {
      flex-grow: 1;
      padding: 5px;
      border: 1px solid #ccc;
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

    #saveRecordingBtn:hover {
      background-color: #218838;
    }

    .recording {
      margin-bottom: 10px;
      border: 1px solid #ccc;
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
      background-color: white;
      color: black;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .recording-actions button:hover {
      background-color: #e0e0e0;
    }

    #capturedData {
      max-height: 300px;
      overflow-y: auto;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      padding-right: 40px;
      font-family: monospace;
      font-size: 12px;
      position: relative;
    }

    #copyCapturedData {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      padding: 0;
    }

    #copyCapturedData:hover {
      background-color: #e0e0e0;
    }

    #copyCapturedData svg {
      width: 20px;
      height: 20px;
      fill: black;
      transition: fill 0.3s ease;
    }

    #loadingIndicator {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 10000;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 10px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  shadowRoot.appendChild(style);
}

function initializeDrawer(shadowRoot) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  const startButton = shadowRoot.getElementById('startRecording');
  const stopButton = shadowRoot.getElementById('stopRecording');
  const expandButton = shadowRoot.getElementById('expandDrawer');
  const captureFieldsBtn = shadowRoot.getElementById('captureFieldsBtn');
  const captureCookiesBtn = shadowRoot.getElementById('captureCookiesBtn');
  const saveRecordingBtn = shadowRoot.getElementById('saveRecordingBtn');

  startButton.innerHTML = ''; // Remove any existing content
  startButton.addEventListener('click', () => {
    if (isRecording) {
      stopRecording(shadowRoot);
      startButton.classList.remove('recording');
    } else {
      startRecording(shadowRoot);
      startButton.classList.add('recording');
    }
  });
  
  stopButton.addEventListener('click', () => {
    stopRecording(shadowRoot);
    startButton.classList.remove('recording');
  });
  
  expandButton.addEventListener('click', () => {
    drawer.classList.toggle('expanded');
  });

  captureFieldsBtn.addEventListener('click', () => captureAllFields(shadowRoot));
  captureCookiesBtn.addEventListener('click', () => captureCookies(shadowRoot));

  if (saveRecordingBtn) {
    saveRecordingBtn.addEventListener('click', () => saveRecording(shadowRoot));
  } else {
    console.error('Save button not found');
  }

  loadSavedRecordings(shadowRoot);
}

function createButton(shadowRoot, text, clickHandler) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = 'action-button';
  button.addEventListener('click', () => clickHandler(shadowRoot));
  return button;
}

// Add this function to create and show a loading indicator
function showLoadingIndicator(shadowRoot) {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loadingIndicator';
  loadingIndicator.innerHTML = `
    <div class="spinner"></div>
    <p>Processing fields...</p>
  `;
  shadowRoot.querySelector('.expanded-content').appendChild(loadingIndicator);
}

// Add this function to hide the loading indicator
function hideLoadingIndicator(shadowRoot) {
  const loadingIndicator = shadowRoot.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}

// Modify the captureAllFields function
async function captureAllFields(shadowRoot) {
  showLoadingIndicator(shadowRoot);
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

  try {
    // Capture screenshot
    const screenshot = await captureScreenshot();
    console.log('Screenshot captured successfully');

    // Send to OpenAI
    const response = await sendToOpenAI(fields, screenshot);

    // Hide loading indicator
    hideLoadingIndicator(shadowRoot);

    // Display response or error message
    if (response.error) {
      console.error('Error from OpenAI:', response);
      displayCapturedData(shadowRoot, 'Error', response);
    } else {
      displayCapturedData(shadowRoot, 'OpenAI Response', response);
    }
  } catch (error) {
    console.error('Error in captureAllFields:', error);
    hideLoadingIndicator(shadowRoot);
    displayCapturedData(shadowRoot, 'Error', { 
      error: `Failed to capture fields: ${error.message}`
    });
  }
}

function captureCookies(shadowRoot) {
  const cookies = document.cookie.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return { name, value };
  });

  if (cookies.length === 0) {
    displayCapturedData(shadowRoot, 'Captured Cookies', { message: 'No cookies found for this domain.' });
  } else {
    displayCapturedData(shadowRoot, 'Captured Cookies', { cookies });
  }
}

function displayCapturedData(shadowRoot, title, data) {
  const drawer = shadowRoot.getElementById('recotto-drawer');
  drawer.classList.add('expanded');

  const expandedContent = shadowRoot.querySelector('.expanded-content');
  let contentToDisplay;

  if (data.error) {
    contentToDisplay = JSON.stringify(data, null, 2);
  } else if (data.content) {
    contentToDisplay = data.content;
  } else if (data.cookies) {
    contentToDisplay = JSON.stringify(data.cookies, null, 2);
  } else if (data.message) {
    contentToDisplay = data.message;
  } else if (data.partialContent) {
    contentToDisplay = `Error: ${data.error}\n\nPartial content:\n${data.partialContent}`;
  } else {
    contentToDisplay = JSON.stringify(data, null, 2);
  }

  expandedContent.innerHTML = `
    <h2>${title}</h2>
    <pre id="capturedData">${contentToDisplay}</pre>
    <button id="copyCapturedData" class="icon-button" title="Copy to Clipboard">
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    </button>
  `;

  const copyButton = expandedContent.querySelector('#copyCapturedData');
  copyButton.addEventListener('click', () => {
    const capturedData = expandedContent.querySelector('#capturedData').textContent;
    navigator.clipboard.writeText(capturedData).then(() => {
      copyButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      `;
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        `;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy data: ', err);
      copyButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      `;
      setTimeout(() => {
        copyButton.innerHTML = `
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        `;
      }, 2000);
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
    console.log('Attempting to save recording:', name);
    console.log('Current actions:', currentActions);
    chrome.runtime.sendMessage({
      command: "saveRecording",
      name: name,
      actions: currentActions,
      url: window.location.href
    }, (response) => {
      console.log('Save recording response:', response);
      if (chrome.runtime.lastError) {
        console.error('Error saving recording:', chrome.runtime.lastError);
        alert('Failed to save recording: ' + chrome.runtime.lastError.message);
      } else if (response && response.status === "saved") {
        console.log('Recording saved successfully');
        loadSavedRecordings(shadowRoot);
        shadowRoot.getElementById('saveRecording').style.display = 'none';
        shadowRoot.getElementById('recordingName').value = '';
        currentActions = []; // Reset current actions after saving
      } else {
        console.error('Unexpected response when saving recording:', response);
        alert('Failed to save recording: Unexpected response');
      }
    });
  } else {
    console.warn('Attempted to save recording without a name');
    alert('Please enter a name for the recording');
  }
}

function loadSavedRecordings(shadowRoot) {
  chrome.storage.local.get({recordings: {}}, (result) => {
    const recordingsList = shadowRoot.getElementById('recordingsList');
    recordingsList.innerHTML = '<h2>Saved Recordings</h2>';
    Object.entries(result.recordings).forEach(([name, recording]) => {
      const recordingDiv = document.createElement('div');
      recordingDiv.className = 'recording';
      recordingDiv.innerHTML = `
        <span class="recording-name">${name}</span>
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
  const saveRecording = shadowRoot.getElementById('saveRecording');
  
  if (isRecording) {
    startButton.style.display = 'none';
    stopButton.style.display = 'flex';
    saveRecording.style.display = 'none';
  } else {
    startButton.style.display = 'flex';
    stopButton.style.display = 'none';
    if (currentActions.length > 0) {
      saveRecording.style.display = 'flex';
    } else {
      saveRecording.style.display = 'none';
    }
  }
}

function addAction(action) {
  if (isRecording) {
    console.log('Adding action:', action);
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

function captureScreenshot() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({command: "captureScreenshot"}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error capturing screenshot:', chrome.runtime.lastError);
        reject(new Error('Failed to capture screenshot: ' + chrome.runtime.lastError.message));
      } else if (response && response.screenshot) {
        resolve(response.screenshot);
      } else if (response && response.error) {
        console.error('Error capturing screenshot:', response.error);
        reject(new Error('Failed to capture screenshot: ' + response.error));
      } else {
        console.error('Invalid response from captureScreenshot:', response);
        reject(new Error('Invalid screenshot data'));
      }
    });
  });
}

async function sendToOpenAI(fields, screenshot) {
  const apiKey = CONFIG.OPENAI_API_KEY;
  const prompt = `Here's a json of the form fields detected on a page, along with an image of how the page looks. Some of the form fields don't have human readable names. From the image, try to give every form field a human readable name. Edit the json to add a "label" value for each field and give it the human readable name. Return only the JSON object.`;

  try {
    if (!screenshot) {
      throw new Error('Screenshot is undefined');
    }

    // Convert the screenshot data URL to base64
    const base64Image = screenshot.split(',')[1];

    if (!base64Image) {
      throw new Error('Failed to extract base64 image data');
    }

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            },
            { type: "text", text: JSON.stringify(fields) }
          ]
        }
      ],
      max_tokens: 5000, 
      response_format: { "type": "json_object" }
    };

    // Log the full request (excluding the actual image data for brevity)
    console.log('Full OpenAI request:', {
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [API_KEY]' // Don't log the actual API key
      },
      body: {
        ...requestBody,
        messages: [
          {
            ...requestBody.messages[0],
            content: requestBody.messages[0].content.map(item => 
              item.type === 'image_url' ? { ...item, image_url: { url: '[BASE64_IMAGE_DATA]' } } : item
            )
          }
        ]
      }
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API response not OK:', response.status, data);
      return { error: `API error: ${response.status} - ${data.error?.message || JSON.stringify(data)}` };
    }

    console.log('Full API response:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Unexpected API response structure:', data);
      return { error: 'Unexpected API response structure', fullResponse: data };
    }

    let content = data.choices[0].message.content;
    console.log('API response content:', content);

    // Attempt to complete the JSON if it's incomplete
    if (!content.endsWith('}')) {
      content += ']}';
    }

    // Check if the content is valid JSON
    try {
      const parsedContent = JSON.parse(content);
      return { content: JSON.stringify(parsedContent, null, 2) };
    } catch (parseError) {
      console.error('Error parsing API response:', parseError);
      return { error: 'Incomplete or invalid JSON response from OpenAI', partialContent: content };
    }
  } catch (error) {
    console.error('Error in sendToOpenAI:', error);
    return { error: `Failed to process with OpenAI: ${error.message}` };
  }
}

// Create the drawer when the script loads
createDrawer();
