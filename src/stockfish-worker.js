 // stockfish-worker.js - Web Worker script for Stockfish engine
 self.addEventListener('message', (event) => {
   const data = event.data;
   if (typeof data === 'object') {
     switch (data.type) {
       case 'init':
         initializeStockfish(data.baseUrl || '/');
         break;
       case 'setoption':
         postMessage(`setoption name ${data.name} value ${data.value}`);
         break;
       case 'position':
         postMessage(`position fen ${data.fen}`);
         break;
       case 'go':
         postMessage(data.command);
         break;
       default:
         console.warn('Worker received unhandled message:', data);
     }
   }
 });

 async function initializeStockfish(baseUrl) {
   try {
     // Fetch the WASM binary
     const response = await fetch(`${baseUrl}stockfish/stockfish.wasm`);
     if (!response.ok) {
       throw new Error(`Failed to fetch WASM: ${response.status}`);
     }
     const wasmBinary = new Uint8Array(await response.arrayBuffer());

     // Configure Emscripten Module
     self.Module = {
       wasmBinary: wasmBinary,
       locateFile: (path) => `${baseUrl}stockfish/${path}`,
       onRuntimeInitialized: () => {
         console.log('Stockfish initialized successfully');
         self.postMessage({ type: 'ready' });
       }
     };

     // Load the Emscripten-generated wrapper
     importScripts(`${baseUrl}stockfish/stockfish.wasm.js`);
   } catch (error) {
     console.error('Worker: Error during Stockfish initialization.', error);
     self.postMessage({ type: 'error', message: error.message || 'Initialization failed' });
   }
 }