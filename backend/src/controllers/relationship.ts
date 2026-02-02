import { ParentChild } from '../models'
import { createRelationshipSchema } from '../schemas/relationship'
import { NotFoundError } from '../middleware/errorHandler'
import { service } from '../services/relationship'
import { StatusCode } from '../types'
import { asyncHandler } from '../utils/asyncHandler'

const getTree = asyncHandler(async (_req, res) => {
  const tree = await service.getTreeWithComputedFields()
  res.status(StatusCode.OK).json({ data: tree })
})

const link = asyncHandler(async (req, res) => {
  const { parentId, childId } = createRelationshipSchema.parse(req.body)

  const relationship = await service.createRelationship({ parentId, childId })

  res.status(StatusCode.CREATED).json({
    data: {
      id: relationship.id,
      parentId: relationship.parentId,
      childId: relationship.childId,
    },
  })
})

const unlink = asyncHandler(async (req, res) => {
  const { parentId, childId } = createRelationshipSchema.parse(req.body)

  const relationship = await ParentChild.findOne({
    where: { parentId, childId },
  })

  if (!relationship) {
    throw new NotFoundError('Relationship not found')
  }

  await relationship.destroy()

  res.status(StatusCode.NO_CONTENT).send()
})

export default {
  getTree,
  link,
  unlink,
}
