import { randomUUID } from 'crypto';

const globalForCache = globalThis as { contextCache?: Map<string, any> };
const cache = (globalForCache.contextCache ||= new Map<string, any>());

export function storeContext(data: any): string {
  const id = randomUUID();
  cache.set(id, data);
  return id;
}

export function getContext(id: string): any | undefined {
  return cache.get(id);
}

export function clearContext(id: string): void {
  cache.delete(id);
}

export default cache;
