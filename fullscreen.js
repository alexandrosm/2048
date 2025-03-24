// Fullscreen helper for Android devices
document.addEventListener('DOMContentLoaded', function () {
    // Only apply this to Android devices
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    // Function to request fullscreen
    function goFullScreen() {
        const docElm = document.documentElement;

        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.mozRequestFullScreen) { // Firefox
            docElm.mozRequestFullScreen();
        } else if (docElm.webkitRequestFullscreen) { // Chrome, Safari and Opera
            docElm.webkitRequestFullscreen();
        } else if (docElm.msRequestFullscreen) { // IE/Edge
            docElm.msRequestFullscreen();
        }
    }

    // Attempt to go fullscreen on first user interaction
    // (browsers require a user gesture to enter fullscreen)
    document.addEventListener('click', function fullscreenOnFirstClick() {
        goFullScreen();
        // Remove this listener after first attempt
        document.removeEventListener('click', fullscreenOnFirstClick);
    }, { once: true });

    // Also add a fullscreen button for manual activation
    const fullscreenButton = document.createElement('button');
    fullscreenButton.id = 'fullscreen-button';
    fullscreenButton.className = 'icon-button';
    fullscreenButton.title = 'Fullscreen';
    fullscreenButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z" />
        </svg>
    `;
    fullscreenButton.addEventListener('click', goFullScreen);

    // Insert fullscreen button into the game controls
    const gameControls = document.querySelector('.game-controls');
    if (gameControls) {
        gameControls.appendChild(fullscreenButton);
    }
});
