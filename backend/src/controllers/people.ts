import { Op } from 'sequelize'
import { Person, ParentChild } from '../models'
import { createPersonSchema, updatePersonSchema } from '../schemas/person'
import { NotFoundError } from '../middleware/errorHandler'
import { StatusCode } from '../types'
import { asyncHandler } from '../utils/asyncHandler'
import { validateDateOfBirthChange } from '../services/people'

const getAll = asyncHandler(async (_req, res) => {
  const people = await Person.findAll({
    attributes: ['id', 'name', 'dateOfBirth'],
    order: [['createdAt', 'DESC']],
  })

  res.status(StatusCode.OK).json({ data: people })
})

const create = asyncHandler(async (req, res) => {
  const { name, dateOfBirth, placeOfBirth } = createPersonSchema.parse(req.body)

  const person = await Person.create({
    name,
    dateOfBirth: new Date(dateOfBirth),
    placeOfBirth: placeOfBirth ?? null,
  })

  res.status(StatusCode.CREATED).json({ data: person })
})

const update = asyncHandler(async (req, res) => {
  const {
    params: { id },
    body,
  } = req
  const personId = Number.parseInt(id, 10)

  const validatedData = updatePersonSchema.parse(body)

  const person = await Person.findByPk(personId)
  if (!person) {
    throw new NotFoundError(`Person with ID ${personId} not found`)
  }

  const { name, dateOfBirth, placeOfBirth } = validatedData

  // Validate dateOfBirth changes don't break existing relationships
  if (dateOfBirth !== undefined) {
    await validateDateOfBirthChange(personId, new Date(dateOfBirth))
  }

  await person.update({
    ...(name !== undefined && { name }),
    ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
    ...(placeOfBirth !== undefined && { placeOfBirth }),
  })

  res.status(StatusCode.OK).json({ data: person })
})

const deletePerson = asyncHandler(async (req, res) => {
  const { id } = req.params
  const personId = Number.parseInt(id, 10)

  const person = await Person.findByPk(personId)
  if (!person) {
    throw new NotFoundError(`Person with ID ${personId} not found`)
  }

  await ParentChild.destroy({
    where: { [Op.or]: [{ parentId: personId }, { childId: personId }] },
  })

  await person.destroy()

  res.status(StatusCode.NO_CONTENT).send()
})

export default {
  getAll,
  create,
  update,
  delete: deletePerson,
}
