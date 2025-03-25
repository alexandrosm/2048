/**
 * Input Manager - Handles all user input (keyboard, touch, mouse)
 * Uses Hammer.js for better touch gesture recognition
 */
export default class InputManager {
    constructor(options = {}) {
        this.events = {};
        this.eventTouchEnd = "touchend";
        this.eventTouchStart = "touchstart";
        this.eventTouchMove = "touchmove";

        this.bindKeyboard();
        this.bindTouch();

        // Initialize Hammer.js for touch gesture handling
        this.setupHammer(options.gameContainer || document.body);
    }

    /**
     * Bind to an event
     * @param {string} event - Event name
     * @param {function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Emit an event to all listeners
     * @param {string} event - Event name
     * @param {any} data - Data to pass to listeners
     */
    emit(event, data) {
        const callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach((callback) => {
                callback(data);
            });
        }
    }

    /**
     * Listen for keyboard events
     */
    bindKeyboard() {
        document.addEventListener("keydown", (event) => {
            // Support for arrow keys and WASD keys
            const keyMap = {
                'ArrowUp': 'up',
                'ArrowRight': 'right',
                'ArrowDown': 'down',
                'ArrowLeft': 'left',
                'w': 'up',
                'd': 'right',
                's': 'down',
                'a': 'left',
                'W': 'up',
                'D': 'right',
                'S': 'down',
                'A': 'left'
            };

            const mapped = keyMap[event.key];

            if (mapped) {
                event.preventDefault();
                this.emit("move", mapped);
            } else if (event.key === 'r' || event.key === 'R') {
                this.emit("restart");
            } else if (event.key === 'u' || event.key === 'U') {
                this.emit("undo");
            }
        });
    }

    /**
     * Basic touch event handling
     * (Hammer.js will handle more sophisticated gesture detection)
     */
    bindTouch() {
        let touchStartClientX, touchStartClientY;

        // Prevent scrolling when touching the game container
        document.addEventListener(this.eventTouchMove, (event) => {
            if (event.touches.length > 0) {
                // Only prevent default if this may be a game swipe
                // Check if touch started in game container
                if (touchStartClientX !== undefined && touchStartClientY !== undefined) {
                    event.preventDefault();
                }
            }
        }, { passive: false });

        document.addEventListener(this.eventTouchStart, (event) => {
            if (event.touches.length > 0) {
                touchStartClientX = event.touches[0].clientX;
                touchStartClientY = event.touches[0].clientY;
            }
        });
    }

    /**
     * Set up Hammer.js for advanced touch gesture handling
     * @param {HTMLElement} element - DOM element to attach hammer to
     */
    setupHammer(element) {
        // Create Hammer manager instance
        const hammer = new Hammer.Manager(element);

        // Add recognizers with proper settings
        // Pan recognizer (for swipes)
        const pan = new Hammer.Pan({
            direction: Hammer.DIRECTION_ALL,
            threshold: 10 // Minimum distance required before recognizing
        });

        // Tap recognizer
        const tap = new Hammer.Tap({
            taps: 1
        });

        // Press recognizer (for long press)
        const press = new Hammer.Press({
            time: 500 // ms before press is triggered
        });

        // Add recognizers with priorities
        hammer.add([pan, tap, press]);

        // Handle pan (swipe) gestures
        hammer.on("panleft panright panup pandown", (ev) => {
            // Only trigger once per pan (at end)
            if (ev.isFinal) {
                const direction = ev.type.replace('pan', '');

                // Convert Hammer direction to game direction
                const directionMap = {
                    'left': 'left',
                    'right': 'right',
                    'up': 'up',
                    'down': 'down'
                };

                this.emit("move", directionMap[direction]);

                // If device supports vibration, add tactile feedback
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(20); // Short 20ms vibration
                }
            }
        });

        // Handle taps - could be used for special functions or UI elements
        hammer.on("tap", (ev) => {
            // Determine what was tapped based on coordinates/target
            const target = ev.target;

            // Check if tap is on a button with specific roles
            if (target.closest('#restart-button')) {
                this.emit("restart");
            }
            else if (target.closest('#undo-button')) {
                this.emit("undo");
            }
        });

        // Handle press - could be used for special functions
        hammer.on("press", (ev) => {
            // Example: Long press could open a game menu
            this.emit("menu");
        });
    }
}
