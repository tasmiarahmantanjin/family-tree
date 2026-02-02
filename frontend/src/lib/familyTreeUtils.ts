import type { Person } from '@/types'

export interface ConnectionLine {
  parentId: number
  childId: number
  x1: number
  y1: number
  x2: number
  y2: number
}

export const groupByGeneration = (people: Person[]): Map<number, Person[]> => {
  const map = new Map<number, Person[]>()

  people.forEach((person) => {
    const { generationLevel } = person
    if (!map.has(generationLevel)) map.set(generationLevel, [])
    map.get(generationLevel)!.push(person)
  })

  return map
}

export const isDirectConnection = (
  people: Person[],
  hoveredId: number,
  otherId: number,
): boolean => {
  const person = people.find(({ id }) => id === hoveredId)
  if (!person) return false

  const { ancestorIds, descendantIds } = person
  return ancestorIds.includes(otherId) || descendantIds.includes(otherId)
}

export const calculateConnectionLines = (
  container: HTMLDivElement,
  people: Person[],
): ConnectionLine[] => {
  const containerRect = container.getBoundingClientRect()
  const lines: ConnectionLine[] = []
  const arrowOffset = 10

  people.forEach(({ id, parents }) => {
    if (!parents) return

    const childEl = container.querySelector(`[data-person-id="${id}"]`) as HTMLElement
    if (!childEl) return

    const childRect = childEl.getBoundingClientRect()
    const childX = childRect.left + childRect.width / 2 - containerRect.left
    const childY = childRect.top - containerRect.top - arrowOffset

    parents.forEach(({ id: parentId }) => {
      const parentEl = container.querySelector(`[data-person-id="${parentId}"]`) as HTMLElement
      if (!parentEl) return

      const parentRect = parentEl.getBoundingClientRect()
      const parentX = parentRect.left + parentRect.width / 2 - containerRect.left
      const parentY = parentRect.bottom - containerRect.top

      lines.push({
        parentId,
        childId: id,
        x1: parentX,
        y1: parentY,
        x2: childX,
        y2: childY,
      })
    })
  })

  return lines
}

export const getConnectionPath = ({ x1, y1, x2, y2 }: ConnectionLine): string => {
  const midY = (y1 + y2) / 2
  const radius = 8

  if (Math.abs(x1 - x2) < 4) {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }

  const dir = x2 > x1 ? 1 : -1

  return `M ${x1} ${y1}
          L ${x1} ${midY - radius}
          Q ${x1} ${midY} ${x1 + radius * dir} ${midY}
          L ${x2 - radius * dir} ${midY}
          Q ${x2} ${midY} ${x2} ${midY + radius}
          L ${x2} ${y2}`
}
