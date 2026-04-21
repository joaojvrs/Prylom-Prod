import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);
