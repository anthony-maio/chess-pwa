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
        const data = event.data;
        switch (data.type) {
            case 'ready':
                if (onAIReadyCallback) onAIReadyCallback(); // No error means success
                break;
            case 'bestmove':
                if (onAIMoveCallback) onAIMoveCallback(data.move);
                break;
            case 'error':
                console.error("AI Worker Error:", data.message);
                if (onAIReadyCallback) {
                    // Pass an error object or a flag to indicate failure
                    onAIReadyCallback(new Error(data.message || "AI initialization failed"));
                }
                break;
            default:
                // console.debug("AI Manager received unhandled message:", data);
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
    stockfishWorker.postMessage({ type: 'init', baseUrl: import.meta.env.BASE_URL });
}

export function requestAIMove(fen, difficulty) { // difficulty: "Easy", "Medium", "Hard"
    if (stockfishWorker) {
        let skillLevel = 1; // Default skill level for Stockfish (0-20)
        let goCommand = 'go depth 5'; // Default UCI go command

        switch (difficulty) {
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
            default:
                console.warn(`Unknown difficulty: ${difficulty}, using Easy settings.`);
                skillLevel = 1;
                goCommand = 'go depth 3 movetime 500';
        }
        
        stockfishWorker.postMessage({ type: 'setoption', name: 'Skill Level', value: skillLevel });
        stockfishWorker.postMessage({ type: 'position', fen: fen });
        stockfishWorker.postMessage({ type: 'go', command: goCommand });
    } else {
        console.error("AI Worker not available to request move.");
        // Optionally, call onAIMoveCallback with an error or null
        if (onAIMoveCallback) onAIMoveCallback(null, new Error("AI worker not available"));
    }
}