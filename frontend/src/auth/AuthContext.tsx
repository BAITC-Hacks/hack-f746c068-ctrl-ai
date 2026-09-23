import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSession, setSession, type Session } from './session'

interface AuthValue {
  session: Session | null
  signIn: (s: Session) => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setState] = useState<Session | null>(() => getSession())
  const qc = useQueryClient()

  // Синхронизация, если сессию сбросил api-клиент (например, ответ 401)
  useEffect(() => {
    const sync = () => setState(getSession())
    window.addEventListener('cq-session', sync)
    return () => window.removeEventListener('cq-session', sync)
  }, [])

  const signIn = useCallback((s: Session) => {
    qc.clear()
    setSession(s)
  }, [qc])

  const signOut = useCallback(() => {
    qc.clear()
    setSession(null)
  }, [qc])

  return <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
