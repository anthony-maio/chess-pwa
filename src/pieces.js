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
     * Loads a specific piece set by fetching SVG URLs from the public directory.
     * @param {string} setName - The name of the piece set to load (e.g., 'alpha', 'merida').
     * @returns {Promise<object>} A promise that resolves with the SVG piece data URLs.
     */
    async loadSet(setName) {
        try {
            // Validate setName to prevent path traversal issues
            if (!/^[a-zA-Z0-9_-]+$/.test(setName)) {
                console.error(`Invalid piece set name: ${setName}`);
                return null;
            }

            // List of all standard chess piece codes
            const pieceCodes = [
                'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',
                'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'
            ];
            const pieces = {};
            for (const code of pieceCodes) {
                // Construct the URL to the SVG in the public directory
                pieces[code] = `/pieces/${setName}/${code}.svg`;
            }

            this.selectedSet = setName;
            saveToLocalStorage(STORAGE_KEYS.PIECE_SET, setName);
            return pieces;
        } catch (error) {
            console.error(`Failed to load piece set "${setName}":`, error);
            return null;
        }
    }
}

export default PieceManager;