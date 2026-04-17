import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

export interface OAuthStatePayload {
  state: string
  codeVerifier: string
  issuedAt: number
}

const STATE_TTL_MS = 5 * 60 * 1000

const getStateSecret = (): string => {
  const secret = process.env.OAUTH_STATE_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('OAUTH_STATE_SECRET must be set and at least 32 characters long')
  }
  return secret
}

const base64urlEncode = (buf: Buffer): string =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const base64urlDecode = (s: string): Buffer => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

export const generateCodeVerifier = (): string => base64urlEncode(randomBytes(32))

export const computeCodeChallenge = (verifier: string): string =>
  base64urlEncode(createHash('sha256').update(verifier).digest())

export const generateState = (): string => base64urlEncode(randomBytes(16))

const sign = (payload: string): string =>
  createHmac('sha256', getStateSecret()).update(payload).digest('hex')

export const sealOAuthState = (payload: OAuthStatePayload): string => {
  const json = JSON.stringify(payload)
  const body = base64urlEncode(Buffer.from(json, 'utf8'))
  const sig = sign(body)
  return `${body}.${sig}`
}

export class InvalidOAuthStateError extends Error {
  constructor(message = 'Invalid OAuth state') {
    super(message)
    this.name = 'InvalidOAuthStateError'
  }
}

export const openOAuthState = (sealed: string): OAuthStatePayload => {
  const parts = sealed.split('.')
  if (parts.length !== 2) {
    throw new InvalidOAuthStateError()
  }
  const [body, sig] = parts
  const expected = sign(body)
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new InvalidOAuthStateError()
  }
  let decoded: OAuthStatePayload
  try {
    decoded = JSON.parse(base64urlDecode(body).toString('utf8')) as OAuthStatePayload
  } catch {
    throw new InvalidOAuthStateError()
  }
  if (
    typeof decoded.state !== 'string' ||
    typeof decoded.codeVerifier !== 'string' ||
    typeof decoded.issuedAt !== 'number'
  ) {
    throw new InvalidOAuthStateError()
  }
  if (Date.now() - decoded.issuedAt > STATE_TTL_MS) {
    throw new InvalidOAuthStateError('OAuth state expired')
  }
  return decoded
}

export const OAUTH_STATE_COOKIE_NAME = 'ft_oauth_state'
export const OAUTH_STATE_COOKIE_MAX_AGE_MS = STATE_TTL_MS
