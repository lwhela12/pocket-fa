import { readFileSync } from 'fs';
import { join } from 'path';

if (!(globalThis as any).loadArgon2WasmBinary) {
  const wasmPath = join(process.cwd(), 'node_modules/argon2-browser/dist/argon2.wasm');
  const wasm = readFileSync(wasmPath);
  (globalThis as any).loadArgon2WasmBinary = () => Promise.resolve(new Uint8Array(wasm));
}

// Import after the global function is defined so argon2-browser can use it
import * as argon2 from 'argon2-browser';

export default argon2;
