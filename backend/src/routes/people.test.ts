import request from 'supertest'
import app from '../app'
import sequelize from '../config/database'
import { ParentChild, Person, RefreshToken, User } from '../models'
import { createAuthedUser } from '../test-utils/authedAgent'

describe('people routes (auth enforcement)', () => {
  let authHeader: string

  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await ParentChild.destroy({ where: {} })
    await Person.destroy({ where: {} })
    await RefreshToken.destroy({ where: {} })
    await User.destroy({ where: {} })
    ;({ authHeader } = await createAuthedUser())
  })

  describe('without auth', () => {
    it('GET / returns 401', async () => {
      const res = await request(app).get('/api/v1/people')
      expect(res.status).toBe(401)
    })

    it('POST / returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/people')
        .send({ name: 'x', dateOfBirth: '1990-01-01' })
      expect(res.status).toBe(401)
    })

    it('PUT /:id returns 401', async () => {
      const res = await request(app).put('/api/v1/people/1').send({ name: 'y' })
      expect(res.status).toBe(401)
    })

    it('DELETE /:id returns 401', async () => {
      const res = await request(app).delete('/api/v1/people/1')
      expect(res.status).toBe(401)
    })

    it('rejects a malformed Bearer token', async () => {
      const res = await request(app).get('/api/v1/people').set('Authorization', 'Bearer not-a-jwt')
      expect(res.status).toBe(401)
    })
  })

  describe('with auth', () => {
    it('GET / returns the list', async () => {
      const res = await request(app).get('/api/v1/people').set('Authorization', authHeader)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('POST / creates a person', async () => {
      const res = await request(app)
        .post('/api/v1/people')
        .set('Authorization', authHeader)
        .send({ name: 'Alice', dateOfBirth: '1990-05-15' })
      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('Alice')
    })

    it('DELETE /:id removes a person', async () => {
      const created = await request(app)
        .post('/api/v1/people')
        .set('Authorization', authHeader)
        .send({ name: 'Bob', dateOfBirth: '1980-01-01' })
      const id = created.body.data.id
      const del = await request(app).delete(`/api/v1/people/${id}`).set('Authorization', authHeader)
      expect(del.status).toBe(204)
    })
  })
})
