import { saveToLocalStorage, getFromLocalStorage, STORAGE_KEYS } from './storage.js';

/**
 * @class PieceManager
 * @description Manages loading and persisting the user's selected chess piece set.
 */
class PieceManager {
    constructor() {
        this.selectedSet = getFromLocalStorage(STORAGE_KEYS.PIECE_SET, 'cburnett'); // Default to 'cburnett'
    }

    /**
     * Gets the currently selected piece set name.
     * @returns {string} The name of the selected piece set.
     */
    getSelectedSet() {
        return this.selectedSet;
    }

    /**
     * Loads a specific piece set by dynamically importing its SVG data.
     * @param {string} setName - The name of the piece set to load (e.g., 'alpha', 'merida').
     * @returns {Promise<object>} A promise that resolves with the SVG piece data.
     */
    async loadSet(setName) {
        try {
            // Validate setName to prevent path traversal issues
            if (!/^[a-zA-Z0-9_-]+$/.test(setName)) {
                console.error(`Invalid piece set name: ${setName}`);
                return null;
            }

            // Dynamically import the SVG data for the selected piece set.
            // The path assumes piece sets are structured under public/pieces/[setName]/index.js
            // The actual SVG data should be exported from these index.js files.
            const pieceSetModule = await import(`../public/pieces/${setName}/index.js`);
            
            this.selectedSet = setName;
            saveToLocalStorage(STORAGE_KEYS.PIECE_SET, setName);
            
            return pieceSetModule.default; // Assuming default export of SVG data
        } catch (error) {
            console.error(`Failed to load piece set "${setName}":`, error);
            // Fallback to a default set or return null/throw error as appropriate
            return null; 
        }
    }
}

export default PieceManager;