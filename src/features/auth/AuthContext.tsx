import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from './auth.types'

interface SessionContextValue {
  session: Session | null
  user: User | null
  role: UserRole | null
  isLoading: boolean
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const user = session?.user ?? null
  const role = (user?.user_metadata?.role as UserRole | undefined) ?? null

  return (
    <SessionContext.Provider value={{ session, user, role, isLoading }}>
      {children}
    </SessionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(SessionContext)
}
