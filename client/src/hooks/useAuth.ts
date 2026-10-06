import { useState, useCallback } from 'react'
import { User } from '../types'
import { getStoredUser, storeUser, clearUser } from '../lib/auth'
import { api } from '../lib/api'

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getStoredUser())

  const loginAsDemo = useCallback(async () => {
    const { data } = await api.get<{ success: boolean; user: User }>('/api/auth/demo')
    storeUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (email: string) => {
    const { data } = await api.post<{ success: boolean; user: User }>('/api/auth/login', { email })
    storeUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearUser()
    setUser(null)
  }, [])

  return { user, login, loginAsDemo, logout, isAuthenticated: !!user }
}
