import request from 'supertest'
import app from '../app'
import sequelize from '../config/database'
import { RefreshToken, User } from '../models'

describe('POST /api/v1/auth/test-login', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await RefreshToken.destroy({ where: {} })
    await User.destroy({ where: {} })
    delete process.env.ALLOW_TEST_LOGIN
  })

  it('returns 401 when ALLOW_TEST_LOGIN is not set', async () => {
    const res = await request(app)
      .post('/api/v1/auth/test-login')
      .send({ email: 'e2e@example.com', name: 'E2E' })
    expect(res.status).toBe(401)
  })

  it('returns 401 when ALLOW_TEST_LOGIN is any value other than "true"', async () => {
    process.env.ALLOW_TEST_LOGIN = '1'
    const res = await request(app)
      .post('/api/v1/auth/test-login')
      .send({ email: 'e2e@example.com', name: 'E2E' })
    expect(res.status).toBe(401)
  })

  it('creates a user + session and sets the refresh cookie when enabled', async () => {
    process.env.ALLOW_TEST_LOGIN = 'true'
    const res = await request(app)
      .post('/api/v1/auth/test-login')
      .send({ email: 'e2e@example.com', name: 'E2E' })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toEqual(expect.any(String))
    expect(res.body.data.user.email).toBe('e2e@example.com')
    const cookie = res.headers['set-cookie']
    const cookies = Array.isArray(cookie) ? cookie : cookie ? [cookie] : []
    expect(cookies.some((c: string) => c.startsWith('ft_refresh='))).toBe(true)

    const user = await User.findOne({ where: { email: 'e2e@example.com' } })
    expect(user).not.toBeNull()
    const tokens = await RefreshToken.findAll({ where: { userId: user!.id } })
    expect(tokens).toHaveLength(1)
  })

  it('is idempotent — second call returns the same user', async () => {
    process.env.ALLOW_TEST_LOGIN = 'true'
    await request(app)
      .post('/api/v1/auth/test-login')
      .send({ email: 'e2e@example.com', name: 'E2E' })
    await request(app)
      .post('/api/v1/auth/test-login')
      .send({ email: 'e2e@example.com', name: 'E2E Renamed' })
    const users = await User.findAll({ where: { email: 'e2e@example.com' } })
    expect(users).toHaveLength(1)
    expect(users[0].name).toBe('E2E Renamed')
  })

  it('requires an email', async () => {
    process.env.ALLOW_TEST_LOGIN = 'true'
    const res = await request(app).post('/api/v1/auth/test-login').send({})
    expect(res.status).toBe(401)
  })
})
