import { Sequelize } from 'sequelize'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Safety guard: refuse to run tests against a non-test database.
// Tests call destroy({ where: {} }) and sync({ force: true }) which wipe data.
// A test DB must have "test" in the hostname or database name.
if (process.env.NODE_ENV === 'test') {
  const isTestDb = /test/i.test(databaseUrl)
  if (!isTestDb) {
    throw new Error(
      'REFUSING TO RUN TESTS: DATABASE_URL does not look like a test database. ' +
        'Tests will wipe data. Use a DATABASE_URL with "test" in the hostname or db name.',
    )
  }
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
