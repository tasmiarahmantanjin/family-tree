import { NextFunction, Request, Response, Router } from 'express'
import rateLimit from 'express-rate-limit'
import auth from '../controllers/auth'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

const noopLimiter = (_req: Request, _res: Response, next: NextFunction): void => next()

// Tighter than the app-level limiter; bypassed under NODE_ENV=test so integration
// tests that exercise many auth flows against the same in-process app don't trip it.
const authLimiter =
  process.env.NODE_ENV === 'test'
    ? noopLimiter
    : rateLimit({
        windowMs: 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many authentication requests, please try again later' },
      })

router.use(authLimiter)

router.get('/google', auth.startGoogleOAuth)
router.get('/google/callback', auth.googleOAuthCallback)
router.post('/refresh', auth.refresh)
router.post('/logout', auth.logout)
router.get('/me', requireAuth, auth.me)

export default router
