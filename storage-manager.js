/**
 * Storage Manager - Handles game state persistence
 * Uses localForage for better storage capabilities and fallbacks
 */

export default class StorageManager {
    constructor(options = {}) {
        // Set up the storage namespace to avoid conflicts with other games/apps
        this.namespace = options.namespace || '2048-game';

        // Initialize localForage with custom settings
        localforage.config({
            name: this.namespace,
            storeName: 'gameData',
            description: '2048 Game Data Storage',
            // Preferred storage drivers in order of priority
            driver: [
                localforage.INDEXEDDB,
                localforage.WEBSQL,
                localforage.LOCALSTORAGE
            ]
        });

        // Keys for different types of stored data
        this.GAME_STATE_KEY = 'gameState';
        this.BEST_SCORE_KEY = 'bestScore';
        this.SETTINGS_KEY = 'settings';
        this.STATS_KEY = 'statistics';
        this.THEME_KEY = 'theme';
    }

    /**
     * Save the current game state
     * @param {Object} gameState - Current game state object
     * @returns {Promise<void>}
     */
    async saveGameState(gameState) {
        try {
            await localforage.setItem(this.GAME_STATE_KEY, gameState);
            console.log('Game state saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return this.fallbackSave(this.GAME_STATE_KEY, gameState);
        }
    }

    /**
     * Load the saved game state
     * @returns {Promise<Object|null>} The saved game state or null if not found
     */
    async loadGameState() {
        try {
            const state = await localforage.getItem(this.GAME_STATE_KEY);
            if (state) {
                console.log('Game state loaded successfully');
                return state;
            }
            return null;
        } catch (error) {
            console.error('Error loading game state:', error);
            return this.fallbackLoad(this.GAME_STATE_KEY);
        }
    }

    /**
     * Save best score
     * @param {number} score - Best score value
     * @returns {Promise<boolean>} Success indicator
     */
    async saveBestScore(score) {
        try {
            await localforage.setItem(this.BEST_SCORE_KEY, score);
            return true;
        } catch (error) {
            console.error('Error saving best score:', error);
            return this.fallbackSave(this.BEST_SCORE_KEY, score);
        }
    }

    /**
     * Load best score
     * @returns {Promise<number>} The best score or 0 if not found
     */
    async loadBestScore() {
        try {
            const score = await localforage.getItem(this.BEST_SCORE_KEY);
            return score || 0;
        } catch (error) {
            console.error('Error loading best score:', error);
            return this.fallbackLoad(this.BEST_SCORE_KEY) || 0;
        }
    }

    /**
     * Save user theme preference
     * @param {number} brightness - Theme brightness value between 0-1
     * @returns {Promise<boolean>} Success indicator
     */
    async saveTheme(brightness) {
        try {
            await localforage.setItem(this.THEME_KEY, brightness);
            return true;
        } catch (error) {
            console.error('Error saving theme:', error);
            return this.fallbackSave(this.THEME_KEY, brightness);
        }
    }

    /**
     * Load user theme preference
     * @returns {Promise<number>} The theme brightness (0-1) or 1 if not found
     */
    async loadTheme() {
        try {
            const brightness = await localforage.getItem(this.THEME_KEY);
            return brightness !== null ? brightness : 1; // Default to light theme
        } catch (error) {
            console.error('Error loading theme:', error);
            return this.fallbackLoad(this.THEME_KEY) || 1;
        }
    }

    /**
     * Save game settings
     * @param {Object} settings - Game settings object
     * @returns {Promise<boolean>} Success indicator
     */
    async saveSettings(settings) {
        try {
            await localforage.setItem(this.SETTINGS_KEY, settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return this.fallbackSave(this.SETTINGS_KEY, settings);
        }
    }

    /**
     * Load game settings
     * @returns {Promise<Object>} Game settings or default settings if not found
     */
    async loadSettings() {
        try {
            const settings = await localforage.getItem(this.SETTINGS_KEY);
            return settings || this.getDefaultSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.fallbackLoad(this.SETTINGS_KEY) || this.getDefaultSettings();
        }
    }

    /**
     * Default settings for the game
     * @returns {Object} Default settings object
     */
    getDefaultSettings() {
        return {
            animationSpeed: 1, // normal speed
            gridSize: 4,
            undoPenaltyMultiplier: 1.33,
            enableVibration: true
        };
    }

    /**
     * Save game statistics
     * @param {Object} stats - Game statistics object
     * @returns {Promise<boolean>} Success indicator
     */
    async saveStats(stats) {
        try {
            await localforage.setItem(this.STATS_KEY, stats);
            return true;
        } catch (error) {
            console.error('Error saving statistics:', error);
            return this.fallbackSave(this.STATS_KEY, stats);
        }
    }

    /**
     * Load game statistics
     * @returns {Promise<Object>} Game statistics or empty stats object if not found
     */
    async loadStats() {
        try {
            const stats = await localforage.getItem(this.STATS_KEY);
            return stats || this.getEmptyStats();
        } catch (error) {
            console.error('Error loading statistics:', error);
            return this.fallbackLoad(this.STATS_KEY) || this.getEmptyStats();
        }
    }

    /**
     * Empty statistics object structure
     * @returns {Object} Empty statistics object
     */
    getEmptyStats() {
        return {
            gamesPlayed: 0,
            wins: 0,
            bestTime: 0,
            totalPlayTime: 0,
            highestTile: 0,
            movesMade: 0,
            undoCount: 0,
            history: []
        };
    }

    /**
     * Clear all game data
     * @returns {Promise<boolean>} Success indicator
     */
    async clearAllData() {
        try {
            await localforage.clear();
            console.log('All game data cleared');

            // Also clear any localStorage fallbacks
            localStorage.removeItem(`${this.namespace}-${this.GAME_STATE_KEY}`);
            localStorage.removeItem(`${this.namespace}-${this.BEST_SCORE_KEY}`);
            localStorage.removeItem(`${this.namespace}-${this.SETTINGS_KEY}`);
            localStorage.removeItem(`${this.namespace}-${this.STATS_KEY}`);
            localStorage.removeItem(`${this.namespace}-${this.THEME_KEY}`);

            return true;
        } catch (error) {
            console.error('Error clearing game data:', error);
            return false;
        }
    }

    /**
     * Fallback to localStorage if localforage fails when saving
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success indicator
     */
    fallbackSave(key, value) {
        try {
            localStorage.setItem(`${this.namespace}-${key}`, JSON.stringify(value));
            console.log(`Fallback save for ${key} successful`);
            return true;
        } catch (e) {
            console.error(`Fallback save for ${key} failed:`, e);
            return false;
        }
    }

    /**
     * Fallback to localStorage if localforage fails when loading
     * @param {string} key - Storage key
     * @returns {*|null} The loaded value or null if not found
     */
    fallbackLoad(key) {
        try {
            const value = localStorage.getItem(`${this.namespace}-${key}`);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error(`Fallback load for ${key} failed:`, e);
            return null;
        }
    }
}
