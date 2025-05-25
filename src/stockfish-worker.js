// chess-pwa/src/stockfish-worker.js
let stockfish;
let engineReady = false; // Tracks if 'readyok' has been received

function initializeStockfishSync() {
    console.log("Worker: Initializing Stockfish engine...");
    try {
        importScripts('/stockfish.js'); // Load UMD from public root
        stockfish = STOCKFISH(); // STOCKFISH() should be global from the UMD file

        stockfish.onmessage = function(event) {
            // console.debug("SF_WORKER_MSG:", event); // For debugging UCI communication
            if (typeof event === 'string') {
                if (event.startsWith('bestmove')) {
                    const move = event.split(' ')[1];
                    self.postMessage({ type: 'bestmove', move: move });
                } else if (event === 'readyok') {
                    if (!engineReady) {
                        engineReady = true;
                        self.postMessage({ type: 'ready' });
                        console.log("Worker: Stockfish engine ready (readyok received).");
                    }
                }
            }
        };

        stockfish.postMessage('uci');
        stockfish.postMessage('isready');

    } catch (e) {
        console.error("Worker: Error during Stockfish initialization.", e);
        self.postMessage({ type: 'error', message: 'Failed to initialize Stockfish: ' + e.message });
    }
}

self.onmessage = function(event) {
    const data = event.data;
    const type = data.type;
    // console.debug("SF_WORKER_CMD:", data); // For debugging commands from main thread

    if (type === 'init') {
        if (engineReady) { // Already initialized and ready
            self.postMessage({ type: 'ready' });
            return;
        }
        if (stockfish && !engineReady) { // Initializing but not readyok yet
            console.log("Worker: Init called while engine is still initializing.");
            // Wait for readyok, client will get 'ready' message then.
            return;
        }
        initializeStockfishSync();
        return;
    }

    if (!stockfish || !engineReady) {
        self.postMessage({ type: 'error', message: 'Stockfish not ready or initialization failed.' });
        console.warn("Worker: Command received before Stockfish is ready.", data);
        return;
    }

    switch (type) {
        case 'setoption': // e.g., { name: "Skill Level", value: 1 }
            stockfish.postMessage(`setoption name ${data.name} value ${data.value}`);
            break;
        case 'position': // e.g., { fen: "startpos" } or actual fen string
            stockfish.postMessage(`position fen ${data.fen}`);
            break;
        case 'go': // e.g., { command: "go depth 5 movetime 500" }
            stockfish.postMessage(data.command);
            break;
        default:
            console.warn("Worker: Unknown message type received", data);
    }
};
