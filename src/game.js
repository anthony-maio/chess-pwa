import { Chess } from 'chess.js';

/**
 * @class Game
 * @description Wraps the chess.js library to provide a clean interface for managing chess game logic.
 */
class Game {
    /**
     * @constructor
     * @description Initializes a new chess game instance.
     */
    constructor() {
        this.chess = new Chess();
    }

    /**
     * @method makeMove
     * @description Attempts to make a move on the board.
     * @param {object} move - The move object (e.g., { from: 'e2', to: 'e4', promotion: 'q' }).
     *                        The promotion property is optional.
     * @returns {object|null} The move object if successful (as returned by chess.js), null otherwise.
     */
    makeMove(move) {
        try {
            // The `move` method in chess.js returns null for illegal moves.
            // It can throw an error if the move object is malformed or in other rare cases.
            const result = this.chess.move(move);
            return result;
        } catch (error) {
            console.warn("Error making move:", move, error.message);
            return null;
        }
    }

    /**
     * @method getFen
     * @description Gets the Forsyth-Edwards Notation (FEN) string for the current game state.
     * @returns {string} The FEN string.
     */
    getFen() {
        return this.chess.fen();
    }

    /**
     * @method getLegalMoves
     * @description Gets all legal moves for a specific square.
     * @param {string} square - The square to get moves for (e.g., 'e2').
     * @returns {Array<object>} An array of verbose move objects. Each object includes details like
     *                          `from`, `to`, `piece`, `captured`, `promotion`, and `san`.
     *                          Returns an empty array if the square is invalid or has no legal moves.
     */
    getLegalMoves(square) {
        if (!square) {
            console.warn("getLegalMoves: square parameter is required.");
            // To maintain consistency with chess.js, which might return all moves if square is null/undefined,
            // it's better to explicitly return an empty array or handle as an error.
            // For this implementation, returning all moves if no square is provided, similar to chess.js's flexibility.
             return this.chess.moves({ verbose: true });
        }
        return this.chess.moves({ square: square, verbose: true });
    }
    
    /**
     * @method getAllLegalMoves
     * @description Gets all legal moves for the current player.
     * @returns {Array<object>} An array of verbose move objects for all possible moves in the current position.
     */
    getAllLegalMoves() {
        return this.chess.moves({ verbose: true });
    }

    /**
     * @method undoMove
     * @description Undoes the last move made in the game.
     * @returns {object|null} The undone move object, or null if no moves to undo.
     */
    undoMove() {
        return this.chess.undo();
    }

    /**
     * @method resetGame
     * @description Resets the game to its initial state (starting position).
     */
    resetGame() {
        this.chess.reset();
    }

    /**
     * @method loadFen
     * @description Loads a game state from a FEN string.
     * @param {string} fen - The FEN string to load.
     * @returns {boolean} True if the FEN was loaded successfully, false otherwise.
     *                    chess.js load method actually returns void and throws on error.
     *                    We'll wrap it to fit a boolean success pattern or let it throw.
     */
    loadFen(fen) {
        try {
            this.chess.load(fen);
            return true;
        } catch (error) {
            console.error("Failed to load FEN:", fen, error.message);
            return false;
        }
    }

    /**
     * @method getGameStatus
     * @description Gets the current status of the game (e.g., checkmate, stalemate, turn).
     * @returns {object} An object containing game status flags:
     *         - isCheckmate {boolean}
     *         - isStalemate {boolean}
     *         - isDraw {boolean} (covers threefold repetition, fifty-move rule, insufficient material)
     *         - isGameOver {boolean} (true if any of the above are true)
     *         - isCheck {boolean} (true if the current player is in check)
     *         - turn {string} ('w' for white's turn, 'b' for black's turn)
     */
    getGameStatus() {
        return {
            isCheckmate: this.chess.isCheckmate(),
            isStalemate: this.chess.isStalemate(),
            isDraw: this.chess.isDraw(),
            isGameOver: this.chess.isGameOver(),
            isCheck: this.chess.isCheck(),
            turn: this.chess.turn(),
        };
    }

    /**
     * @method getTurn
     * @description Gets whose turn it is.
     * @returns {string} 'w' if it's white's turn, 'b' if it's black's turn.
     */
    getTurn() {
        return this.chess.turn();
    }

    /**
     * @method getPiece
     * @description Gets the piece on a specific square.
     * @param {string} square - The square to query (e.g., 'e2').
     * @returns {object|null} An object like { type: 'p', color: 'w' } if a piece is on the square,
     *                        or null if the square is empty or invalid.
     */
    getPiece(square) {
        return this.chess.get(square);
    }

    /**
     * @method getCapturedPieces
     * @description Gets all captured pieces from the move history.
     * @returns {object} An object with 'white' and 'black' arrays containing captured pieces with counts.
     *                   Each item has { type: 'p', count: 2 } format.
     */
    getCapturedPieces() {
        const history = this.chess.history({ verbose: true });
        const captured = {
            white: {}, // pieces captured by white (black pieces)
            black: {}  // pieces captured by black (white pieces)
        };

        // Process move history to find captured pieces
        history.forEach(move => {
            if (move.captured) {
                // Determine which color captured the piece
                const capturingColor = move.color;
                const capturedList = capturingColor === 'w' ? captured.white : captured.black;
                
                // Increment count for this piece type
                if (!capturedList[move.captured]) {
                    capturedList[move.captured] = 0;
                }
                capturedList[move.captured]++;
            }
        });

        // Convert to array format with counts
        const formatCaptured = (capturedObj) => {
            return Object.entries(capturedObj).map(([type, count]) => ({
                type,
                count
            }));
        };

        return {
            white: formatCaptured(captured.white),
            black: formatCaptured(captured.black)
        };
    }
}

export default Game;
