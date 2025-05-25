import Game from './game.js';
import ChessUI from './ui.js';
import * as ai from './ai.js'; // Import AI module

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // --- DOM Element References ---
    const boardContainer = document.getElementById('board-container');
    const statusBar = document.getElementById('status-bar');
    const newGameBtn = document.getElementById('new-game-btn');
    const undoBtn = document.getElementById('undo-btn');
    const flipBoardBtn = document.getElementById('flip-board-btn');
    const themeSelector = document.getElementById('theme-selector');
    const pieceStyleSelector = document.getElementById('piece-style-selector');
    const difficultySelector = document.getElementById('difficulty-selector');

    // --- AI State Variables ---
    let isAIActive = false; // True when AI is playing
    let currentDifficulty = "Medium"; // Default difficulty
    let playerColor = 'w';    // Player is White, AI is Black
    let aiReady = false;      // True when AI engine has initialized

    // --- Check for critical DOM elements ---
    if (!boardContainer) {
        console.error("Board container element (#board-container) not found. Chess UI cannot be initialized.");
        return;
    }
    if (!statusBar) {
        console.warn("Status bar element (#status-bar) not found. Game status will not be displayed.");
    }
    // Disable difficulty selector until AI is ready
    if (difficultySelector) {
        difficultySelector.disabled = true;
        currentDifficulty = difficultySelector.value || "Medium"; // Initialize from selector
    }

    // --- `handleUserMove` Function ---
    const handleUserMove = (from, to) => {
        if (game.getTurn() !== playerColor && isAIActive) {
            console.log("Not player's turn or AI is active and it's AI's turn.");
            return; // Prevent moves if it's not the player's turn (e.g. AI is thinking)
        }

        const move = game.makeMove({ from, to });
        
        if (move) {
            ui.updateBoard(game);
            updateStatus();
            
            const gameStatus = game.getGameStatus();
            if (isAIActive && !gameStatus.isGameOver && game.getTurn() !== playerColor && aiReady) {
                statusBar.textContent = "AI is thinking...";
                ui.ground.set({ viewOnly: true }); 

                setTimeout(() => {
                    ai.requestAIMove(game.getFen(), currentDifficulty);
                }, 500);
            } else if (gameStatus.isGameOver) {
                // Handle game over after player's move
                updateStatus(); // updateStatus already shows checkmate/stalemate messages
            }
        } else {
            console.warn("Invalid move attempted by user:", { from, to });
        }
    };

    // --- Instantiate ChessUI ---
    const ui = new ChessUI(boardContainer, { onUserMove: handleUserMove });

    // --- Initialize AI ---
    ai.initAI(
        (error) => { // onAIReadyCallback
            if (error) {
                console.error("AI failed to initialize:", error);
                if (statusBar) statusBar.textContent = "AI opponent failed to load. Playing locally.";
                aiReady = false;
                isAIActive = false; // Cannot use AI
                if (difficultySelector) difficultySelector.disabled = true;
            } else {
                console.log("AI initialized successfully.");
                aiReady = true;
                isAIActive = true; // Enable AI play by default
                if (difficultySelector) {
                    difficultySelector.disabled = false;
                    currentDifficulty = difficultySelector.value; // Ensure it's current
                }
                if (statusBar) statusBar.textContent = "AI ready. Player's turn.";
                // Check if AI should make a move immediately (e.g. if player is Black)
                // For now, player is White, so AI waits for player's first move.
                updateStatus(); 
            }
        },
        (move) => { // onAIMoveCallback (AI made a move)
            ui.ground.set({ viewOnly: false }); // Re-enable player interaction
            if (move) {
                console.log("AI move received:", move);
                const from = move.substring(0, 2);
                const to = move.substring(2, 4);
                let promotion;
                if (move.length === 5) { // e.g., e7e8q
                    promotion = move.substring(4);
                }

                const aiMoveResult = game.makeMove({ from, to, promotion });
                if (aiMoveResult) {
                    ui.updateBoard(game);
                } else {
                    console.error("AI made an invalid move:", move);
                    if (statusBar) statusBar.textContent = "AI error. Please undo or restart.";
                }
            } else {
                 console.warn("AI returned no move or an error.");
                 if (statusBar) statusBar.textContent = "AI is thinking or encountered an issue...";
            }
            updateStatus(); // Update status after AI move (checks for checkmate, etc.)
        }
    );

    // --- `updateStatus` Function ---
    function updateStatus() {
        if (!statusBar) return;

        const status = game.getGameStatus();
        let message = '';

        if (status.isCheckmate) {
            message = `Checkmate! ${status.turn === playerColor ? 'AI' : 'Player'} wins.`;
        } else if (status.isStalemate) {
            message = 'Stalemate. Game is a draw.';
        } else if (status.isDraw) {
            message = 'Draw by rule (e.g., 50-move, threefold repetition, or insufficient material).';
        } else {
            if (isAIActive && game.getTurn() !== playerColor && !status.isGameOver && aiReady) {
                message = 'AI is thinking...';
            } else if (isAIActive && game.getTurn() === playerColor && !status.isGameOver && aiReady) {
                message = `Player (${playerColor === 'w' ? 'White' : 'Black'}) to move.`;
            } else if (!isAIActive) { // Local two-player game
                 message = `${status.turn === 'w' ? 'White' : 'Black'} to move.`;
            } else {
                 message = "Game starting or AI initializing...";
            }
            
            if (status.isCheck && ( (isAIActive && game.getTurn() === playerColor) || !isAIActive) ) {
                message += ' (Check!)'; // Show check only if it's player's turn or local game
            }
        }

        // --- Add Move History ---
        const history = game.chess.history();
        let formattedHistory = "";
        if (history.length > 0) {
            for (let i = 0; i < history.length; i += 2) {
                formattedHistory += `${(i / 2) + 1}. ${history[i]}`;
                if (history[i+1]) {
                    formattedHistory += ` ${history[i+1]}`;
                }
                // Add a space after each pair or single move, trim at the end
                formattedHistory += " "; 
            }
            formattedHistory = formattedHistory.trim();
            
            // Append to the status message, perhaps with a clear separator
            // Using a newline for potential multi-line display in the status bar
            message += `\nHistory: ${formattedHistory}`;
        }
        // --- End Add Move History ---

        statusBar.textContent = message;
    }

    // --- Event Listeners for UI Controls ---
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            game.resetGame();
            playerColor = 'w'; // Player always starts as white for now
            ui.ground.set({ 
                orientation: 'white', // Player's perspective
                viewOnly: false      // Ensure board is interactive
            }); 
            ui.updateBoard(game);
            updateStatus();

            // AI doesn't move first if player is white.
            // If player could choose black, logic here would trigger AI's first move if aiReady.
            // e.g., if (isAIActive && playerColor === 'b' && aiReady && !game.getGameStatus().isGameOver) { ... }
            console.log("New game started. Player as White.");
        });
    }

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            let movesToUndo = 0;
            if (isAIActive) {
                // If it's AI's turn to move (meaning player just moved), undo player's move.
                if (game.getTurn() !== playerColor && game.chess.history().length > 0) {
                    movesToUndo = 1; 
                } 
                // If it's player's turn (meaning AI just moved), undo AI's move and player's previous move.
                else if (game.getTurn() === playerColor && game.chess.history().length >= 2) {
                    movesToUndo = 2;
                }
                 else if (game.chess.history().length > 0) { // Fallback for single move if history is short
                    movesToUndo = 1;
                }
            } else { // Not AI active, standard undo
                if (game.chess.history().length > 0) {
                    movesToUndo = 1;
                }
            }

            for (let i = 0; i < movesToUndo; i++) {
                game.undoMove();
            }

            ui.updateBoard(game);
            updateStatus();
            ui.ground.set({ viewOnly: false }); // Ensure board is interactive
            
            // If after undoing, it becomes AI's turn, trigger AI
            const gameStatus = game.getGameStatus();
            if (isAIActive && !gameStatus.isGameOver && game.getTurn() !== playerColor && aiReady) {
                statusBar.textContent = "AI is thinking...";
                ui.ground.set({ viewOnly: true });
                setTimeout(() => {
                    ai.requestAIMove(game.getFen(), currentDifficulty);
                }, 500);
            }
        });
    }

    if (flipBoardBtn) {
        flipBoardBtn.addEventListener('click', () => {
            ui.flipBoard(); // ChessUI handles its own orientation state
            console.log("Board flipped.");
        });
    }

    if (themeSelector) {
        themeSelector.addEventListener('change', (event) => {
            ui.setTheme(event.target.value);
            console.log("Theme changed to:", event.target.value);
        });
    }

    if (pieceStyleSelector) {
        pieceStyleSelector.addEventListener('change', async (event) => {
            await ui.setPieceStyle(event.target.value);
            console.log("Piece style changed to:", event.target.value);
            ui.updateBoard(game); // Re-render board with new pieces
            updateStatus();
        });
    }

    if (difficultySelector) {
        // Initialize currentDifficulty from selector's default value if not already done
        currentDifficulty = difficultySelector.value || "Medium";

        difficultySelector.addEventListener('change', (event) => {
            currentDifficulty = event.target.value;
            console.log("Difficulty changed to:", currentDifficulty);
            if (aiReady && isAIActive && statusBar) {
                statusBar.textContent = `Difficulty set to ${currentDifficulty}.`;
            }
            // The difficulty is used in the next call to ai.requestAIMove().
            // No need to explicitly send to AI unless AI module supports dynamic skill updates mid-calculation.
        });
    }

    // --- Initial Setup ---
    // The initial board state and status will be set after the initial piece set is loaded by ui.loadInitialPieceSet()
    // ui.updateBoard(game); // Render the initial board state
    // updateStatus();       // Set the initial status message
    
    // Ensure initial piece set is loaded and then update board and status
    ui.loadInitialPieceSet().then(() => {
        ui.updateBoard(game);
        updateStatus();
        console.log("Chess PWA main.js initialized with AI integration attempt.");
    });
});
