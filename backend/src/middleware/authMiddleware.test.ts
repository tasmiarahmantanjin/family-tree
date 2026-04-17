import { NextFunction, Request, Response } from 'express'
import { requireAuth } from './authMiddleware'
import { signAccessToken } from '../utils/jwt'
import { UnauthorizedError } from '../services/authService'

describe('requireAuth middleware', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64)
    process.env.JWT_ACCESS_EXPIRY = '15m'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  const run = (
    headers: Record<string, string | undefined>,
  ): { next: jest.Mock; req: Partial<Request> } => {
    const next: jest.Mock = jest.fn()
    const req = {
      headers,
      header(name: string) {
        return headers[name.toLowerCase()]
      },
    } as unknown as Request
    requireAuth(req, {} as Response, next as unknown as NextFunction)
    return { next, req }
  }

  it('passes a valid Bearer token and attaches req.user', () => {
    const token = signAccessToken({ sub: 'u-1', email: 'a@b.c' })
    const { next, req } = run({ authorization: `Bearer ${token}` })
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
    expect(req.user).toEqual({ id: 'u-1', email: 'a@b.c' })
  })

  it('rejects a missing Authorization header', () => {
    const { next } = run({})
    expect(next).toHaveBeenCalledTimes(1)
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(UnauthorizedError)
  })

  it('rejects a non-Bearer Authorization header', () => {
    const { next } = run({ authorization: 'Basic abc' })
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(UnauthorizedError)
  })

  it('rejects a malformed token', () => {
    const { next } = run({ authorization: 'Bearer not-a-token' })
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(UnauthorizedError)
  })

  it('rejects an empty token value', () => {
    const { next } = run({ authorization: 'Bearer ' })
    const err = next.mock.calls[0][0]
    expect(err).toBeInstanceOf(UnauthorizedError)
  })
})
