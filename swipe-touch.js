// Enhanced touch controls for 2048
document.addEventListener('DOMContentLoaded', () => {
    // Only apply enhanced touch controls on touch devices
    if (!('ontouchstart' in window)) return;

    // Game constants
    const GRID_SIZE = 4;
    const SWIPE_THRESHOLD = 40; // Minimum distance to trigger a move (increased from 20)
    const SWIPE_LOCK_THRESHOLD = SWIPE_THRESHOLD * 1.5; // Distance at which move is locked in
    const MAX_TILE_MOVEMENT = 15; // Maximum tiles can visually move during swipe (in pixels)

    // Game elements
    const gridContainer = document.querySelector('.grid-container');
    const tileContainer = document.querySelector('.tile-container');

    // Touch tracking variables
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let isTouchActive = false;
    let isMoveLocked = false;
    let lockedDirection = null;
    let isAnimating = false;

    // Get access to the game's variables and functions
    function getGameScope() {
        // Since the main game script uses IIFE, we need to expose these through a global object
        // This assumes the main game has these variables and functions
        return {
            isAnimating: () => window.game2048IsAnimating === true,
            setAnimating: (value) => { window.game2048IsAnimating = value; },
            moveTiles: (direction) => {
                // Find the function in the global context and call it
                if (typeof window.game2048MoveTiles === 'function') {
                    return window.game2048MoveTiles(direction);
                }
                return false;
            }
        };
    }

    // Calculate grid cell size
    function getCellSize() {
        const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
        const gridGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-gap'));
        return { cellSize, gridGap };
    }

    // Helper to get all visible tiles
    function getTiles() {
        return Array.from(tileContainer.querySelectorAll('.tile'));
    }

    // Apply translation to tiles based on swipe direction and distance
    function updateTilesPosition(deltaX, deltaY) {
        // Define the dominant direction
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        const distance = isHorizontal ? deltaX : deltaY;
        const absDistance = Math.abs(distance);

        // Calculate how much to move the tiles (with limits)
        let moveFactor = Math.min(absDistance / SWIPE_THRESHOLD, 1);
        let moveDistance = moveFactor * MAX_TILE_MOVEMENT;

        // Apply movement only in the dominant direction
        let translateX = 0, translateY = 0;

        if (isHorizontal) {
            translateX = distance > 0 ? moveDistance : -moveDistance;
        } else {
            translateY = distance > 0 ? moveDistance : -moveDistance;
        }

        // Get direction for locking
        let direction = null;
        if (isHorizontal) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        // Apply different transforms based on tile position and direction
        const tiles = getTiles();
        const { cellSize, gridGap } = getCellSize();
        const cellSizeWithGap = cellSize + gridGap;

        tiles.forEach(tile => {
            const row = parseInt(tile.dataset.row);
            const col = parseInt(tile.dataset.col);

            // Adjust movement based on position and direction
            let tileTranslateX = translateX;
            let tileTranslateY = translateY;

            // Adjust scale for visual feedback (tiles getting closer to edge)
            const scale = 1 + (moveFactor * 0.05); // 5% max growth

            // For horizontal movement, adjust based on column position
            if (direction === 'right') {
                // Tiles on the right move less than tiles on the left
                tileTranslateX *= (GRID_SIZE - col) / GRID_SIZE;
            } else if (direction === 'left') {
                // Tiles on the left move less than tiles on the right
                tileTranslateX *= (col + 1) / GRID_SIZE;
            }

            // For vertical movement, adjust based on row position
            if (direction === 'down') {
                // Tiles at the bottom move less than tiles at the top
                tileTranslateY *= (GRID_SIZE - row) / GRID_SIZE;
            } else if (direction === 'up') {
                // Tiles at the top move less than tiles at the bottom
                tileTranslateY *= (row + 1) / GRID_SIZE;
            }

            // Apply the transform
            tile.style.transition = 'transform 0.05s ease-out';
            tile.style.transform = `translate(${tileTranslateX}px, ${tileTranslateY}px) scale(${scale})`;
        });

        // Check if we've reached the lock threshold
        if (!isMoveLocked && absDistance >= SWIPE_LOCK_THRESHOLD) {
            isMoveLocked = true;
            lockedDirection = direction;

            // Execute the move immediately
            const gameScope = getGameScope();
            if (!gameScope.isAnimating()) {
                gameScope.setAnimating(true);
                gameScope.moveTiles(direction);

                // Reset swipe state
                resetSwipeState();
            }
        }

        return direction;
    }

    // Reset tiles to their normal positions
    function resetTilesPosition() {
        const tiles = getTiles();
        tiles.forEach(tile => {
            tile.style.transition = 'transform 0.1s ease-out';
            tile.style.transform = 'translate(0, 0) scale(1)';
        });
    }

    // Reset swipe tracking state
    function resetSwipeState() {
        isTouchActive = false;
        isMoveLocked = false;
        lockedDirection = null;
        touchStartX = 0;
        touchStartY = 0;
        touchCurrentX = 0;
        touchCurrentY = 0;
        resetTilesPosition();
    }

    // Touch event handlers
    function handleTouchStart(event) {
        // Ignore if the game is animating
        const gameScope = getGameScope();
        if (gameScope.isAnimating()) return;

        // Get the first touch coordinates
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchCurrentX = touchStartX;
        touchCurrentY = touchStartY;
        isTouchActive = true;
        isMoveLocked = false;
        lockedDirection = null;
    }

    function handleTouchMove(event) {
        // Ignore if touch isn't active or move is already locked
        if (!isTouchActive || isMoveLocked) return;

        // Get current touch position
        touchCurrentX = event.touches[0].clientX;
        touchCurrentY = event.touches[0].clientY;

        // Calculate delta
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;

        // Ignore very small movements
        if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) return;

        // Prevent scrolling the page
        event.preventDefault();

        // Update tile positions based on swipe
        updateTilesPosition(deltaX, deltaY);
    }

    function handleTouchEnd(event) {
        // Ignore if touch isn't active
        if (!isTouchActive) return;

        // Get the final touch position
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;

        // Calculate final delta
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Reset tile positions
        resetTilesPosition();

        // If move wasn't already locked, check if we should make a move now
        if (!isMoveLocked) {
            // Determine direction and if swipe was significant enough
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (Math.max(absX, absY) >= SWIPE_THRESHOLD) {
                const gameScope = getGameScope();
                let direction;

                if (absX > absY) {
                    // Horizontal swipe
                    direction = deltaX > 0 ? 'right' : 'left';
                } else {
                    // Vertical swipe
                    direction = deltaY > 0 ? 'down' : 'up';
                }

                // Execute the move
                if (!gameScope.isAnimating()) {
                    gameScope.moveTiles(direction);
                }
            }
        }

        // Reset swipe state
        resetSwipeState();
    }

    // Expose the game's moveTiles function globally so we can call it
    // This assumes the original script sets up a moveTiles function in its scope
    document.addEventListener('game2048Loaded', function (e) {
        window.game2048MoveTiles = e.detail.moveTiles;
        window.game2048IsAnimating = false;

        // Now that we have access to the game's functions, initialize our enhanced touch controls
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
    });
});
