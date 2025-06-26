import path from 'path';
import fs from 'fs/promises';

declare global {
  // Function for argon2-browser to load the wasm binary.
  // eslint-disable-next-line no-var
  var loadArgon2WasmBinary: (() => Promise<Uint8Array>) | undefined;
}

let initialized = false;

/**
 * Ensure the global loader for argon2-browser is set. The library will
 * call `global.loadArgon2WasmBinary()` when first used. By defining it here
 * we bypass its default fetch-based loader which fails in serverless
 * environments like Vercel.
 */
export async function ensureArgon2Wasm() {
  if (initialized) {
    return;
  }

  globalThis.loadArgon2WasmBinary = async () => {
    const wasmPath = path.join(
      process.cwd(),
      'node_modules/argon2-browser/dist/argon2.wasm'
    );
    const wasmBinary = await fs.readFile(wasmPath);
    return new Uint8Array(wasmBinary);
  };

  initialized = true;
}

export { ensureArgon2Wasm as getArgon2Wasm };
