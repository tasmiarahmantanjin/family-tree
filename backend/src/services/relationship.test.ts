import { service } from './relationship'
import { Person, ParentChild } from '../models'
import { NotFoundError } from '../middleware/errorHandler'
import sequelize from '../config/database'

describe('RelationshipService', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await ParentChild.destroy({ where: {} })
    await Person.destroy({ where: {} })
  })

  it('should create a valid parent-child relationship', async () => {
    const parent = await Person.create({
      name: 'Parent',
      dateOfBirth: new Date('1970-01-01'),
    })
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('1995-01-01'),
    })

    const relationship = await service.createRelationship({
      parentId: parent.id,
      childId: child.id,
    })

    expect(relationship.parentId).toBe(parent.id)
    expect(relationship.childId).toBe(child.id)
  })

  it('should reject when parent is not 15 years older than child', async () => {
    const parent = await Person.create({
      name: 'Young Parent',
      dateOfBirth: new Date('1990-01-01'),
    })
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('2000-01-01'),
    })

    await expect(
      service.createRelationship({ parentId: parent.id, childId: child.id }),
    ).rejects.toThrow(/at least 15 years older/)
  })

  it('should reject when a person tries to be their own parent', async () => {
    const person = await Person.create({
      name: 'Self',
      dateOfBirth: new Date('1990-01-01'),
    })

    await expect(
      service.createRelationship({ parentId: person.id, childId: person.id }),
    ).rejects.toThrow('A person cannot be their own parent')
  })

  it('should reject when child already has 2 parents', async () => {
    const parent1 = await Person.create({
      name: 'Parent 1',
      dateOfBirth: new Date('1960-01-01'),
    })
    const parent2 = await Person.create({
      name: 'Parent 2',
      dateOfBirth: new Date('1962-01-01'),
    })
    const parent3 = await Person.create({
      name: 'Parent 3',
      dateOfBirth: new Date('1958-01-01'),
    })
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('1990-01-01'),
    })

    await service.createRelationship({ parentId: parent1.id, childId: child.id })
    await service.createRelationship({ parentId: parent2.id, childId: child.id })

    await expect(
      service.createRelationship({ parentId: parent3.id, childId: child.id }),
    ).rejects.toThrow('at most 2 parents')
  })

  it('should reject duplicate relationships', async () => {
    const parent = await Person.create({
      name: 'Parent',
      dateOfBirth: new Date('1970-01-01'),
    })
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('1995-01-01'),
    })

    await service.createRelationship({ parentId: parent.id, childId: child.id })

    await expect(
      service.createRelationship({ parentId: parent.id, childId: child.id }),
    ).rejects.toThrow('already exists')
  })

  it('should reject cycles (child cannot be ancestor of parent)', async () => {
    const personA = await Person.create({
      name: 'Person A',
      dateOfBirth: new Date('1950-01-01'),
    })
    const personB = await Person.create({
      name: 'Person B',
      dateOfBirth: new Date('1975-01-01'),
    })

    await service.createRelationship({ parentId: personA.id, childId: personB.id })

    await expect(
      service.createRelationship({ parentId: personB.id, childId: personA.id }),
    ).rejects.toThrow(/at least 15 years older/)
  })

  it('should allow valid non-cyclic relationships (multi-generation family)', async () => {
    const grandparent = await Person.create({
      name: 'Grandparent',
      dateOfBirth: new Date('1940-01-01'),
    })
    const parent1 = await Person.create({
      name: 'Parent 1',
      dateOfBirth: new Date('1965-01-01'),
    })
    const parent2 = await Person.create({
      name: 'Parent 2',
      dateOfBirth: new Date('1967-01-01'),
    })
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('1990-01-01'),
    })

    // Build: Grandparent -> Parent1 -> Child <- Parent2
    await service.createRelationship({ parentId: grandparent.id, childId: parent1.id })
    await service.createRelationship({ parentId: parent1.id, childId: child.id })
    const relationship = await service.createRelationship({
      parentId: parent2.id,
      childId: child.id,
    })

    expect(relationship).toBeDefined()
  })

  it('should throw NotFoundError for non-existent parent', async () => {
    const child = await Person.create({
      name: 'Child',
      dateOfBirth: new Date('1995-01-01'),
    })

    await expect(
      service.createRelationship({ parentId: 99999, childId: child.id }),
    ).rejects.toThrow(NotFoundError)
  })

  it('should throw NotFoundError for non-existent child', async () => {
    const parent = await Person.create({
      name: 'Parent',
      dateOfBirth: new Date('1970-01-01'),
    })

    await expect(
      service.createRelationship({ parentId: parent.id, childId: 99999 }),
    ).rejects.toThrow(NotFoundError)
  })
})
