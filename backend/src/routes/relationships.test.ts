import request from 'supertest'
import app from '../app'
import sequelize from '../config/database'
import { ParentChild, Person, RefreshToken, User } from '../models'
import { createAuthedUser } from '../test-utils/authedAgent'

describe('relationships routes (auth enforcement)', () => {
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
    it('GET /tree returns 401', async () => {
      const res = await request(app).get('/api/v1/relationships/tree')
      expect(res.status).toBe(401)
    })

    it('POST /link returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/relationships/link')
        .send({ parentId: 1, childId: 2 })
      expect(res.status).toBe(401)
    })

    it('POST /unlink returns 401', async () => {
      const res = await request(app)
        .post('/api/v1/relationships/unlink')
        .send({ parentId: 1, childId: 2 })
      expect(res.status).toBe(401)
    })
  })

  describe('with auth', () => {
    it('GET /tree returns the tree', async () => {
      const res = await request(app)
        .get('/api/v1/relationships/tree')
        .set('Authorization', authHeader)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })

    it('POST /link creates a relationship between two people', async () => {
      const parent = await Person.create({
        name: 'Parent',
        dateOfBirth: new Date('1960-01-01'),
      })
      const child = await Person.create({
        name: 'Child',
        dateOfBirth: new Date('1990-01-01'),
      })
      const res = await request(app)
        .post('/api/v1/relationships/link')
        .set('Authorization', authHeader)
        .send({ parentId: parent.id, childId: child.id })
      expect(res.status).toBe(201)
      expect(res.body.data.parentId).toBe(parent.id)
      expect(res.body.data.childId).toBe(child.id)
    })
  })
})
