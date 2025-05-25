/**
 * @file storage.js
 * @description Handles local storage operations for user preferences and game state.
 */

const STORAGE_KEYS = {
    PIECE_SET: 'chess_piece_set',
    THEME: 'chess_theme',
    DIFFICULTY: 'chess_difficulty',
    GAME_STATE: 'chess_game_state'
};

/**
 * Saves a value to local storage.
 * @param {string} key - The key to store the value under.
 * @param {*} value - The value to store. Will be JSON.stringified if not a string.
 */
export function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        console.error(`Error saving to localStorage for key "${key}":`, e);
    }
}

/**
 * Retrieves a value from local storage.
 * @param {string} key - The key of the value to retrieve.
 * @param {*|null} defaultValue - The default value to return if the key is not found or an error occurs.
 * @returns {*} The retrieved value, or defaultValue if not found/error. Will be JSON.parsed if possible.
 */
export function getFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) {
            return defaultValue;
        }
        try {
            return JSON.parse(item);
        } catch (e) {
            return item; // Not a JSON string, return as is
        }
    } catch (e) {
        console.error(`Error retrieving from localStorage for key "${key}":`, e);
        return defaultValue;
    }
}

/**
 * Removes a value from local storage.
 * @param {string} key - The key of the value to remove.
 */
export function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error(`Error removing from localStorage for key "${key}":`, e);
    }
}

export { STORAGE_KEYS };
