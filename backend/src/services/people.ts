import { Person, ParentChild } from '../models'
import { ValidationError } from '../middleware/errorHandler'
import { MIN_PARENT_AGE_DIFF_YEARS, calculateAgeDiffYears } from '../types'

/**
 * Validates that a dateOfBirth change doesn't break existing relationships.
 * Checks both as-parent and as-child relationships.
 */
export const validateDateOfBirthChange = async (personId: number, newDob: Date): Promise<void> => {
  const asParent = await ParentChild.findAll({
    where: { parentId: personId },
    include: [{ model: Person, as: 'child', attributes: ['id', 'name', 'dateOfBirth'] }],
  })

  for (const { child } of asParent) {
    if (child) {
      const childDob = new Date(child.dateOfBirth)
      const ageDiffYears = calculateAgeDiffYears(newDob, childDob)
      if (ageDiffYears < MIN_PARENT_AGE_DIFF_YEARS) {
        throw new ValidationError(
          `Cannot update date of birth: would make age difference with child "${child.name}" only ${ageDiffYears.toFixed(1)} years (minimum ${MIN_PARENT_AGE_DIFF_YEARS} required)`,
        )
      }
    }
  }

  const asChild = await ParentChild.findAll({
    where: { childId: personId },
    include: [{ model: Person, as: 'parent', attributes: ['id', 'name', 'dateOfBirth'] }],
  })

  for (const { parent } of asChild) {
    if (parent) {
      const parentDob = new Date(parent.dateOfBirth)
      const ageDiffYears = calculateAgeDiffYears(parentDob, newDob)
      if (ageDiffYears < MIN_PARENT_AGE_DIFF_YEARS) {
        throw new ValidationError(
          `Cannot update date of birth: would make age difference with parent "${parent.name}" only ${ageDiffYears.toFixed(1)} years (minimum ${MIN_PARENT_AGE_DIFF_YEARS} required)`,
        )
      }
    }
  }
}
