// stockfish-worker.js - Web Worker script for Stockfish engine
console.log('Stockfish worker script loaded');

// Detect if WebAssembly is supported
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0,0x61,0x73,0x6d,0x01,0x00,0x00,0x00));

let _baseUrl = '/'; // Default to root, will be updated by init message

// Handle messages from the main thread
self.onmessage = (event) => {
    const data = event.data;
    // console.log('Worker received message:', data); // Less verbose logging
    
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
            if (self.Stockfish && typeof self.Stockfish === 'function') { 
                 self.Stockfish().postMessage(`setoption name ${data.name} value ${data.value}`);
            } else {
                console.warn("Stockfish not yet initialized, skipping setoption command.");
            }
            break;
        case 'position':
            if (self.Stockfish && typeof self.Stockfish === 'function') {
                self.Stockfish().postMessage(`position fen ${data.fen}`);
            } else {
                console.warn("Stockfish not yet initialized, skipping position command.");
            }
            break;
        case 'go':
            if (self.Stockfish && typeof self.Stockfish === 'function') {
                self.Stockfish().postMessage(data.command);
            } else {
                console.warn("Stockfish not yet initialized, skipping go command.");
            }
            break;
        default:
            console.debug("Worker received unhandled message:", data);
    }
};

async function initializeStockfish(baseUrl) {
    self.Module = {
        locateFile: function(path, prefix) {
            if (path.endsWith('.wasm')) {
                // console.log(`Worker: Locating WASM file: ${path} with baseUrl: ${baseUrl}`);
                return `${baseUrl}stockfish/${path}`;
            }
            // console.log(`Worker: Locating file: ${path} with prefix: ${prefix}`);
            return prefix + path;
        },
        onRuntimeInitialized: function() {
            console.log('Stockfish runtime initialized.');
            // Check for Stockfish function availability after a short delay
            // to ensure all scripts are fully processed.
            setTimeout(() => {
                if (self.Stockfish && typeof self.Stockfish === 'function') {
                    console.log('Stockfish function is available. Posting ready message.');
                    self.postMessage({ type: 'ready' });
                } else {
                    console.error('Stockfish function not available after runtime initialization.');
                    self.postMessage({ type: 'error', message: 'Stockfish function not available after runtime initialization' });
                }
            }, 100); // Increased delay slightly
        },
        print: function(text) {
            // console.log('Stockfish stdout:', text);
        },
        printErr: function(text) {
            // console.error('Stockfish stderr:', text);
        },
        setStatus: function(text) {
            // console.log('Stockfish status:', text);
        }
    };

    try {
        const stockfishJsScript = wasmSupported 
            ? `${baseUrl}stockfish/stockfish.wasm.js` 
            : `${baseUrl}stockfish/stockfish.js`;

        console.log(`Worker: Attempting to load ${stockfishJsScript}`);
        importScripts(stockfishJsScript); // This will trigger Module.onRuntimeInitialized

        // The 'ready' message is now sent from Module.onRuntimeInitialized
        
    } catch (error) {
        console.error("Worker: Error during Stockfish script import or initialization.", error);
        self.postMessage({ type: 'error', message: `Failed to initialize Stockfish: ${error.message}` });
    }
}