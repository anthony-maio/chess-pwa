import { Chessground } from 'chessground';

// Import necessary CSS for chessground
// These paths assume Vite can resolve them from node_modules.
// 'chessground/dist/chessground.css' usually includes base styles and a default theme (like brown).
// 'chessground/dist/pieces/cburnett.css' is for the cburnett piece style.
import 'chessground/dist/chessground.css'; 
import 'chessground/dist/pieces/cburnett.css'; 
// If specific themes like 'blue' are needed, their CSS would also be imported, e.g.:
// import 'chessground/dist/theme/blue.css'; // Or similar path

class ChessUI {
    constructor(boardContainerElement, config = {}) {
        if (!boardContainerElement) {
            throw new Error("Board container element not provided for ChessUI.");
        }
        this.boardContainer = boardContainerElement;
        this.onUserMove = config.onUserMove || (() => {}); // Callback for when a user makes a move
        this.gameInstance = null; // Will be set by updateBoard or a dedicated method

        // Initial Chessground configuration
        this.ground = Chessground(boardContainerElement, {
            movable: {
                color: 'white', // Only white can move initially
                free: false,    // Moves are restricted by game rules
                dests: new Map(), // Initially empty, will be populated by updateBoard
                showDests: true,
            },
            events: {
                move: (orig, dest, capturedPiece) => {
                    // Pass the move to the main logic controller (via callback)
                    this.onUserMove(orig, dest);
                },
                select: (key) => { 
                    // When a square is selected, show legal moves for that piece
                    if (this.gameInstance) {
                        this.showLegalMovesForPiece(this.gameInstance, key);
                    }
                }
            },
            orientation: 'white', // Default player's perspective
            turnColor: 'white',   // Color of the side to move
            check: null,          // Key of the king in check, or false/null
            lastMove: null,       // Array [orig, dest] of the last move
            // Default theme (brown) and piece set (cburnett) are usually applied via imported CSS.
            // Additional themes/piece sets would require loading their respective CSS files.
        });
    }

    // Calculate legal destinations for chessground based on the game instance
    calculateLegalDests(gameInstance) {
        if (!gameInstance) {
            return new Map();
        }
        const dests = new Map();
        // Ensure getAllLegalMoves returns moves in a format suitable for Chessground:
        // [{ from: 'e2', to: 'e4', san: 'e4', ...}, ...]
        const legalMoves = gameInstance.getAllLegalMoves(); 
        
        legalMoves.forEach(move => {
            if (!dests.has(move.from)) {
                dests.set(move.from, []);
            }
            dests.get(move.from).push(move.to);
        });
        return dests;
    }

    // Update the board display based on the game state from our Game class
    updateBoard(gameInstance) {
        if (!gameInstance) return;
        this.gameInstance = gameInstance; // Store for use in 'select' event

        const fen = gameInstance.getFen();
        const turn = gameInstance.getTurn(); // 'w' or 'b'
        const gameStatus = gameInstance.getGameStatus(); // { isCheck, isCheckmate, ... }
        
        // Get last move from game history for highlighting
        const lastMoveArray = gameInstance.chess.history({ verbose: true }).slice(-1)[0]; // More concise
        const lastMoveForGround = lastMoveArray ? [lastMoveArray.from, lastMoveArray.to] : null;

        this.ground.set({
            fen: fen,
            turnColor: turn === 'w' ? 'white' : 'black',
            movable: {
                color: turn === 'w' ? 'white' : 'black', // Player whose turn it is
                dests: this.calculateLegalDests(gameInstance),
                free: false, // Always restricted by game rules
                showDests: true,
            },
            check: gameStatus.isCheck ? this.findKing(gameInstance, turn) : null,
            lastMove: lastMoveForGround,
            // orientation: this.ground.state.orientation, // Keep current orientation
        });
    }
    
