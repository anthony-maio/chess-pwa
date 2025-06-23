import Game from './game.js';
import ChessUI from './ui.js';
import * as ai from './ai.js'; // Import AI module

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // --- DOM Element References ---
    const boardContainer = document.getElementById('board-container');
    const statusBar = document.getElementById('status-bar');
    const historyContent = document.getElementById('history-content');
    const newGameBtn = document.getElementById('new-game-btn');
    const undoBtn = document.getElementById('undo-btn');
    const flipBoardBtn = document.getElementById('flip-board-btn');
    const themeSelector = document.getElementById('theme-selector');
    const pieceStyleSelector = document.getElementById('piece-style-selector');
    const difficultySelector = document.getElementById('difficulty-selector');
    const soundCheckbox = document.getElementById('sound-enabled');
    const testSoundBtn = document.getElementById('test-sound-btn');
    
    // Promotion modal elements
    const promotionModal = document.getElementById('promotion-modal');
    const promoteQueenBtn = document.getElementById('promote-queen');
    const promoteRookBtn = document.getElementById('promote-rook');
    const promoteBishopBtn = document.getElementById('promote-bishop');
    const promoteKnightBtn = document.getElementById('promote-knight');

    // --- AI State Variables ---
    let isAIActive = false; // True when AI is playing
    let currentDifficulty = "Medium"; // Default difficulty
    let playerColor = 'w';    // Player is White, AI is Black
    let aiReady = false;      // True when AI engine has initialized

    // --- Sound Functions ---
    let audioContext = null;
    let soundInitialized = false;

    function initializeAudio() {
        if (soundInitialized) return true;
        
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            soundInitialized = true;
            console.log('🔊 Audio context initialized');
            return true;
        } catch (error) {
            console.log('❌ Audio not supported:', error);
            return false;
        }
    }

    function playMoveSound() {
        if (!soundCheckbox || !soundCheckbox.checked) return;
        
        // Initialize audio on first use (requires user interaction)
        if (!soundInitialized && !initializeAudio()) return;
        
        try {
            // Resume audio context if it's suspended (required by some browsers)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Higher pitch for move
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            
            console.log('🔊 Move sound played');
        } catch (error) {
            console.log('❌ Error playing sound:', error);
        }
    }

    // Test sound function for the checkbox
    function testSound() {
        if (!soundCheckbox || !soundCheckbox.checked) return;
        
        if (!soundInitialized && !initializeAudio()) {
            alert('Audio not supported on this device');
            return;
        }
        
        try {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            console.log('🔊 Test sound played');
        } catch (error) {
            console.log('❌ Error playing test sound:', error);
        }
    }

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

    // --- Promotion handling variables ---
    let pendingMove = null; // Store move awaiting promotion choice

    // --- Helper function to check if move is a pawn promotion ---
    const isPromotion = (from, to) => {
        const piece = game.getPiece(from);
        if (!piece || piece.type !== 'p') return false;
        
        const toRank = parseInt(to[1]);
        return (piece.color === 'w' && toRank === 8) || (piece.color === 'b' && toRank === 1);
    };

    // --- Show promotion modal ---
    const showPromotionModal = (from, to) => {
        pendingMove = { from, to };
        promotionModal.classList.remove('hidden');
        ui.ground.set({ viewOnly: true }); // Disable board interaction
    };

    // --- Hide promotion modal ---
    const hidePromotionModal = () => {
        promotionModal.classList.add('hidden');
        pendingMove = null;
        ui.ground.set({ viewOnly: false }); // Re-enable board interaction
    };

    // --- Execute move with promotion ---
    const executeMoveWithPromotion = (promotion) => {
        if (!pendingMove) return;
        
        const move = game.makeMove({ 
            from: pendingMove.from, 
            to: pendingMove.to, 
            promotion: promotion 
        });
        
        if (move) {
            ui.updateBoard(game);
            playMoveSound();
            updateStatus();
            
            const gameStatus = game.getGameStatus();
            if (isAIActive && !gameStatus.isGameOver && game.getTurn() !== playerColor && aiReady) {
                statusBar.textContent = "AI is thinking...";
                ui.ground.set({ viewOnly: true }); 

                setTimeout(() => {
                    ai.requestAIMove(game.getFen(), currentDifficulty);
                }, 500);
            } else if (gameStatus.isGameOver) {
                updateStatus();
            }
        } else {
            console.warn("Invalid promotion move:", pendingMove, "with promotion:", promotion);
        }
        
        hidePromotionModal();
    };

    // --- `handleUserMove` Function ---
    const handleUserMove = (from, to) => {
        if (game.getTurn() !== playerColor && isAIActive) {
            console.log("Not player's turn or AI is active and it's AI's turn.");
            return; // Prevent moves if it's not the player's turn (e.g. AI is thinking)
        }

        // Check if this is a pawn promotion
        if (isPromotion(from, to)) {
            showPromotionModal(from, to);
            return;
        }

        const move = game.makeMove({ from, to });
        
        if (move) {
            ui.updateBoard(game);
            playMoveSound();
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
                    playMoveSound();
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
            message = `🏁 Checkmate! ${status.turn === playerColor ? 'AI' : 'Player'} wins.`;
        } else if (status.isStalemate) {
            message = '🤝 Stalemate. Game is a draw.';
        } else if (status.isDraw) {
            message = '🤝 Draw by rule (50-move, threefold repetition, or insufficient material).';
        } else {
            if (isAIActive && game.getTurn() !== playerColor && !status.isGameOver && aiReady) {
                message = '🤖 AI is thinking...';
            } else if (isAIActive && game.getTurn() === playerColor && !status.isGameOver && aiReady) {
                message = `♟️ Player (${playerColor === 'w' ? 'White' : 'Black'}) to move.`;
            } else if (!isAIActive) { // Local two-player game
                 message = `${status.turn === 'w' ? '♗ White' : '♛ Black'} to move.`;
            } else {
                 message = "⚡ Game starting or AI initializing...";
            }
            
            if (status.isCheck && ( (isAIActive && game.getTurn() === playerColor) || !isAIActive) ) {
                message += ' ⚠️ Check!'; // Show check only if it's player's turn or local game
            }
        }

        statusBar.textContent = message;
        updateMoveHistory();
    }

    // --- `updateMoveHistory` Function ---
    function updateMoveHistory() {
        if (!historyContent) return;

        const history = game.chess.history();
        if (history.length === 0) {
            historyContent.textContent = "No moves yet.";
            return;
        }

        let formattedHistory = "";
        for (let i = 0; i < history.length; i += 2) {
            const moveNum = (i / 2) + 1;
            const whiteMove = history[i];
            const blackMove = history[i + 1];
            
            formattedHistory += `${moveNum}. ${whiteMove}`;
            if (blackMove) {
                formattedHistory += ` ${blackMove}`;
            }
            formattedHistory += "\n";
        }
        
        historyContent.textContent = formattedHistory.trim();
        // Auto-scroll to bottom
        historyContent.scrollTop = historyContent.scrollHeight;
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
            const selectedTheme = event.target.value;
            console.log("🎨 Theme changed to:", selectedTheme);
            
            ui.setTheme(selectedTheme);
            
            // Show visual feedback
            if (statusBar) {
                statusBar.textContent = `🎨 Theme changed to ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)}`;
                setTimeout(() => {
                    updateStatus();
                }, 2000);
            }
            
            // Add visual indication to the dropdown
            themeSelector.style.background = '#f0f8e8';
            setTimeout(() => {
                themeSelector.style.background = '';
            }, 1000);
        });
    }

    if (pieceStyleSelector) {
        pieceStyleSelector.addEventListener('change', async (event) => {
            const selectedStyle = event.target.value;
            console.log("♟️ Piece style changed to:", selectedStyle);
            
            // Show loading feedback
            if (statusBar) {
                statusBar.textContent = `♟️ Loading ${selectedStyle} pieces...`;
            }
            
            await ui.setPieceStyle(selectedStyle);
            ui.updateBoard(game); // Re-render board with new pieces
            
            // Show completion feedback
            if (statusBar) {
                statusBar.textContent = `♟️ Pieces changed to ${selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)}`;
                setTimeout(() => {
                    updateStatus();
                }, 2000);
            }
            
            // Add visual indication to the dropdown
            pieceStyleSelector.style.background = '#fff0e6';
            setTimeout(() => {
                pieceStyleSelector.style.background = '';
            }, 1000);
        });
    }

    if (difficultySelector) {
        // Initialize currentDifficulty from selector's default value if not already done
        currentDifficulty = difficultySelector.value || "medium";
        console.log(`Initial difficulty set to: ${currentDifficulty}`);

        difficultySelector.addEventListener('change', (event) => {
            currentDifficulty = event.target.value;
            console.log("🎯 Difficulty changed to:", currentDifficulty);
            
            // Show visual feedback immediately
            if (statusBar) {
                const difficultyNames = {
                    'easy': 'Easy (Level 1)',
                    'medium': 'Medium (Level 5)', 
                    'hard': 'Hard (Level 10)',
                    'expert': 'Expert (Level 15)'
                };
                statusBar.textContent = `🎯 Difficulty set to ${difficultyNames[currentDifficulty] || currentDifficulty}`;
                
                // Show visual indicator for 3 seconds, then return to normal status
                setTimeout(() => {
                    updateStatus();
                }, 3000);
            }
            
            // Add visual indication to the dropdown itself
            difficultySelector.style.background = '#e6f3ff';
            setTimeout(() => {
                difficultySelector.style.background = '';
            }, 1000);
        });
    }

    // --- Test Sound Button Event Listener ---
    if (testSoundBtn) {
        testSoundBtn.addEventListener('click', () => {
            console.log('🔔 Test sound button clicked');
            testSound();
        });
    }

    // --- Promotion Button Event Listeners ---
    if (promoteQueenBtn) {
        promoteQueenBtn.addEventListener('click', () => executeMoveWithPromotion('q'));
    }
    if (promoteRookBtn) {
        promoteRookBtn.addEventListener('click', () => executeMoveWithPromotion('r'));
    }
    if (promoteBishopBtn) {
        promoteBishopBtn.addEventListener('click', () => executeMoveWithPromotion('b'));
    }
    if (promoteKnightBtn) {
        promoteKnightBtn.addEventListener('click', () => executeMoveWithPromotion('n'));
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
