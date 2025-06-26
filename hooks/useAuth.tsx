import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/router';

type User = {
  id: string;
  email: string;
  name?: string;
  age?: number;
  retirementAge?: number;
  riskTolerance?: 'Conservative' | 'Moderate' | 'Aggressive';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// This would be a real implementation in a production app
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        // In a real app, this would verify the token with the server
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('user');
          const storedToken = localStorage.getItem('token');
          
          // If we have both user and token data, user is logged in
          if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            
            // Validate token by making a request to the server
            // This is optional but would be part of a real implementation
            // to ensure the token is still valid
          } else {
            // Clear any partial auth data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        // Clear auth data on error
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }
      
      const { user: userData, token, refreshToken } = data.data;

      let combinedUser = userData;

      if (token) {
        try {
          const profRes = await fetch('/api/profile', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const prof = await profRes.json();
          if (prof.success) {
            combinedUser = { ...userData, ...prof.data };
          }
        } catch (e) {
          console.error('Failed to fetch profile after login', e);
        }
      }

      setUser(combinedUser);

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(combinedUser));
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
      }
      
      router.push('/analyzer');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
    router.push('/auth/login');
  };

  const register = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Call the register API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Registration failed');
      }
      
      const { user: userData, token } = data.data;

      let combinedUser = userData;

      if (token) {
        try {
          const profRes = await fetch('/api/profile', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const prof = await profRes.json();
          if (prof.success) {
            combinedUser = { ...userData, ...prof.data };
          }
        } catch (e) {
          console.error('Failed to fetch profile after registration', e);
        }
      }

      setUser(combinedUser);

      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(combinedUser));
        if (token) {
          localStorage.setItem('token', token);
        }
      }
      
      router.push('/auth/mfa-setup');
    } catch (error) {
      console.error('Register error:', error);
      // Propagate errors so invalid registrations aren't masked
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Profile update failed');
      }

      if (user) {
        const updatedUser = { ...user, ...result.data };
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}