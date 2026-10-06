import { User } from '../types'

const AUTH_KEY = 'ekfrazo_user'

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function storeUser(user: User): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  localStorage.removeItem(AUTH_KEY)
}
