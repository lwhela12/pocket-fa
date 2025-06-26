import * as argon2 from 'argon2-browser';
import { readFileSync } from 'fs';
import { join } from 'path';

if (!(global as any).loadArgon2WasmBinary) {
  const wasmPath = join(process.cwd(), 'node_modules/argon2-browser/dist/argon2.wasm');
  const wasm = readFileSync(wasmPath);
  (global as any).loadArgon2WasmBinary = () => Promise.resolve(new Uint8Array(wasm));
}

export default argon2;
