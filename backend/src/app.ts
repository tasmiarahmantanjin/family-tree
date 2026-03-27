import express from 'express'
import cors from 'cors'
import sequelize from './config/database'
import peopleRoutes from './routes/people'
import relationshipRoutes from './routes/relationships'
import { errorHandler } from './middleware/errorHandler'

const app = express()

// Health check endpoints — before CORS so infrastructure tools can reach them
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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/v1/people', peopleRoutes)
app.use('/api/v1/relationships', relationshipRoutes)

app.use(errorHandler)

export default app
