import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import sequelize from './config/database'
import authRoutes from './routes/auth'
import peopleRoutes from './routes/people'
import relationshipRoutes from './routes/relationships'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

const app = express()

// Security headers
app.use(helmet())

// Trust proxy (behind Cloudflare + K8s ingress)
app.set('trust proxy', 1)

// Health check endpoints — before CORS/rate-limit so infrastructure tools can reach them
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/health/ready', async (_req, res) => {
  try {
    await sequelize.authenticate()
    res.json({ status: 'ready', database: 'connected' })
  } catch {
    res.status(503).json({ status: 'not_ready', database: 'disconnected' })
  }
})

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim())

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
)

// Rate limiting — 100 requests per 15 minutes per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(requestLogger)

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/people', peopleRoutes)
app.use('/api/v1/relationships', relationshipRoutes)

app.use(errorHandler)

export default app
