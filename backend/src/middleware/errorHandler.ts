import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { ApiErrorResponse, StatusCode } from '../types'

export class AppError extends Error {
  public statusCode: number
  public details?: string[]

  constructor(message: string, statusCode: number = StatusCode.BAD_REQUEST, details?: string[]) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: string[]) {
    super(message, StatusCode.BAD_REQUEST, details)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, StatusCode.NOT_FOUND)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ApiErrorResponse>,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    res.status(StatusCode.BAD_REQUEST).json({ error: 'Validation failed', details })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, details: err.details })
    return
  }

  console.error('Unexpected error:', err)

  res.status(StatusCode.INTERNAL_ERROR).json({ error: 'Internal server error' })
}
