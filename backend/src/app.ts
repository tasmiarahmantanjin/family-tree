import express from 'express'
import cors from 'cors'
import peopleRoutes from './routes/people'
import relationshipRoutes from './routes/relationships'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/v1/people', peopleRoutes)
app.use('/api/v1/relationships', relationshipRoutes)

app.use(errorHandler)

export default app
