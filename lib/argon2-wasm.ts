import path from 'path';
import fs from 'fs/promises';
import { type Argon2Browser } from 'argon2-browser';

let wasmModule: Argon2Browser['wasmModule'] | null = null;

/**
 * Load the argon2.wasm binary from the filesystem so it can be provided
 * directly to argon2-browser. This avoids fetch failures in serverless
 * environments like Vercel.
 */
export async function getArgon2Wasm() {
  if (wasmModule) {
    return wasmModule;
  }

  try {
    const wasmPath = path.join(
      process.cwd(),
      'node_modules/argon2-browser/dist/argon2.wasm'
    );
    const wasmBinary = await fs.readFile(wasmPath);
    wasmModule = wasmBinary;
    return wasmModule;
  } catch (err) {
    console.error('Failed to load argon2.wasm from filesystem.', err);
    throw new Error('Could not load Argon2 WASM module for password hashing.');
  }
}
