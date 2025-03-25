/**
 * 2048 Game - Main Module
 * Refactored to use modular architecture and ES modules
 */

import InputManager from './input-manager.js';
import StorageManager from './storage-manager.js';

// Initialize the game once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Game constants
    const GRID_SIZE = 4;
    const CELL_SIZE_VAR = '--cell-size';
    const GRID_GAP_VAR = '--grid-gap';
    const ANIMATION_DURATION = 100; // Accelerated animations (was 250ms)

    // Game state variables
    let grid = [];
    let score = 0;
    let bestScore = 0;
    let gameOver = false;
    let gameWon = false;
    let canContinue = false;
    let isAnimating = false; // Track if animations are in progress
    let lastGameState = null; // Store only the previous state for undo
    let undoCount = 0;
    let themeBrightness = 1; // Default brightness

    // Default settings - will be overridden by loaded settings
    let UNDO_PENALTY_BASE = 10;
    let UNDO_PENALTY_MULTIPLIER = 1.33;

    // Get DOM elements
    const gridContainer = document.querySelector('.grid-container');
    const tileContainer = document.querySelector('.tile-container');
    const scoreElement = document.getElementById('score');
    const bestScoreElement = document.getElementById('best-score');
    const gameMessage = document.querySelector('.game-message');
    const messageText = gameMessage.querySelector('p');
    const retryButton = document.getElementById('retry-button');
    const restartButton = document.getElementById('restart-button');
    const undoButton = document.getElementById('undo-button');
    const themeSlider = document.getElementById('theme-slider');

    // Initialize managers
    const inputManager = new InputManager({
        gameContainer: document.querySelector('.game-container')
    });

    const storageManager = new StorageManager({
        namespace: '2048-game'
    });

    // Load saved data
    try {
        // Load theme
        themeBrightness = await storageManager.loadTheme();

        // Load best score
        bestScore = await storageManager.loadBestScore();

        // Load settings
        const settings = await storageManager.loadSettings();
        UNDO_PENALTY_BASE = settings.undoPenaltyBase || UNDO_PENALTY_BASE;
        UNDO_PENALTY_MULTIPLIER = settings.undoPenaltyMultiplier || UNDO_PENALTY_MULTIPLIER;

        console.log('Game data loaded successfully');
    } catch (error) {
        console.error('Error loading game data:', error);
    }

    // Function to interpolate between two colors based on theme brightness
    function interpolateColor(darkColor, lightColor, factor) {
        // Parse the colors into RGB components
        const darkRGB = parseColor(darkColor);
        const lightRGB = parseColor(lightColor);

        // Interpolate between the colors
        const r = Math.round(darkRGB.r + (lightRGB.r - darkRGB.r) * factor);
        const g = Math.round(darkRGB.g + (lightRGB.g - darkRGB.g) * factor);
        const b = Math.round(darkRGB.b + (lightRGB.b - darkRGB.b) * factor);
        const a = darkRGB.a !== undefined ?
            (darkRGB.a + (lightRGB.a - darkRGB.a) * factor) :
            1;

        // Format the result as a CSS color string
        return a < 1 ?
            `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})` :
            `rgb(${r}, ${g}, ${b})`;
    }

    // Helper function to parse color strings into RGB components
    function parseColor(color) {
        // Handle rgba format
        let match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3]),
                a: match[4] ? parseFloat(match[4]) : 1
            };
        }

        // Handle hex format
        match = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
        if (match) {
            return {
                r: parseInt(match[1], 16),
                g: parseInt(match[2], 16),
                b: parseInt(match[3], 16),
                a: 1
            };
        }

        // Default fallback
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    // Apply theme based on brightness value
    function applyTheme(brightness) {
        // Store the theme brightness as a CSS variable
        document.documentElement.style.setProperty('--theme-brightness', brightness);

        // Update slider UI
        themeSlider.value = brightness;

        // Save to localStorage
        localStorage.setItem('themeBrightness', brightness);

        // Interpolate and apply all theme colors
        const root = document.documentElement;

        // Main theme colors
        root.style.setProperty('--bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-bg-color').trim(),
                brightness));

        root.style.setProperty('--text-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-text-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-text-color').trim(),
                brightness));

        root.style.setProperty('--grid-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-grid-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-grid-bg-color').trim(),
                brightness));

        root.style.setProperty('--cell-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-cell-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-cell-bg-color').trim(),
                brightness));

        root.style.setProperty('--button-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-button-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-button-bg-color').trim(),
                brightness));

        root.style.setProperty('--button-hover-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-button-hover-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-button-hover-bg-color').trim(),
                brightness));

        root.style.setProperty('--message-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-message-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-message-bg-color').trim(),
                brightness));

        root.style.setProperty('--win-message-bg-color',
            interpolateColor(getComputedStyle(root).getPropertyValue('--dark-win-message-bg-color').trim(),
                getComputedStyle(root).getPropertyValue('--light-win-message-bg-color').trim(),
                brightness));

        // Game instructions visibility - fade out as it gets darker, and hide completely at 0
        document.querySelectorAll('.game-instructions').forEach(el => {
            el.style.opacity = brightness < 0.2 ? 0 : brightness;
        });

        // Apply to tiles
        document.querySelectorAll('.tile').forEach(tile => {
            const tileClass = Array.from(tile.classList).find(cls => cls.startsWith('tile-'));
            if (!tileClass) return;

            applyThemingToTile(tile, brightness);
        });

        // Handle merged tile glow effect - remove at darkest settings
        document.querySelectorAll('.tile-merged').forEach(tile => {
            const glowOpacity = brightness < 0.2 ? 0 : brightness * 0.5;
            tile.style.boxShadow = glowOpacity > 0 ?
                `0 0 10px rgba(237, 194, 46, ${glowOpacity})` : 'none';
        });

        // Handle score box text color - make darker at lowest brightness
        document.querySelectorAll('.score-box').forEach(box => {
            // Darken the text as the theme gets darker
            let textBrightness;
            if (brightness < 0.2) {
                textBrightness = 0.7; // Match original dark mode text brightness
            } else {
                textBrightness = 0.7 + (brightness * 0.3);
            }
            box.style.color = `rgba(255, 255, 255, ${textBrightness})`;
        });

        // Handle button text color - make darker at lowest brightness
        document.querySelectorAll('button').forEach(btn => {
            // Darken the text as the theme gets darker
            let textBrightness;
            if (brightness < 0.2) {
                textBrightness = 0.7; // Match original dark mode text brightness
            } else {
                textBrightness = 0.7 + (brightness * 0.3);
            }
            btn.style.color = `rgba(255, 255, 255, ${textBrightness})`;
        });

        // Apply global opacity for extreme dark mode (to match original implementation)
        if (brightness < 0.2) {
            // Scale from 0.2 to 1.0 opacity as brightness goes from 0.0 to 0.2
            const opacity = brightness === 0 ? 0.2 : brightness;
            document.body.style.opacity = opacity;
        } else {
            document.body.style.opacity = 1;
        }
    }

    // Map of tile values to their dark mode text colors - predefined for reliability
    const darkModeTextColors = {
        '2': '#eee4da',
        '4': '#ede0c8',
        '8': '#f2b179',
        '16': '#f59563',
        '32': '#f67c5f',
        '64': '#f65e3b',
        '128': '#edcf72',
        '256': '#edcc61',
        '512': '#edc850',
        '1024': '#edc53f',
        '2048': '#edc22e',
        'super': '#9d9c94'
    };

    // Map of tile values to their light mode colors - for interpolation
    const lightModeTextColors = {
        '2': '#776e65',
        '4': '#776e65',
        '8': '#f9f6f2',
        '16': '#f9f6f2',
        '32': '#f9f6f2',
        '64': '#f9f6f2',
        '128': '#f9f6f2',
        '256': '#f9f6f2',
        '512': '#f9f6f2',
        '1024': '#f9f6f2',
        '2048': '#f9f6f2',
        'super': '#f9f6f2'
    };

    // Map of tile values to their light mode background colors - for consistent theming
    const lightModeBackgroundColors = {
        '2': '#eee4da',
        '4': '#ede0c8',
        '8': '#f2b179',
        '16': '#f59563',
        '32': '#f67c5f',
        '64': '#f65e3b',
        '128': '#edcf72',
        '256': '#edcc61',
        '512': '#edc850',
        '1024': '#edc53f',
        '2048': '#edc22e',
        'super': '#3c3a32'
    };

    // Helper function to apply theming to a specific tile
    function applyThemingToTile(tile, brightness) {
        // Get tile value from element
        const value = tile.textContent;
        const tileClass = tile.classList.contains('tile-super') ? 'super' : value;

        // Assign dark and light colors based on the tile value
        const darkText = darkModeTextColors[tileClass] || '#ffffff';
        const lightText = lightModeTextColors[tileClass] || '#776e65';

        // Get background colors from our defined maps, not from computed style
        // This ensures newly merged tiles get the same colors as existing ones
        const darkBg = '#000000';
        const lightBg = lightModeBackgroundColors[tileClass] || '#eee4da';

        // Interpolate and apply the colors
        tile.style.backgroundColor = interpolateColor(darkBg, lightBg, brightness);
        tile.style.color = interpolateColor(darkText, lightText, brightness);

        // Adjust box shadow based on brightness - remove at darkest settings
        const shadowOpacity = brightness < 0.2 ? 0 : brightness * 0.1;
        tile.style.boxShadow = shadowOpacity > 0 ?
            `0 2px 4px rgba(0, 0, 0, ${shadowOpacity})` : 'none';

        // Special case for darkest mode
        if (brightness <= 0.01) {
            tile.style.backgroundColor = '#000000';
            tile.style.boxShadow = 'none';
            // Use the direct color mapping for exact dark mode colors
            tile.style.color = darkText;
        }
    }

    // Initialize appearance settings
    function initAppearance() {
        // Update the slider UI based on the stored value
        themeSlider.value = themeBrightness;

        // Force an initial application of the theme with a small delay
        // to ensure all elements are properly initialized
        setTimeout(() => {
            // Store original value
            const originalValue = themeBrightness;

            // First force a reset to light mode to ensure all elements are initialized properly
            if (originalValue < 0.5) {
                // Temporarily set to light mode and apply
                themeBrightness = 1;
                applyTheme(1);

                // Then set back to the original value with a small delay
                setTimeout(() => {
                    themeBrightness = originalValue;
                    applyTheme(originalValue);

                    // Extra specific settings for darkest mode
                    if (themeBrightness <= 0.01) {
                        document.body.style.opacity = 0.2;
                        document.querySelectorAll('.game-instructions').forEach(el => {
                            el.style.opacity = 0;
                        });

                        // Also ensure tiles have the correct colors in darkest mode
                        document.querySelectorAll('.tile').forEach(tile => {
                            tile.style.backgroundColor = '#000000';
                            tile.style.boxShadow = 'none';

                            // Get the correct text color based on the tile class
                            const tileClass = Array.from(tile.classList).find(cls => cls.startsWith('tile-'));
                            if (tileClass) {
                                const darkText = getComputedStyle(tile).getPropertyValue('--dark-tile-text').trim();
                                tile.style.color = darkText;
                            }
                        });
                    }
                }, 100);
            } else {
                // If already in light mode range, just apply directly
                applyTheme(themeBrightness);
            }
        }, 50);

        // Set up event listener for theme slider
        themeSlider.addEventListener('input', () => {
            themeBrightness = parseFloat(themeSlider.value);
            applyTheme(themeBrightness);
        });
    }

    function setupGameBoard() {
        gridContainer.innerHTML = '';
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                gridContainer.appendChild(cell);
            }
        }
    }

    // Save current game state
    async function saveGameState() {
        try {
            const gameState = {
                grid: grid,
                score: score,
                gameOver: gameOver,
                gameWon: gameWon,
                canContinue: canContinue,
                lastGameState: lastGameState,
                undoCount: undoCount
            };

            await storageManager.saveGameState(gameState);

            // Also update best score if needed
            if (score > bestScore) {
                bestScore = score;
                await storageManager.saveBestScore(bestScore);
            }

            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }

    // Load game state
    async function loadGameState() {
        try {
            const gameState = await storageManager.loadGameState();

            if (gameState) {
                // Validate the grid structure
                if (Array.isArray(gameState.grid) &&
                    gameState.grid.length === GRID_SIZE &&
                    gameState.grid.every(row => Array.isArray(row) && row.length === GRID_SIZE)) {

                    grid = gameState.grid;
                    score = gameState.score || 0;
                    gameOver = gameState.gameOver || false;
                    gameWon = gameState.gameWon || false;
                    canContinue = gameState.canContinue || false;

                    // Load previous state for undo functionality
                    if (gameState.lastGameState) {
                        lastGameState = gameState.lastGameState;
                    }

                    // Load undo count if available
                    if (gameState.undoCount !== undefined) {
                        undoCount = gameState.undoCount;
                    }

                    return true;
                } else {
                    console.error('Invalid grid structure in saved state');
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }

    // Initialize or reset the game
    async function initGame(loadSaved = true) {
        setupGameBoard();
        clearTiles();

        // Try to load saved game state first if requested
        const hasSavedState = loadSaved && await loadGameState();

        if (!hasSavedState) {
            // If no saved state or explicitly starting new game
            grid = createEmptyGrid();
            score = 0;
            gameOver = false;
            gameWon = false;
            canContinue = false;
            undoCount = 0; // Reset undo count for new games

            // Add initial tiles
            addRandomTile();
            addRandomTile();
        } else {
            // If we loaded a saved state, we need to recreate all the tiles
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    const value = grid[row][col];
                    if (value !== 0) {
                        addTile(row, col, value, false);
                    }
                }
            }
        }

        isAnimating = false;

        // Don't reset lastGameState when loading a saved game
        // Only reset it for new games
        if (!loadSaved) {
            lastGameState = null;
        }

        // Update undo button state based on lastGameState
        undoButton.disabled = !lastGameState;

        // Force update score display with current values
        updateScore(0, true);

        gameMessage.classList.remove('game-over', 'game-won');

        // If the game was in a game over or won state, show the message
        if (gameOver) {
            setTimeout(() => {
                showGameMessage('Game over!', 'game-over');
            }, 100);
        } else if (gameWon) {
            setTimeout(() => {
                showGameMessage('You win!', 'game-won');
            }, 100);
        }
    }

    // Save the current game state for undo functionality
    function saveGameStateForUndo() {
        // Create a deep copy of the current grid
        const gridCopy = grid.map(row => [...row]);

        // Save current state (just store one state for single-level undo)
        lastGameState = {
            grid: gridCopy,
            score: score,
            gameOver: gameOver,
            gameWon: gameWon
        };

        // Enable undo button
        undoButton.disabled = false;
    }

    function calculateUndoPenalty() {
        // Calculate penalty: basePenalty * (multiplier ^ undoCount)
        return Math.floor(UNDO_PENALTY_BASE * (Math.pow(UNDO_PENALTY_MULTIPLIER, undoCount)));
    }

    function showPenaltyMessage(penalty) {
        // Create a floating penalty message
        const penaltyMessage = document.createElement('div');
        penaltyMessage.className = 'penalty-message';
        penaltyMessage.textContent = `-${penalty}`;

        // Position it near the undo button
        const undoButtonRect = undoButton.getBoundingClientRect();
        const gameContainerRect = document.querySelector('.game-container').getBoundingClientRect();

        penaltyMessage.style.position = 'absolute';
        penaltyMessage.style.left = `${undoButtonRect.left - gameContainerRect.left + undoButtonRect.width / 2}px`;
        penaltyMessage.style.top = `${undoButtonRect.top - gameContainerRect.top - 20}px`;
        penaltyMessage.style.color = '#e74c3c';
        penaltyMessage.style.fontWeight = 'bold';
        penaltyMessage.style.fontSize = '1.2em';
        penaltyMessage.style.opacity = '1';
        penaltyMessage.style.transform = 'translateY(0)';
        penaltyMessage.style.transition = 'opacity 0.5s, transform 0.5s';
        penaltyMessage.style.zIndex = '30';

        document.querySelector('.game-container').appendChild(penaltyMessage);

        // Animate and remove it
        setTimeout(() => {
            penaltyMessage.style.opacity = '0';
            penaltyMessage.style.transform = 'translateY(-30px)';
            setTimeout(() => {
                penaltyMessage.remove();
            }, 500);
        }, 800);
    }

    // Restore the previous game state
    function undoMove() {
        // If no history or animating, do nothing
        if (!lastGameState || isAnimating) return;

        isAnimating = true;

        // Increment undo count for increasing penalties
        undoCount++;

        // Calculate penalty based on exponential formula
        const penalty = calculateUndoPenalty();

        // Restore grid and previous game state
        grid = lastGameState.grid;
        const previousScore = lastGameState.score;
        gameOver = lastGameState.gameOver;
        gameWon = lastGameState.gameWon;

        // Apply the penalty to the score, but ensure it doesn't go below 0
        score = Math.max(0, previousScore - penalty);

        // Clear the history after using it
        lastGameState = null;

        // Show penalty message
        showPenaltyMessage(penalty);

        // Update score display
        updateScore(0, true);

        // Redraw the grid
        renderGrid(grid);

        // Disable undo button after a single use
        undoButton.disabled = true;

        // Always hide game message when undoing, regardless of game state
        gameMessage.style.display = 'none';
        gameMessage.style.opacity = 0;
        gameMessage.classList.remove('game-over', 'game-won');

        // Force reset gameOver to false if this was the game over move
        // This ensures we can continue playing after undoing the game over move
        if (gameOver) {
            gameOver = false;
        }

        // Reset animation state after animations finish
        setTimeout(() => {
            isAnimating = false;

            // Save game state after undo (with penalty applied)
            saveGameState();
        }, ANIMATION_DURATION);
    }

    function createEmptyGrid() {
        return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    }

    function clearTiles() {
        tileContainer.innerHTML = '';
    }

    function updateScore(addedScore, forceUpdate = false) {
        // Update displayed score
        scoreElement.textContent = score;
        bestScoreElement.textContent = bestScore;

        // Show visual score addition animation if points were earned
        if (addedScore > 0 || forceUpdate) {
            // Only show animation for actual score additions
            if (addedScore > 0) {
                const scoreAddition = document.createElement('div');
                scoreAddition.className = 'score-addition';
                scoreAddition.textContent = '+' + addedScore;
                scoreAddition.style.top = '5px';

                const scoreBox = document.querySelector('.score-box');
                scoreBox.appendChild(scoreAddition);

                // Remove the element after animation completes (accelerated)
                setTimeout(() => {
                    scoreAddition.remove();
                }, 100);
            }

            // Save the current state to ensure score is persisted
            if (forceUpdate) {
                saveGameState();
            }
        }
    }

    // Clear all game data
    async function clearAllGameData() {
        try {
            await storageManager.clearAllData();
            return true;
        } catch (error) {
            console.error('Error clearing game data:', error);
            return false;
        }
    }

    function getCssVariable(name) {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue(name));
    }

    function addRandomTile() {
        const emptyCells = [];
        grid.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
            if (cell === 0) emptyCells.push({ row: rowIndex, col: colIndex });
        }));

        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            grid[row][col] = value;
            addTile(row, col, value);
        }
    }

    function calculateTilePosition(row, col) {
        // Get dimensions from the grid container for responsive layout
        const gridCells = document.querySelectorAll('.grid-cell');

        // Get the actual grid gap value from CSS
        const gridGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--grid-gap'));

        // Get the right cell from the grid to measure its exact position
        const targetCellIndex = row * GRID_SIZE + col;
        const targetCell = gridCells[targetCellIndex];

        // Get the cell's dimensions
        const cellWidth = targetCell.offsetWidth;
        const cellHeight = targetCell.offsetHeight;

        // Get the cell's position relative to the tile container
        const cellRect = targetCell.getBoundingClientRect();
        const tileContainerRect = tileContainer.getBoundingClientRect();

        // Calculate the exact position (no need to subtract gridGap again as it's already accounted for in the cell positioning)
        const left = cellRect.left - tileContainerRect.left;
        const top = cellRect.top - tileContainerRect.top;

        return { left, top, cellWidth, cellHeight };
    }

    function addTile(row, col, value, merged = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value} ${merged ? 'tile-merged' : 'tile-new'}`;
        tile.textContent = value;

        // Calculate position based on responsive grid
        const position = calculateTilePosition(row, col);
        tile.style.left = `${position.left}px`;
        tile.style.top = `${position.top}px`;
        tile.style.width = `${position.cellWidth}px`;
        tile.style.height = `${position.cellHeight}px`;

        // Add dataset attributes to track tile properties
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.dataset.value = value;

        // Add subtle entrance delay for new tiles
        if (!merged) {
            tile.style.animationDelay = `${Math.random() * 0.1}s`;
        }

        // Apply theme styling immediately based on current theme brightness
        applyThemingToTile(tile, themeBrightness);

        tileContainer.appendChild(tile);
        return tile;
    }

    function updateTilePosition(tile, row, col) {
        // Calculate position based on responsive grid
        const position = calculateTilePosition(row, col);
        tile.style.left = `${position.left}px`;
        tile.style.top = `${position.top}px`;
        tile.style.width = `${position.cellWidth}px`;
        tile.style.height = `${position.cellHeight}px`;

        // Update dataset attributes
        tile.dataset.row = row;
        tile.dataset.col = col;
    }

    function renderGrid(newGrid, mergedPositions = []) {
        // Get all existing tiles
        const existingTiles = Array.from(tileContainer.children);
        const existingTilesMap = new Map(); // Map to track positions of existing tiles
        const tilesToRemove = []; // Tiles that should be removed after animation
        const direction = lastMoveDirection; // Use the last move direction

        // First, map existing tiles by their positions
        existingTiles.forEach(tile => {
            const row = parseInt(tile.dataset.row);
            const col = parseInt(tile.dataset.col);
            const value = parseInt(tile.dataset.value);
            const key = `${row},${col}`;

            existingTilesMap.set(key, {
                element: tile,
                row,
                col,
                value
            });
        });

        // Track which tiles have been matched to new positions
        const usedTiles = new Set();
        const newTilePositions = []; // Store positions for tiles in the new grid

        // First, identify new tile positions
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const value = newGrid[row][col];
                if (value !== 0) {
                    newTilePositions.push({ row, col, value });
                }
            }
        }

        // Sort tile positions based on direction of movement
        // This ensures we prioritize matching tiles in the correct order
        if (direction === 'left') {
            newTilePositions.sort((a, b) => a.col - b.col); // Process left-most tiles first
        } else if (direction === 'right') {
            newTilePositions.sort((a, b) => b.col - a.col); // Process right-most tiles first
        } else if (direction === 'up') {
            newTilePositions.sort((a, b) => a.row - b.row); // Process top-most tiles first
        } else if (direction === 'down') {
            newTilePositions.sort((a, b) => b.row - a.row); // Process bottom-most tiles first
        }

        // Process each new tile position
        for (const { row, col, value } of newTilePositions) {
            const key = `${row},${col}`;
            const isMerged = mergedPositions.some(pos => pos.row === row && pos.col === col);

            // If this is a merged tile, create a new tile
            if (isMerged) {
                // Create new merged tile with animation
                addTile(row, col, value, true);

                // Mark existing tiles at this position for removal
                // (they'll be cleaned up after animation)
                if (existingTilesMap.has(key)) {
                    tilesToRemove.push(existingTilesMap.get(key).element);
                    existingTilesMap.delete(key);
                }
                continue;
            }

            // Try to find the best matching tile based on direction and value
            let bestMatchTile = null;
            let bestMatchKey = null;
            let bestMatchDistance = Infinity;

            // Search for matching value tiles that haven't been used yet
            for (const [mapKey, tileInfo] of existingTilesMap.entries()) {
                if (tileInfo.value === value && !usedTiles.has(mapKey)) {
                    // Calculate distance based on movement direction
                    let distance;
                    if (direction === 'left') {
                        // For left movement, tiles should only move leftward
                        if (tileInfo.col < col) continue; // Skip tiles that would move right
                        distance = tileInfo.row === row ? tileInfo.col - col : 1000; // Prioritize same row
                    } else if (direction === 'right') {
                        // For right movement, tiles should only move rightward
                        if (tileInfo.col > col) continue; // Skip tiles that would move left
                        distance = tileInfo.row === row ? col - tileInfo.col : 1000; // Prioritize same row
                    } else if (direction === 'up') {
                        // For upward movement, tiles should only move upward
                        if (tileInfo.row < row) continue; // Skip tiles that would move down
                        distance = tileInfo.col === col ? tileInfo.row - row : 1000; // Prioritize same column
                    } else if (direction === 'down') {
                        // For downward movement, tiles should only move downward
                        if (tileInfo.row > row) continue; // Skip tiles that would move up
                        distance = tileInfo.col === col ? row - tileInfo.row : 1000; // Prioritize same column
                    } else {
                        // If direction is unknown, use Manhattan distance
                        distance = Math.abs(tileInfo.row - row) + Math.abs(tileInfo.col - col);
                    }

                    if (distance < bestMatchDistance) {
                        bestMatchDistance = distance;
                        bestMatchTile = tileInfo.element;
                        bestMatchKey = mapKey;
                    }
                }
            }

            // If found a matching tile, update its position and mark as used
            if (bestMatchTile) {
                updateTilePosition(bestMatchTile, row, col);
                usedTiles.add(bestMatchKey);
                existingTilesMap.delete(bestMatchKey);
            } else {
                // Otherwise create a new tile
                addTile(row, col, value, false);
            }
        }

        // Remove tiles that are no longer needed after animations finish
        setTimeout(() => {
            // Remove any tiles that still exist in the map (they're not in the new grid)
            for (const [_, tileInfo] of existingTilesMap) {
                tileInfo.element.remove();
            }

            // Remove any tiles specifically marked for removal
            tilesToRemove.forEach(tile => tile.remove());
        }, ANIMATION_DURATION);
    }

    function hasWon() {
        // Check if any tile has reached 2048
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col] === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    // Add variable to track the last move direction
    let lastMoveDirection = null;

    function moveTiles(direction) {
        // If the game is over and user presses left, treat it as an undo action
        if (gameOver && direction === 'left' && !isAnimating && lastGameState) {
            undoMove();
            return true;
        }

        // Don't allow other moves during animations or if game is over
        if (isAnimating || (gameOver && !canContinue)) return false;

        // Save current state before making the move
        saveGameStateForUndo();

        // Store the direction for use in rendering
        lastMoveDirection = direction;

        let newGrid, mergedPositions = [];
        let moved = false, scoreAdd = 0;

        switch (direction) {
            case 'up':
                const resultUp = moveUp();
                newGrid = resultUp.grid;
                mergedPositions = resultUp.mergedPositions;
                moved = resultUp.moved;
                scoreAdd = resultUp.scoreAdd;
                break;
            case 'right':
                const resultRight = moveRight();
                newGrid = resultRight.grid;
                mergedPositions = resultRight.mergedPositions;
                moved = resultRight.moved;
                scoreAdd = resultRight.scoreAdd;
                break;
            case 'down':
                const resultDown = moveDown();
                newGrid = resultDown.grid;
                mergedPositions = resultDown.mergedPositions;
                moved = resultDown.moved;
                scoreAdd = resultDown.scoreAdd;
                break;
            case 'left':
                const resultLeft = moveLeft();
                newGrid = resultLeft.grid;
                mergedPositions = resultLeft.mergedPositions;
                moved = resultLeft.moved;
                scoreAdd = resultLeft.scoreAdd;
                break;
            default: return false;
        }

        if (moved) {
            isAnimating = true;
            grid = newGrid;
            score += scoreAdd;
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('bestScore', bestScore);
            }

            // Update score with animation
            updateScore(scoreAdd);

            // Render grid with merged positions for animation
            renderGrid(grid, mergedPositions);

            // Add new tile immediately instead of waiting for animations
            addRandomTile();

            // Check for win condition (tile with 2048)
            if (!gameWon && hasWon()) {
                gameWon = true;
                setTimeout(() => {
                    showGameMessage('You win!', 'game-won');
                }, ANIMATION_DURATION);
            }
            // Check for game over after new tile is added
            else if (!canMove()) {
                gameOver = true;
                setTimeout(() => {
                    showGameMessage('Game over!', 'game-over');
                }, ANIMATION_DURATION);
            }

            // Reset animation state after animations finish
            setTimeout(() => {
                isAnimating = false;

                // Save the game state after animations complete
                saveGameState();
            }, ANIMATION_DURATION);

            return true;
        } else {
            // If no move was made, nullify the saved state
            lastGameState = null;
            // Also disable the undo button
            undoButton.disabled = true;
            return false;
        }
    }

    function moveUp() {
        return processTiles('up', col => Array.from({ length: GRID_SIZE }, (_, row) => ({ row, col })));
    }

    function moveRight() {
        return processTiles('right', row => Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col: GRID_SIZE - 1 - col })));
    }

    function moveDown() {
        return processTiles('down', col => Array.from({ length: GRID_SIZE }, (_, row) => ({ row: GRID_SIZE - 1 - row, col })));
    }

    function moveLeft() {
        return processTiles('left', row => Array.from({ length: GRID_SIZE }, (_, col) => ({ row, col })));
    }

    function processTiles(direction, cellsProvider) {
        const newGrid = createEmptyGrid();
        let moved = false, scoreAdd = 0;
        const mergedPositions = [];

        for (let i = 0; i < GRID_SIZE; i++) {
            const cells = cellsProvider(i);
            const line = cells.map(cell => grid[cell.row][cell.col]);
            const result = mergeLine(line);

            scoreAdd += result.scoreAdd;
            if (result.moved) moved = true;

            // Add merged positions to track animations
            if (result.mergedIndices && result.mergedIndices.length > 0) {
                result.mergedIndices.forEach(mergedIndex => {
                    const cell = cells[mergedIndex];
                    mergedPositions.push({ row: cell.row, col: cell.col });
                });
            }

            cells.forEach((cell, index) => {
                newGrid[cell.row][cell.col] = result.line[index];
            });
        }

        return {
            grid: newGrid,
            moved,
            scoreAdd,
            mergedPositions
        };
    }

    function mergeLine(line) {
        const nonZeros = line.filter(v => v !== 0);
        const mergedLine = [];
        const mergedIndices = [];
        let scoreAdd = 0;
        let moved = nonZeros.length !== line.length; // If we filter zeros, that's a move

        for (let i = 0; i < nonZeros.length; i++) {
            if (i + 1 < nonZeros.length && nonZeros[i] === nonZeros[i + 1]) {
                const mergedValue = nonZeros[i] * 2;
                mergedLine.push(mergedValue);
                mergedIndices.push(mergedLine.length - 1); // Track which indices contain merged tiles
                scoreAdd += mergedValue;
                i++; // Skip the next tile since we merged it
                moved = true;
            } else {
                mergedLine.push(nonZeros[i]);
            }
        }

        // Fill the rest with zeros
        while (mergedLine.length < GRID_SIZE) mergedLine.push(0);

        return {
            line: mergedLine,
            moved,
            scoreAdd,
            mergedIndices
        };
    }

    function canMove() {
        // Check for empty cells
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col] === 0) return true;
            }
        }

        // Check for possible merges horizontally
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE - 1; col++) {
                if (grid[row][col] === grid[row][col + 1]) return true;
            }
        }

        // Check for possible merges vertically
        for (let row = 0; row < GRID_SIZE - 1; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (grid[row][col] === grid[row + 1][col]) return true;
            }
        }

        return false;
    }

    function showGameMessage(message, className) {
        // Add a small delay for better UX - allows animations to complete
        setTimeout(() => {
            messageText.textContent = message;
            gameMessage.classList.add(className);

            // Add fade-in effect
            gameMessage.style.opacity = 0;
            gameMessage.style.display = 'flex';

            // Force reflow
            void gameMessage.offsetWidth;

            // Fade in (accelerated)
            gameMessage.style.transition = 'opacity 0.1s ease-in-out';
            gameMessage.style.opacity = 1;
        }, ANIMATION_DURATION);
    }

    // Set up event handlers
    function setupEventHandlers() {
        // Direct button click handlers
        restartButton.addEventListener('click', () => {
            // Clear saved state when explicitly restarting
            clearAllGameData();
            initGame(false);  // Start new game, don't load saved state
        });

        retryButton.addEventListener('click', () => {
            // Clear saved state when retrying after game over
            clearAllGameData();
            initGame(false);  // Start new game, don't load saved state
        });

        undoButton.addEventListener('click', undoMove);

        // Initially disable undo button until a move is made
        undoButton.disabled = true;

        // Input Manager event handlers
        inputManager.on('move', (direction) => {
            moveTiles(direction);
        });

        inputManager.on('restart', () => {
            clearAllGameData();
            initGame(false);
        });

        inputManager.on('undo', () => {
            undoMove();
        });

        // Optional: add menu handler if implemented
        inputManager.on('menu', () => {
            console.log('Menu requested - not yet implemented');
            // Future implementation: show game menu
        });
    }

    // Main initialization
    function startGame() {
        setupEventHandlers();
        initAppearance();
        initGame();
    }

    // Start the game
    startGame();
});
