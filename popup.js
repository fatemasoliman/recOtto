document.addEventListener('DOMContentLoaded', function() {
    const drawer = document.getElementById('recotto-drawer');
    const expandButton = document.getElementById('expandDrawer');
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');

    expandButton.addEventListener('click', function() {
        drawer.classList.toggle('expanded');
    });

    startButton.addEventListener('click', function() {
        startButton.style.display = 'none';
        stopButton.style.display = 'flex';
        // Add your start recording logic here
    });

    stopButton.addEventListener('click', function() {
        stopButton.style.display = 'none';
        startButton.style.display = 'flex';
        // Add your stop recording logic here
    });

    // Add any other necessary event listeners or functionality
});