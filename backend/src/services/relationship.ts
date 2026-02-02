import { Person, ParentChild } from '../models'
import { ValidationError, NotFoundError } from '../middleware/errorHandler'
import {
  MIN_PARENT_AGE_DIFF_YEARS,
  MAX_PARENTS_PER_CHILD,
  calculateAgeDiffYears,
  TreePerson,
} from '../types'

type PersonWithParents = Person & {
  parents?: { id: number }[]
}

// BFS traversal to collect all ancestors
const getAllAncestors = async (personId: number): Promise<Set<number>> => {
  const ancestors = new Set<number>()
  const queue: number[] = [personId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const parentRelations = await ParentChild.findAll({
      where: { childId: currentId },
    })

    for (const { parentId } of parentRelations) {
      if (!ancestors.has(parentId)) {
        ancestors.add(parentId)
        queue.push(parentId)
      }
    }
  }

  return ancestors
}

const checkForCycle = async (parentId: number, childId: number): Promise<boolean> => {
  const ancestors = await getAllAncestors(parentId)
  return ancestors.has(childId)
}

const createRelationship = async (data: {
  parentId: number
  childId: number
}): Promise<ParentChild> => {
  const { parentId, childId } = data

  if (parentId === childId) {
    throw new ValidationError('A person cannot be their own parent')
  }

  const [parent, child] = await Promise.all([Person.findByPk(parentId), Person.findByPk(childId)])

  if (!parent) {
    throw new NotFoundError(`Parent with ID ${parentId} not found`)
  }
  if (!child) {
    throw new NotFoundError(`Child with ID ${childId} not found`)
  }

  const existingRelationship = await ParentChild.findOne({
    where: { parentId, childId },
  })
  if (existingRelationship) {
    throw new ValidationError('This parent-child relationship already exists')
  }

  const parentCount = await ParentChild.count({ where: { childId } })
  if (parentCount >= MAX_PARENTS_PER_CHILD) {
    throw new ValidationError(`A person can have at most ${MAX_PARENTS_PER_CHILD} parents`)
  }

  const parentDob = new Date(parent.dateOfBirth)
  const childDob = new Date(child.dateOfBirth)
  const ageDiffYears = calculateAgeDiffYears(parentDob, childDob)

  if (ageDiffYears < MIN_PARENT_AGE_DIFF_YEARS) {
    throw new ValidationError(
      `Parent must be at least ${MIN_PARENT_AGE_DIFF_YEARS} years older than child. ` +
        `Current age difference: ${ageDiffYears.toFixed(1)} years.`,
    )
  }

  // Cycle detection
  if (await checkForCycle(parentId, childId)) {
    throw new ValidationError(
      'This relationship would create a cycle. A person cannot be their own ancestor.',
    )
  }

  return ParentChild.create({ parentId, childId })
}

const getTreeWithComputedFields = async (): Promise<TreePerson[]> => {
  const people = await Person.findAll({
    attributes: ['id', 'name', 'dateOfBirth', 'placeOfBirth'],
    include: [
      {
        model: Person,
        as: 'parents',
        attributes: ['id'],
        through: { attributes: [] },
      },
    ],
    order: [['createdAt', 'DESC']],
  })

  const parentsMap = new Map<number, number[]>()
  const childrenMap = new Map<number, number[]>()

  const peopleWithParents = people as PersonWithParents[]

  peopleWithParents.forEach(({ id, parents }) => {
    const parentIds = parents?.map(({ id }) => id) ?? []
    parentsMap.set(id!, parentIds)

    parentIds.forEach((parentId) => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, [])
      }
      childrenMap.get(parentId)!.push(id!)
    })
  })

  const computeGenerationLevel = (
    id: number,
    levels: Map<number, number>,
    visited: Set<number>,
  ): number => {
    if (levels.has(id)) return levels.get(id)!
    if (visited.has(id)) {
      levels.set(id, 0)
      return 0
    }
    visited.add(id)

    const parents = parentsMap.get(id) ?? []
    if (parents.length === 0) {
      levels.set(id, 0)
      return 0
    }

    const parentLevels = parents.map((pid) => computeGenerationLevel(pid, levels, new Set(visited)))
    const level = Math.max(...parentLevels) + 1
    levels.set(id, level)
    return level
  }

  const collectAncestors = (id: number, ancestors: Set<number>, processed: Set<number>): void => {
    if (processed.has(id)) return
    processed.add(id)

    const parents = parentsMap.get(id) ?? []
    parents.forEach((parentId) => {
      ancestors.add(parentId)
      collectAncestors(parentId, ancestors, processed)
    })
  }

  const collectDescendants = (
    id: number,
    descendants: Set<number>,
    processed: Set<number>,
  ): void => {
    if (processed.has(id)) return
    processed.add(id)

    const children = childrenMap.get(id) ?? []
    children.forEach((childId) => {
      descendants.add(childId)
      collectDescendants(childId, descendants, processed)
    })
  }

  const levels = new Map<number, number>()
  people.forEach(({ id }) => computeGenerationLevel(id!, levels, new Set()))

  return peopleWithParents.map(({ id, name, dateOfBirth, placeOfBirth, parents }) => {
    const ancestors = new Set<number>()
    collectAncestors(id!, ancestors, new Set())

    const descendants = new Set<number>()
    collectDescendants(id!, descendants, new Set())

    const dob =
      dateOfBirth instanceof Date
        ? dateOfBirth.toISOString().split('T')[0]
        : String(dateOfBirth).split('T')[0]

    return {
      id: id!,
      name,
      dateOfBirth: dob,
      placeOfBirth,
      parents: parents?.map(({ id }) => ({ id })) ?? [],
      generationLevel: levels.get(id!) ?? 0,
      ancestorIds: [...ancestors],
      descendantIds: [...descendants],
    }
  })
}

export const service = {
  createRelationship,
  getTreeWithComputedFields,
}
