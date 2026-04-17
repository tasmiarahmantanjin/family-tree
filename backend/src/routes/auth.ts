import { NextFunction, Request, RequestHandler, Response, Router } from 'express'
import rateLimit from 'express-rate-limit'
import auth from '../controllers/auth'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

const noopLimiter: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next()

// Limiters are bypassed under NODE_ENV=test so integration tests don't trip
// them when many flows run against the same in-process app.
const inTest = process.env.NODE_ENV === 'test'

const makeLimiter = (windowMs: number, max: number, message: string): RequestHandler =>
  inTest
    ? noopLimiter
    : rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: message },
      })

// OAuth start/callback are one-shot per login — keep this tight to dampen
// brute-force against the PKCE/state cookie pairing.
const oauthStartLimiter = makeLimiter(60 * 1000, 10, 'Too many sign-in attempts')
// /refresh is called often (every tab, every token expiry) — be generous but
// still bounded so a stolen cookie can't power unlimited rotations.
const refreshLimiter = makeLimiter(60 * 1000, 60, 'Too many refresh attempts')
// /logout and /me — moderate.
const generalLimiter = makeLimiter(60 * 1000, 30, 'Too many authentication requests')

router.get('/google', oauthStartLimiter, auth.startGoogleOAuth)
router.get('/google/callback', oauthStartLimiter, auth.googleOAuthCallback)
router.post('/refresh', refreshLimiter, auth.refresh)
router.post('/logout', generalLimiter, auth.logout)
router.get('/me', generalLimiter, requireAuth, auth.me)

// Test-only backdoor — the handler itself is a no-op unless
// ALLOW_TEST_LOGIN=true is set explicitly. Gating the mount here would hide
// the route from tests that set the env var dynamically; gating inside the
// controller keeps the route shape stable.
router.post('/test-login', auth.testLogin)

export default router
