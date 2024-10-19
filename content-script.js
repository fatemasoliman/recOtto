function injectDrawer() {
  // Create a container for the drawer
  const drawerContainer = document.createElement('div');
  drawerContainer.id = 'recotto-container';
  
  // Create a shadow DOM for the drawer
  const shadowRoot = drawerContainer.attachShadow({mode: 'closed'});

  // Fetch and inject the drawer HTML
  fetch(chrome.runtime.getURL('drawer.html'))
    .then(response => response.text())
    .then(data => {
      // Create a container for the drawer content
      const drawerContent = document.createElement('div');
      drawerContent.innerHTML = data;

      // Inject styles
      const style = document.createElement('style');
      fetch(chrome.runtime.getURL('styles.css'))
        .then(response => response.text())
        .then(css => {
          style.textContent = css;
          shadowRoot.appendChild(style);
        });

      // Inject Font Awesome CSS
      fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css')
        .then(response => response.text())
        .then(css => {
          const fontAwesomeStyle = document.createElement('style');
          fontAwesomeStyle.textContent = css;
          shadowRoot.appendChild(fontAwesomeStyle);
        });

      // Append the drawer content to the shadow DOM
      shadowRoot.appendChild(drawerContent);

      // Inject drawer.js
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('drawer.js');
      shadowRoot.appendChild(script);
    });

  // Append the container to the body
  document.body.appendChild(drawerContainer);
}

injectDrawer();

// Import or define a debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Keep track of the latest input state for each input
let latestInputStates = {};

// Function to save the input state
const saveInputState = (target, type, value) => {
  const inputId = target.id || target.name || target.getAttribute('data-testid') || target.className;
  
  latestInputStates[inputId] = {
    target: inputId,
    type: type,
    value: value
  };
  
  // Send the state to background script
  chrome.runtime.sendMessage({ action: "saveInputState", state: latestInputStates[inputId] });
};

// Debounced version of saveInputState
const debouncedSaveInputState = debounce(saveInputState, 1000); // Increased to 1000ms

// Event listener for input changes
document.addEventListener('input', (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    debouncedSaveInputState(event.target, "input", event.target.value);
  }
});

// Event listener for dropdown selections
document.addEventListener('change', (event) => {
  if (event.target.tagName === 'SELECT') {
    saveInputState(event.target, "select", event.target.value);
  }
});

// Event listener for clicks (to capture dropdown opens)
document.addEventListener('click', (event) => {
  const dropdown = event.target.closest('[role="combobox"], [role="listbox"], .dropdown, .select');
  if (dropdown) {
    saveInputState(dropdown, "click", null);
  }
});

// MutationObserver to detect changes in the DOM (for custom dropdowns)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' || mutation.type === 'attributes') {
      const dropdown = mutation.target.closest('[role="combobox"], [role="listbox"], .dropdown, .select');
      if (dropdown) {
        const selectedOption = dropdown.querySelector('[aria-selected="true"], .selected');
        if (selectedOption) {
          saveInputState(dropdown, "select", selectedOption.textContent.trim());
        }
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-selected', 'class']
});

// Clear input state when focus is lost
document.addEventListener('blur', (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    const inputId = event.target.id || event.target.name || event.target.getAttribute('data-testid') || event.target.className;
    debouncedSaveInputState(event.target, "input", event.target.value);
    delete latestInputStates[inputId];
  }
}, true);

function createRecordingListItem(name, recording) {
  const li = document.createElement('li');
  li.className = 'recording-item';
  li.innerHTML = `
    <span class="recording-name">${name}</span>
    <div class="recording-actions">
      <button class="icon-button copy-json" title="Copy JSON">
        <i class="fas fa-clipboard"></i>
      </button>
      <button class="icon-button replay-recording" title="Replay">
        <i class="fas fa-play"></i>
      </button>
      <button class="icon-button delete-recording" title="Delete">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `;

  const copyButton = li.querySelector('.copy-json');
  copyButton.addEventListener('click', () => {
    const jsonString = JSON.stringify(recording, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert('JSON copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy JSON: ', err);
    });
  });

  const replayButton = li.querySelector('.replay-recording');
  replayButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      command: "replayRecording",
      name: name,
      recording: recording
    });
  });

  const deleteButton = li.querySelector('.delete-recording');
  deleteButton.addEventListener('click', () => {
    if (confirm(`Are you sure you want to delete the recording "${name}"?`)) {
      chrome.runtime.sendMessage({command: "deleteRecording", name: name}, (response) => {
        if (response.status === "deleted") {
          li.remove();
        }
      });
    }
  });

  return li;
}

function createChatHistoryItem(chat) {
  const item = document.createElement('div');
  item.className = 'chat-item';
  item.innerHTML = `
    <p><strong>Human:</strong> ${chat.human}</p>
    <p><strong>AI:</strong> ${chat.ai}</p>
    <div class="button-container">
      <button class="icon-button replay-btn" title="Replay">
        <img src="icons/replay.png" alt="Replay">
      </button>
      <button class="icon-button delete-btn" title="Delete">
        <img src="icons/delete.png" alt="Delete">
      </button>
    </div>
  `;

  const replayBtn = item.querySelector('.replay-btn');
  replayBtn.addEventListener('click', () => replayChat(chat));

  const deleteBtn = item.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => deleteChat(chat.id));

  return item;
}

document.addEventListener('DOMContentLoaded', function() {
  // Replace the replayButton event listener with replayIcon
  document.getElementById('replayIcon').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "replay"});
    });
  });
});