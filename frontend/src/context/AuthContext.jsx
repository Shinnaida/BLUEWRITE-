import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshCurrentUser = useCallback(async () => { setIsLoading(true); try { const response=await authService.getMe(); setUser(response.data.data); return response.data.data; } catch(error) { setUser(null); if(error.response?.status!==401) throw error; return null; } finally { setIsLoading(false); } }, []);
  useEffect(() => { refreshCurrentUser().catch(() => {}); }, [refreshCurrentUser]);
  const login = useCallback(async (credentials) => { const response=await authService.login(credentials); const data=response.data.data;if(!data.verificationRequired)setUser(data);return data; }, []);
  const completeEmailVerification = useCallback(async (code) => { const response=await authService.verifyEmailCode(code);setUser(response.data.data);return response.data.data; }, []);
  const logout = useCallback(async () => { try { await authService.logout(); } finally { setUser(null); } }, []);
  const changePassword = useCallback(async (passwords) => { const response=await authService.changePassword(passwords); setUser(response.data.data); return response.data.data; }, []);
  const completeSecurityReview = useCallback(async (decision) => { const response=await authService.completeSecurityReview(decision); setUser(response.data.data); return response.data.data; }, []);
  useEffect(()=>{const expired=()=>setUser(null);window.addEventListener('bluewrite:session-expired',expired);return()=>window.removeEventListener('bluewrite:session-expired',expired);},[]);
  const value = useMemo(() => ({ user, isAuthenticated:Boolean(user), isLoading, loading:isLoading, login, completeEmailVerification, logout, changePassword, completeSecurityReview, refreshCurrentUser }), [user,isLoading,login,completeEmailVerification,logout,changePassword,completeSecurityReview,refreshCurrentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuthContext() { const context=useContext(AuthContext); if(!context) throw new Error('useAuthContext must be used within an AuthProvider'); return context; }