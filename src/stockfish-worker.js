// stockfish-worker.js - Web Worker script for Stockfish engine

// Detect if WebAssembly is supported
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0,0x61,0x73,0x6d,0x01,0x00,0x00,0x00));

// Load the appropriate Stockfish engine script
importScripts(wasmSupported ? 'stockfish.wasm.js' : 'stockfish.js');

// The Stockfish engine script defines onmessage and postMessage handlers globally,
// so no additional code is needed here.
