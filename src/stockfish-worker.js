// stockfish-worker.js - Web Worker script for Stockfish engine
console.log('Stockfish worker script loaded');

// Detect if WebAssembly is supported
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0,0x61,0x73,0x6d,0x01,0x00,0x00,0x00));

let _baseUrl = '/'; // Default to root, will be updated by init message
let stockfishWorker = null;

// Handle messages from the main thread
self.onmessage = (event) => {
    const data = event.data;
    
    if (typeof data === 'string') {
        // Direct UCI command string, pass to Stockfish worker
        if (stockfishWorker) {
            stockfishWorker.postMessage(data);
        }
        return;
    }
    
    switch (data.type) {
        case 'init':
            _baseUrl = data.baseUrl; 
            if (!_baseUrl.endsWith('/')) {
                _baseUrl += '/';
            }
            console.log('Stockfish worker initializing with baseUrl:', _baseUrl);
            initializeStockfish(_baseUrl);
            break;
        case 'setoption':
            if (stockfishWorker) {
                const command = `setoption name ${data.name} value ${data.value}`;
                console.log(`Worker: Sending command: ${command}`);
                stockfishWorker.postMessage(command);
            }
            break;
        case 'position':
            if (stockfishWorker) {
                const command = `position fen ${data.fen}`;
                console.log(`Worker: Sending command: ${command}`);
                stockfishWorker.postMessage(command);
            }
            break;
        case 'go':
            if (stockfishWorker) {
                console.log(`Worker: Sending command: ${data.command}`);
                stockfishWorker.postMessage(data.command);
            }
            break;
        default:
            console.debug("Worker received unhandled message:", data);
    }
};

async function initializeStockfish(baseUrl) {
    try {
        const stockfishJsScript = wasmSupported 
            ? `${baseUrl}stockfish/stockfish.wasm.js` 
            : `${baseUrl}stockfish/stockfish.js`;

        console.log(`Worker: Creating Stockfish worker with script: ${stockfishJsScript}`);
        
        // Test if the script URL is accessible before creating worker
        const testResponse = await fetch(stockfishJsScript);
        if (!testResponse.ok) {
            throw new Error(`Failed to fetch Stockfish script: ${testResponse.status} ${testResponse.statusText} for URL: ${stockfishJsScript}`);
        }
        
        // Create the actual Stockfish worker
        stockfishWorker = new Worker(stockfishJsScript);
        
        // Set up message handling from Stockfish worker
        stockfishWorker.onmessage = function(event) {
            console.log('Stockfish output:', event.data);
            // Relay all Stockfish output to the main thread
            self.postMessage(event.data);
        };
        
        stockfishWorker.onerror = function(error) {
            console.error('Stockfish worker error:', error);
            self.postMessage({ type: 'error', message: `Stockfish worker error: ${error.message}` });
        };
        
        // Initialize Stockfish UCI
        stockfishWorker.postMessage('uci');
        
        console.log('Stockfish worker created successfully');
        self.postMessage({ type: 'ready' });
        
    } catch (error) {
        console.error("Worker: Error during Stockfish worker creation.", error);
        self.postMessage({ type: 'error', message: `Failed to initialize Stockfish: ${error.message}` });
    }
}