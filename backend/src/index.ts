import 'dotenv/config'
import app from './app'
import sequelize from './config/database'
import './models'

const PORT = process.env.PORT || 3001

const startServer = async (): Promise<void> => {
  try {
    await sequelize.sync()
    console.log('Database synchronized successfully')

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
