import { NextFunction, Request, Response } from 'express'
import { UnauthorizedError } from '../services/authService'
import { InvalidTokenError, verifyAccessToken } from '../utils/jwt'
import { AuthenticatedUser } from '../types/auth'

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'))
  }
  const token = header.slice(7).trim()
  if (!token) {
    return next(new UnauthorizedError('Missing bearer token'))
  }
  try {
    const payload = verifyAccessToken(token)
    req.user = { id: payload.sub, email: payload.email }
    next()
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return next(new UnauthorizedError('Invalid or expired access token'))
    }
    next(err)
  }
}
