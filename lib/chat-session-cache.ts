import type { ChatSession } from '@google/generative-ai';

const globalForChatCache = globalThis as { chatSessionCache?: Map<string, ChatSession> };
const cache = (globalForChatCache.chatSessionCache ??= new Map<string, ChatSession>());

/**
 * Store the ChatSession for a given contextId so we can reuse it across requests.
 */
export function storeChatSession(contextId: string, session: ChatSession): void {
  cache.set(contextId, session);
}

/**
 * Retrieve the stored ChatSession for this contextId, if any.
 */
export function getChatSession(contextId: string): ChatSession | undefined {
  return cache.get(contextId);
}

/**
 * Remove the stored ChatSession for this contextId.
 */
export function clearChatSession(contextId: string): void {
  cache.delete(contextId);
}