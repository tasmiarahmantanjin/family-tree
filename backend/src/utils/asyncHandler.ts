import { Request, Response, NextFunction } from 'express'

export const asyncHandler = <TRes = void>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<TRes>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
