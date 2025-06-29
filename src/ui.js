import { Chessground } from 'chessground';
import PieceManager from './pieces.js'; // Import PieceManager

// Import necessary CSS for chessground and pieces
import './assets/chessground.css';
import 'chessground/assets/chessground.base.css'; // Base styles
import 'chessground/assets/chessground.brown.css'; // Brown theme
import 'chessground/assets/chessground.cburnett.css'; // Cburnett pieces

class ChessUI {
    constructor(boardContainerElement, config = {}) {
        if (!boardContainerElement) {
            throw new Error("Board container element not provided for ChessUI.");
        }
        this.boardContainer = boardContainerElement;
        this.onUserMove = config.onUserMove || (() => {}); // Callback for when a user makes a move
        this.gameInstance = null; // Will be set by updateBoard or a dedicated method
        this.pieceManager = new PieceManager(); // Initialize PieceManager

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
            // Piece set will be loaded dynamically by PieceManager
        });

        // Ensure the board has the is2d class for CSS-based pieces
        boardContainerElement.classList.add('is2d');
        
        // Also ensure it has cg-wrap class (should already be added by chessground)
        if (!boardContainerElement.classList.contains('cg-wrap')) {
            boardContainerElement.classList.add('cg-wrap');
        }

        this.loadInitialPieceSet(); // Load the piece set saved in local storage or default
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

        const destsMap = this.calculateLegalDests(gameInstance); // This line is fine, it returns a Map

        this.ground.set({
            fen: fen,
            turnColor: turn === 'w' ? 'white' : 'black',
            movable: {
                color: turn === 'w' ? 'white' : 'black',
                dests: destsMap, // Ensure this is the Map object itself
                free: false,
                showDests: true,
            },
            check: gameStatus.isCheck ? this.findKing(gameInstance, turn) : null,
            lastMove: lastMoveForGround,
            // orientation: this.ground.state.orientation, // Keep current orientation
        });

        // Update captured pieces display
        this.updateCapturedPieces(gameInstance);
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
        console.log(`🎨 UI: Changing theme to: ${themeName}`);
        console.log(`🎨 UI: Board container:`, this.boardContainer);
        
        // The theme needs to be applied to the .cg-wrap element (board container)
        // From the logs, I can see the board container has class "cg-wrap"
        let cgWrap = this.boardContainer;
        
        // Verify it has the cg-wrap class
        if (!cgWrap.classList.contains('cg-wrap')) {
            cgWrap = this.boardContainer.querySelector('.cg-wrap');
        }
        
        console.log(`🎨 UI: Found target element:`, cgWrap);
        console.log(`🎨 UI: Element classes:`, cgWrap?.classList?.toString());
        
        if (cgWrap) {
            // Remove existing theme classes
            const themes = ['brown', 'blue', 'green', 'light', 'dark'];
            console.log(`🎨 UI: Before removing - classes: ${cgWrap.classList.toString()}`);
            themes.forEach(t => cgWrap.classList.remove(t));
            console.log(`🎨 UI: After removing - classes: ${cgWrap.classList.toString()}`);
            
            // Add new theme class
            cgWrap.classList.add(themeName);
            console.log(`✅ UI: Theme ${themeName} applied to chessboard.`);
            console.log(`🎨 UI: Final classes: ${cgWrap.classList.toString()}`);
            
            // Force a redraw
            setTimeout(() => {
                console.log(`🎨 UI: Forcing redraw for theme ${themeName}`);
                this.ground.redrawAll();
            }, 50);
        } else {
            console.error("❌ No suitable element found for theme switching.");
            console.log("🎨 UI: Board container HTML:", this.boardContainer.innerHTML);
        }
    }

    async setPieceStyle(styleName) {
        console.log(`♟️ UI: Attempting to set piece style to: ${styleName}`);
        
        try {
            // Dynamically load the CSS file for the piece style
            await this.loadPieceCSS(styleName);
            
            // Store the selection in localStorage via pieceManager
            await this.pieceManager.loadSet(styleName);
            
            console.log(`✅ UI: Piece style successfully set to ${styleName}.`);
        } catch (error) {
            console.error(`❌ UI: Error setting piece style to ${styleName}:`, error);
        }
    }

    async loadPieceCSS(styleName) {
        console.log(`♟️ Loading piece CSS for: ${styleName}`);
        
        // Remove existing piece style links
        const existingLinks = document.querySelectorAll('link[data-piece-style], style[data-piece-style]');
        console.log(`♟️ Removing ${existingLinks.length} existing piece CSS links`);
        existingLinks.forEach(link => link.remove());
        
        // Add new piece style CSS  
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${import.meta.env.BASE_URL}piece-css/${styleName}.css`;
        link.setAttribute('data-piece-style', styleName);
        
        console.log(`♟️ Loading CSS from: ${link.href}`);
        console.log(`♟️ BASE_URL is: ${import.meta.env.BASE_URL}`);
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn(`⏰ Timeout loading piece CSS: ${styleName}`);
                this.addPieceCSSBridge(styleName); // Add CSS bridge on timeout
                resolve(); // Continue even if timeout
            }, 5000);
            
            link.onload = () => {
                clearTimeout(timeout);
                console.log(`✅ Successfully loaded piece CSS: ${styleName}`);
                
                // Add CSS bridge to map chessground selectors to piece set selectors
                this.addPieceCSSBridge(styleName);
                
                // Debug: Check what piece elements exist
                const pieceElements = document.querySelectorAll('piece');
                console.log(`♟️ Found ${pieceElements.length} piece elements`);
                if (pieceElements.length > 0) {
                    const firstPiece = pieceElements[0];
                    console.log(`♟️ First piece classes:`, firstPiece.className);
                    console.log(`♟️ First piece HTML:`, firstPiece.outerHTML);
                }
                
                // Force a board redraw
                setTimeout(() => {
                    this.ground.redrawAll();
                }, 100);
                resolve();
            };
            link.onerror = () => {
                clearTimeout(timeout);
                console.error(`❌ Failed to load piece CSS: ${styleName} from ${link.href}`);
                console.log(`♟️ Falling back to default pieces`);
                this.addPieceCSSBridge(styleName); // Add CSS bridge on error too
                resolve(); // Don't reject, just continue
            };
            document.head.appendChild(link);
        });
    }

    addPieceCSSBridge(styleName) {
        // The piece CSS files use .is2d selectors, but we need .cg-wrap selectors
        // We'll fetch the loaded CSS and rewrite the selectors
        
        setTimeout(() => {
            // Get all stylesheets
            const stylesheets = Array.from(document.styleSheets);
            const pieceStylesheet = stylesheets.find(sheet => {
                try {
                    return sheet.href && sheet.href.includes(`piece-css/${styleName}.css`);
                } catch (e) {
                    return false;
                }
            });
            
            if (pieceStylesheet) {
                try {
                    const bridgeStyle = document.createElement('style');
                    bridgeStyle.setAttribute('data-piece-style', `${styleName}-bridge`);
                    
                    // Create CSS rules that map .is2d selectors to .cg-wrap selectors
                    const cssRules = Array.from(pieceStylesheet.cssRules || []);
                    let bridgeCSS = `/* CSS Bridge for ${styleName} piece set */\n`;
                    
                    cssRules.forEach(rule => {
                        if (rule.selectorText && rule.selectorText.includes('.is2d')) {
                            // Convert .is2d .pawn.white to .cg-wrap piece.white.pawn
                            const newSelector = rule.selectorText
                                .replace(/\.is2d\s+\.(\w+)\.(\w+)/g, '.cg-wrap piece.$2.$1')
                                .replace(/\.is2d\s+\.(\w+)\s+\.(\w+)/g, '.cg-wrap piece.$2.$1');
                            
                            bridgeCSS += `${newSelector} { ${rule.style.cssText} }\n`;
                        }
                    });
                    
                    bridgeStyle.textContent = bridgeCSS;
                    document.head.appendChild(bridgeStyle);
                    console.log(`♟️ Added CSS bridge for ${styleName} with ${cssRules.length} rules`);
                    
                } catch (error) {
                    console.warn(`♟️ Could not read CSS rules for ${styleName}:`, error);
                    // Fallback: just ensure the .is2d class is present
                    this.boardContainer.classList.add('is2d');
                }
            } else {
                console.warn(`♟️ Could not find stylesheet for ${styleName}`);
                // Fallback: just ensure the .is2d class is present
                this.boardContainer.classList.add('is2d');
            }
        }, 100); // Small delay to ensure CSS is loaded
    }

    async loadInitialPieceSet() {
        const initialSet = this.pieceManager.getSelectedSet() || 'horsey';
        console.log(`UI: Loading initial piece set: ${initialSet}`);
        await this.setPieceStyle(initialSet); // Use the setPieceStyle method to load and apply
    }

    // Update the captured pieces display
    updateCapturedPieces(gameInstance) {
        if (!gameInstance) return;

        const captured = gameInstance.getCapturedPieces();
        const currentPieceStyle = this.pieceManager.getSelectedSet() || 'horsey';

        // Update white captures (pieces captured by white)
        this.updateCapturedPanel('white-captures', captured.white, 'black', currentPieceStyle);
        
        // Update black captures (pieces captured by black)
        this.updateCapturedPanel('black-captures', captured.black, 'white', currentPieceStyle);
    }

    // Update a single captured pieces panel
    updateCapturedPanel(panelId, capturedPieces, pieceColor, pieceStyle) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const listContainer = panel.querySelector('.captured-pieces-list');
        if (!listContainer) return;

        // Clear existing content
        listContainer.innerHTML = '';

        // Sort pieces by type (pawns first, then pieces in standard order)
        const pieceOrder = ['p', 'n', 'b', 'r', 'q'];
        capturedPieces.sort((a, b) => {
            return pieceOrder.indexOf(a.type) - pieceOrder.indexOf(b.type);
        });

        // Create elements for each captured piece type
        capturedPieces.forEach(({ type, count }) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'captured-pieces-item';

            // Create piece icon
            const iconSpan = document.createElement('span');
            iconSpan.className = 'captured-piece-icon';
            
            // Map piece type to class name
            const pieceClassMap = {
                'p': 'pawn',
                'n': 'knight',
                'b': 'bishop',
                'r': 'rook',
                'q': 'queen',
                'k': 'king' // shouldn't happen but included for completeness
            };
            
            const pieceClass = pieceClassMap[type] || type;
            
            // Set background image using the current piece style
            // Convert pieceColor from 'white'/'black' to 'w'/'b'
            const colorLetter = pieceColor === 'white' ? 'w' : 'b';
            const pieceUrl = `${import.meta.env.BASE_URL}pieces/${pieceStyle}/${colorLetter}${type.toUpperCase()}.svg`;
            iconSpan.style.backgroundImage = `url(${pieceUrl})`;

            // Create count text
            const countSpan = document.createElement('span');
            countSpan.className = 'captured-piece-count';
            countSpan.textContent = `×${count}`;

            itemDiv.appendChild(iconSpan);
            itemDiv.appendChild(countSpan);
            listContainer.appendChild(itemDiv);
        });

        // If no captured pieces, show a placeholder
        if (capturedPieces.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'text-xs text-gray-400 text-center';
            placeholder.textContent = 'None';
            listContainer.appendChild(placeholder);
        }
    }
}

export default ChessUI;