    // Helper to find the king's square for check highlighting
    findKing(gameInstance, kingColorChar) { // kingColorChar is 'w' or 'b'
        if (!gameInstance) return null;
        const board = gameInstance.chess.board(); // Access internal chess.js board representation
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                const pieceOnSquare = board[r][c];
                if (pieceOnSquare && pieceOnSquare.type === 'k' && pieceOnSquare.color === kingColorChar) {
                    return `${String.fromCharCode(97 + c)}${8 - r}`; // Convert 0-indexed row/col to algebraic
                }
            }
        }
        return null; // Should not happen in a valid game with a king
    }

    // Flip the board orientation
    flipBoard() {
        const currentOrientation = this.ground.state.orientation;
        this.ground.set({
            orientation: currentOrientation === 'white' ? 'black' : 'white'
        });
    }

    // Set a callback for when a user attempts a move
    setOnUserMove(callback) {
        this.onUserMove = callback;
    }

    // Show legal moves for a piece when its square is clicked (uses 'select' event)
    showLegalMovesForPiece(gameInstance, squareKey) {
        if (!gameInstance || !squareKey) return;

        const piece = gameInstance.getPiece(squareKey);
        if (!piece || piece.color !== gameInstance.getTurn()) {
             // If no piece or not the current player's piece, clear custom highlights or do nothing.
             // Chessground's default movable.dests will still apply for the current player.
            return;
        }

        const legalMovesForSquare = gameInstance.getLegalMoves(squareKey); // from game.js
        
        // Chessground's primary way to show valid moves is via `movable.dests`.
        // The `select` event can be used to augment this, e.g., by highlighting
        // the selected piece or by drawing custom shapes for its moves if needed.
        // For standard dotted legal moves, ensuring movable.dests is correctly
        // populated (as done in updateBoard) is key.
        // If you want to highlight the selected square itself:
        // this.ground.selectSquare(squareKey); // This is automatically handled if `selectable: true`
                                            // or by clicking if `selectable.enabled: true`

        // The current setup with `movable.dests` updated in `updateBoard` and on `select`
        // (if we were to modify `movable.dests` here for *only* the selected piece)
        // should be sufficient. The `showDests: true` in `movable` config handles the dots.
        // No specific `this.ground.set` call is strictly needed here if `updateBoard`
        // already sets comprehensive `movable.dests` for the current player.
        // However, if we want to *only* show moves for the *selected* piece after a click,
        // we would modify `movable.dests` here.
        
        // For this implementation, we'll rely on the main `movable.dests` from `updateBoard`.
        // The `select` event is more for knowing *which* piece the user clicked.
        // If we wanted to draw different types of highlights (e.g. circles instead of dots)
        // for the selected piece, we'd use ground.setShapes().
        
        // console.log(`Piece ${squareKey} selected. Legal moves:`, legalMovesForSquare.map(m => m.to));
    }

    // Update board theme (placeholder - requires CSS management)
    setTheme(themeName) {
        console.log(`UI: Theme selected - ${themeName}. Ensure CSS for this theme is loaded.`);
        // Example of how one might switch themes if CSS classes are used:
        // Remove old theme classes from this.boardContainer, add new one.
        // e.g., this.boardContainer.classList.remove('brown', 'blue');
        // this.boardContainer.classList.add(themeName);
        // Chessground itself doesn't have a theme setter; it's CSS-driven.
        // The boardContainer needs to be styled by chessground.css and theme files.
        // For example, the 'chessground.brown.css' might apply styles to elements with a 'brown' class.
        // Or themes might be distinct CSS files that are loaded/unloaded.
        // A simple approach is to ensure all theme CSS files are imported if small,
        // and then change a class on a parent element that Chessground's CSS selectors target.
        // Chessground typically has classes like `cg-wrap.brown` or similar.
        // We'd need to ensure `boardContainerElement` can have its class changed to affect the theme.
        // Chessground's DOM structure: boardContainerElement -> cg-wrap -> cg-board
        const cgWrap = this.boardContainer.querySelector('.cg-wrap');
        if (cgWrap) {
            // Remove existing theme classes (brown, blue, etc.)
            const themes = ['brown', 'blue', 'green', 'light', 'dark']; // Add all supported theme names
            themes.forEach(t => cgWrap.classList.remove(t));
            // Add new theme class
            cgWrap.classList.add(themeName);

            // Also ensure the main CSS file (e.g. chessground.css) and the specific theme CSS (e.g. blue.css) are loaded.
            // For example, if `chessground/dist/theme/blue.css` contains `.cg-wrap.blue { ... }`
        } else {
            console.warn("Chessground wrapper not found for theme switching.");
        }
    }

    // Update piece style (placeholder - requires CSS management or re-init)
    setPieceStyle(styleName) {
        console.log(`UI: Piece style selected - ${styleName}. Ensure CSS/assets for this style are handled.`);
        // Piece styles are also CSS-driven. E.g., `chessground.cburnett.css`, `chessground.merida.css`.
        // Similar to themes, one would typically switch CSS files or classes.
        // Chessground might also allow `piece.assetPath` in `set` if pieces are individual SVGs.
        // For CSS-based piece sets (like cburnett, merida from chessground distribution):
        // The piece CSS files often target classes on the `cg-wrap` or `cg-board` element.
        const cgWrap = this.boardContainer.querySelector('.cg-wrap');
        if (cgWrap) {
            // Remove existing piece style classes
            const pieceStyles = ['cburnett', 'merida', 'leipzig', 'alpha']; // Add all supported piece style names
            pieceStyles.forEach(ps => cgWrap.classList.remove(`piece-style-${ps}`)); // Assuming a convention like .piece-style-cburnett
            // Add new piece style class
            cgWrap.classList.add(`piece-style-${styleName}`);
            
            // This requires that the CSS for each piece style (e.g., chessground.merida.css)
            // is loaded and uses selectors like `.cg-wrap.piece-style-merida piece { ... }`.
            // Chessground's default piece CSS (e.g., chessground.cburnett.css) might apply styles directly
            // without needing an extra class if it's the only one loaded. If multiple are loaded,
            // they need to be scoped or switched.
            // For this to work, the individual piece style CSS files (e.g. chessground/dist/pieces/merida.css)
            // must be imported in main.js or ui.js.
        } else {
            console.warn("Chessground wrapper not found for piece style switching.");
        }
        // If piece styles are managed by `pieces.assetPath` (e.g., for custom SVG sets not part of chessground dist):
        // this.ground.set({ pieces: { assetPath: `/path/to/pieces/${styleName}/` } });
        // This would then require `main.js` to provide these assets.
    }
}

export default ChessUI;
