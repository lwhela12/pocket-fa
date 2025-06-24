import type { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function createApiHandler<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse<ApiResponse<T>>) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'An unexpected error occurred',
      });
    }
  };
}

export function verifyToken(token: string): { id: string } {
  try {
    // If we're in development mode and using the dev token, accept it
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      return { id: '123' };
    }
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Missing JWT_SECRET environment variable');
    }
    const decoded = verify(token, secret);
    return decoded as { id: string };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function authenticate(req: NextApiRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If we're in development mode, allow missing auth header
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: using mock user ID for missing auth header');
      return '123';
    }
    throw new Error('Authorization header is required');
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);
  return decoded.id;
}

// Client-side API fetch utility
export const fetchApi = async <T = any>(
  url: string,
  options?: RequestInit,
  suppressErrors = false
): Promise<ApiResponse<T>> => {
  try {
    let token = null;
    let user = null;
    
    if (typeof window !== 'undefined') {
      // Get token from localStorage
      const tokenData = localStorage.getItem('token');
      if (tokenData) {
        token = tokenData;
      }
      
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        user = JSON.parse(userData);
      }
      
      // For development fallback
      if (!token && process.env.NODE_ENV === 'development') {
        token = 'dev-token';
      }
    }
    
    // Build headers
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');
    
    // Add authorization header if token exists
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Build request
    const config: RequestInit = {
      ...options,
      headers,
    };
    
    const response = await fetch(url, config);
    
    // Parse the response
    const data = await response.json();
    
    if (!response.ok && !suppressErrors) {
      throw new Error(data.error || 'Server error');
    }
    
    return data as ApiResponse<T>;
  } catch (error: any) {
    if (!suppressErrors) {
      console.error(`API error (${url}):`, error);
    }
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
};

// Utility to consume a Server-Sent Events (SSE) stream
export const fetchSSE = async (
  url: string,
  options: RequestInit,
  onMessage: (data: string) => void
) => {
  const res = await fetch(url, options);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      const cleaned = part.replace(/^data:\s*/, '').trim();
      if (cleaned) {
        onMessage(JSON.parse(cleaned));
      }
    }
  }
};