// stockfish-worker.js - Web Worker script for Stockfish engine
console.log('Stockfish worker script loaded');

// Detect if WebAssembly is supported
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0,0x61,0x73,0x6d,0x01,0x00,0x00,0x00));

let _baseUrl = '/'; // Default to root, will be updated by init message

// Custom WASM loader for GitHub Pages
async function loadWasmFromGitHubPages(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM: ${response.status}`);
        }
        const bytes = await response.arrayBuffer();
        return WebAssembly.compile(bytes);
    } catch (error) {
        console.error('Failed to load WASM:', error);
        return null;
    }
}

// Handle messages from the main thread
self.onmessage = (event) => {
    const data = event.data;
    console.log('Received message:', data);
    
    switch (data.type) {
        case 'init':
            _baseUrl = data.baseUrl || '/'; 
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
    try {
        if (wasmSupported) {
            // For WASM: manually load and compile to avoid MIME type issues
            console.log('Loading Stockfish WASM...');
            
            // Pre-load the WASM module
            const wasmModule = await loadWasmFromGitHubPages(`${baseUrl}stockfish/stockfish.wasm`);
            if (!wasmModule) {
                throw new Error('Failed to compile WASM module');
            }
            
            // Set up module with pre-compiled WASM
            self.Module = {
                wasmModule: wasmModule,
                wasmBinary: null, // We'll handle this manually
                instantiateWasm: function(imports, successCallback) {
                    WebAssembly.instantiate(wasmModule, imports)
                        .then(instance => successCallback(instance, wasmModule))
                        .catch(err => {
                            console.error('WASM instantiation failed:', err);
                            throw err;
                        });
                    return {}; // Indicate async instantiation
                }
            };
            
            // Load the WASM JavaScript wrapper
            await new Promise((resolve, reject) => {
                const script = `${baseUrl}stockfish/stockfish.wasm.js`;
                importScripts(script);
                
                // Wait for module to be ready
                if (self.Module && self.Module.onRuntimeInitialized) {
                    self.Module.onRuntimeInitialized = resolve;
                } else {
                    setTimeout(resolve, 1000); // Fallback timeout
                }
            });
            
        } else {
            // Fallback for non-WASM browsers
            console.log('Loading Stockfish JS fallback...');
            importScripts(`${baseUrl}stockfish/stockfish.js`);
        }
        
        // Wait a bit more for Stockfish to be fully ready
        setTimeout(() => {
            if (self.Stockfish && typeof self.Stockfish === 'function') {
                console.log('Stockfish initialized successfully');
                self.postMessage({ type: 'ready' });
            } else {
                throw new Error('Stockfish function not available after initialization');
            }
        }, 500);
        
    } catch (error) {
        console.error("Worker: Error during Stockfish initialization.", error);
        self.postMessage({ type: 'error', message: `Failed to initialize Stockfish: ${error.message}` });
    }
}