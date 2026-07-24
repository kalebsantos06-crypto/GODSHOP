import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  enterOfflineMode: (email: string) => Promise<{ user: User }>;
  isOfflineMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const safeGetStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage read error for ${key}:`, e);
    return null;
  }
};

const safeSetStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage write error for ${key}:`, e);
  }
};

const safeRemoveStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage remove error for ${key}:`, e);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return safeGetStorage('auth_offline_mode') === 'true';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        safeSetStorage('auth_cached_user', JSON.stringify(session.user));
        safeSetStorage('auth_offline_mode', 'false');
      } else {
        // If there was no session, check if we are in offline mode with a cached user
        const offlineMode = safeGetStorage('auth_offline_mode') === 'true';
        const cachedUserStr = safeGetStorage('auth_cached_user');
        if (offlineMode && cachedUserStr) {
          try {
            setUser(JSON.parse(cachedUserStr));
            setIsAuthenticated(true);
            setIsOfflineMode(true);
          } catch (e) {
            setUser(null);
            setIsAuthenticated(false);
            setIsOfflineMode(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsOfflineMode(false);
        }
      }
      setLoading(false);
    }).catch((err) => {
      console.warn("Supabase auth session fetch failed, checking offline fallback", err);
      const cachedUserStr = safeGetStorage('auth_cached_user');
      if (cachedUserStr) {
        try {
          setUser(JSON.parse(cachedUserStr));
          setIsAuthenticated(true);
          setIsOfflineMode(true);
          safeSetStorage('auth_offline_mode', 'true');
        } catch (e) {
          setUser(null);
          setIsAuthenticated(false);
          setIsOfflineMode(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsOfflineMode(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        safeSetStorage('auth_cached_user', JSON.stringify(session.user));
        safeSetStorage('auth_offline_mode', 'false');
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setIsOfflineMode(false);
        safeRemoveStorage('auth_offline_mode');
        safeRemoveStorage('auth_cached_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        safeSetStorage('auth_cached_user', JSON.stringify(data.user));
        safeSetStorage('auth_offline_mode', 'false');
      }
      return { error };
    } catch (err: any) {
      console.error("Login exception:", err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setIsOfflineMode(false);
        safeSetStorage('auth_cached_user', JSON.stringify(data.user));
        safeSetStorage('auth_offline_mode', 'false');
      }
      return { error };
    } catch (err: any) {
      console.error("Sign up exception:", err);
      return { error: err };
    }
  };

  const enterOfflineMode = async (email: string) => {
    const formattedEmail = email.trim() || 'offline@godshop.com';
    const fallbackUser = {
      id: 'offline-user-id-' + btoa(formattedEmail).replace(/[^a-zA-Z0-9]/g, ''),
      email: formattedEmail,
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString()
    } as User;
    
    setUser(fallbackUser);
    setIsAuthenticated(true);
    setIsOfflineMode(true);
    safeSetStorage('auth_cached_user', JSON.stringify(fallbackUser));
    safeSetStorage('auth_offline_mode', 'true');
    
    // Set a custom event to notify db services we switched to offline
    window.dispatchEvent(new CustomEvent('supabase_offline_status', { detail: { offline: true } }));
    
    return { user: fallbackUser };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out from server failed/offline:", e);
    }
    const { db } = await import('../services/db');
    db.clearUser();
    setUser(null);
    setIsAuthenticated(false);
    setIsOfflineMode(false);
    safeRemoveStorage('auth_offline_mode');
    safeRemoveStorage('auth_cached_user');
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signUp, logout, enterOfflineMode, isOfflineMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
