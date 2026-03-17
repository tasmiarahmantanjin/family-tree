import { Sequelize } from 'sequelize'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Strip sslmode from URL to avoid pg driver conflicts — SSL is configured via dialectOptions
const cleanUrl = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '')

const useSSL = process.env.DATABASE_SSL !== 'false'

const sequelize = new Sequelize(cleanUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: useSSL
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
})

export default sequelize
