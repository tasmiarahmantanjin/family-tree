import { Request, Response, NextFunction } from 'express'

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now()

  res.on('finish', () => {
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      ip: req.ip,
      user_agent: req.get('user-agent'),
    }

    if (res.statusCode >= 400) {
      console.error(JSON.stringify(log))
    } else {
      console.log(JSON.stringify(log))
    }
  })

  next()
}
