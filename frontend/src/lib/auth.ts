import axios from 'axios'
import { apiClient } from './axios'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

export interface SessionPayload {
  user: AuthUser
  accessToken: string
}

interface RawSessionResponse {
  data: SessionPayload
}

interface RawMeResponse {
  data: AuthUser
}

const apiBaseUrl = (): string => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const googleSignInUrl = (): string => `${apiBaseUrl()}/auth/google`

export const refreshSession = async (): Promise<SessionPayload> => {
  // Uses a bare axios instance so this request is not affected by the
  // interceptor that attaches the Authorization header (the refresh flow
  // relies solely on the httpOnly refresh cookie).
  const res = await axios.post<RawSessionResponse>(
    `${apiBaseUrl()}/auth/refresh`,
    {},
    { withCredentials: true },
  )
  return res.data.data
}

export const logoutSession = async (): Promise<void> => {
  await axios.post(`${apiBaseUrl()}/auth/logout`, {}, { withCredentials: true })
}

export const fetchMe = async (): Promise<AuthUser> => {
  const res = await apiClient.get<RawMeResponse>('/auth/me')
  return res.data.data
}
