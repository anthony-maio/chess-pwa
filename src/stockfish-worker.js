// Log to indicate the script is being loaded
console.log('Stockfish worker script loaded');
// stockfish-worker.js - Web Worker script for Stockfish engine

// Detect if WebAssembly is supported
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0,0x61,0x73,0x6d,0x01,0x00,0x00,0x00));

let _baseUrl = '/'; // Default to root, will be updated by init message

// Handle messages from the main thread
self.onmessage = (event) => {
    const data = event.data;
// Log the received message
console.log('Received message:', data);
    switch (data.type) {
        case 'init':
            _baseUrl = data.baseUrl || '/'; 
            try {
                // Construct the full URL using the received base URL
                const stockfishScriptUrl = wasmSupported ? 
                    `${_baseUrl}stockfish/stockfish.wasm.js` : 
                    `${_baseUrl}stockfish/stockfish.js`;

                // Explicitly tell Emscripten where to find the .wasm file
                if (wasmSupported) {
                    self.Module = {
                        wasmBinaryFile: `${_baseUrl}stockfish/stockfish.wasm`,
                        // Optional: provide a locateFile function if wasmBinaryFile isn't enough
                        // locateFile: function(path, prefix) {
                        //    if (path.endsWith('.wasm')) {
                        //        return `${_baseUrl}stockfish/${path}`;
                        //    }
                        //    return prefix + path;
                        // }
                    };
                }
                
                importScripts(stockfishScriptUrl);
                // After importScripts, the Stockfish global handlers are available
                self.postMessage({ type: 'ready' }); // Signal that Stockfish is ready
            } catch (error) {
                console.error("Worker: Error during Stockfish initialization.", error);
                self.postMessage({ type: 'error', message: `Failed to initialize Stockfish: ${error.message}` });
            }
            break;
        case 'setoption':
            // Assume Stockfish is loaded and its postMessage is available
            // Check if Stockfish is initialized before attempting to use it
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

// Stockfish engine script defines onmessage and postMessage handlers globally.
// We handle 'init' here to load the script dynamically with the correct base path.
// Other messages like 'bestmove' from Stockfish will be handled by our main thread's onmessage handler.