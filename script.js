let recording = false;
let actions = [];

function startRecording() {
    recording = true;
    actions = [];
    updateActionList();
    document.getElementById('startRecord').disabled = true;
    document.getElementById('stopRecord').disabled = false;
}

function stopRecording() {
    recording = false;
    document.getElementById('startRecord').disabled = false;
    document.getElementById('stopRecord').disabled = true;
}

function recordAction(action) {
    if (recording) {
        actions.push(action);
        updateActionList();
    }
}

function updateActionList() {
    const actionList = document.getElementById('actionList');
    actionList.innerHTML = actions.map(action => `<div>${action.type}: ${action.target}</div>`).join('');
}

function replayActions() {
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
        }, index * 1000); // Delay each action by 1 second
    });
}

document.addEventListener('click', (e) => {
    recordAction({ type: 'click', target: getCssSelector(e.target) });
});

document.addEventListener('input', (e) => {
    recordAction({ type: 'input', target: getCssSelector(e.target), value: e.target.value });
});

document.getElementById('startRecord').addEventListener('click', startRecording);
document.getElementById('stopRecord').addEventListener('click', stopRecording);
document.getElementById('replay').addEventListener('click', replayActions);

function getCssSelector(element) {
    // Implement a function to generate a unique CSS selector for an element
    // This is a simplified version and may not work for all cases
    if (element.id) return `#${element.id}`;
    if (element.name) return `[name="${element.name}"]`;
    return element.tagName.toLowerCase();
}

// Initialize button states
document.getElementById('stopRecord').disabled = true;