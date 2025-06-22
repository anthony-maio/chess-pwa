// chess-pwa/src/ai.js
let stockfishWorker;
let onAIReadyCallback = null;
let onAIMoveCallback = null;

export function initAI(readyCallback, moveCallback) {
    onAIReadyCallback = readyCallback;
    onAIMoveCallback = moveCallback;

    // Create as a classic worker. Vite will bundle this.
    // The URL is relative to this file (ai.js) and points to stockfish-worker.js
    stockfishWorker = new Worker(new URL('./stockfish-worker.js', import.meta.url));
// Log to indicate the worker is being initialized
// Log to indicate the init message is being sent
// Log the structure of the init message
//console.log('Init message structure:', data);
// Log the structure of the init message
//console.log('Init message structure:', data);
console.log('Sending init message to worker');
console.log('Stockfish worker initialized');

    stockfishWorker.onmessage = (event) => {
        const msg = event.data;
        if (msg && msg.type === 'ready') {
            onAIReadyCallback && onAIReadyCallback();
        } else if (typeof msg === 'string') {
            if (msg.startsWith('bestmove ')) {
                const parts = msg.split(' ');
                if (parts.length >= 2) {
                    onAIMoveCallback && onAIMoveCallback(parts[1]);
                }
            }
        } else if (msg && msg.type === 'error') {
            console.error('AI Worker Error:', msg.message);
            onAIReadyCallback && onAIReadyCallback(new Error(msg.message || 'AI initialization failed'));
        }
    };
    
    stockfishWorker.onerror = (error) => {
        console.error("AI Worker encountered a critical error:", error);
        // This could be due to worker script not loading, etc.
        if (onAIReadyCallback) {
            onAIReadyCallback(error); // Signal ready with error
        }
    };

    // Pass the base URL from Vite's import.meta.env.BASE_URL to the worker
    const baseUrl = import.meta.env.BASE_URL;
    console.log('AI: Sending baseUrl to worker:', baseUrl);
    stockfishWorker.postMessage({ type: 'init', baseUrl: baseUrl });
}

export function requestAIMove(fen, difficulty) { 
    if (stockfishWorker) {
        let skillLevel = 1; // Default skill level for Stockfish (0-20)
        let goCommand = 'go depth 5'; // Default UCI go command

        // Normalize difficulty to handle case sensitivity  
        const normalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();

        switch (normalizedDifficulty) {
            case "Easy":
                skillLevel = 1;
                goCommand = 'go depth 3 movetime 500';
                break;
            case "Medium":
                skillLevel = 5;
                goCommand = 'go depth 8 movetime 1000';
                break;
            case "Hard":
                skillLevel = 10; 
                goCommand = 'go depth 12 movetime 1500';
                break;
            case "Expert":
                skillLevel = 15;
                goCommand = 'go depth 15 movetime 2000';
                break;
            default:
                console.warn(`Unknown difficulty: ${difficulty}, using Easy settings.`);
                skillLevel = 1;
                goCommand = 'go depth 3 movetime 500';
        }
        
        // Send UCI commands as strings
        stockfishWorker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        stockfishWorker.postMessage(`position fen ${fen}`);
        stockfishWorker.postMessage(goCommand);
    } else {
        console.error("AI Worker not available to request move.");
        if (onAIMoveCallback) onAIMoveCallback(null, new Error("AI worker not available"));
    }
}