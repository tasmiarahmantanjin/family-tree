'use client'

import { FC, useState, useMemo, useRef, useLayoutEffect, useCallback, ReactNode } from 'react'

import { useDeletePerson } from '@/hooks/usePeople'
import { useTree } from '@/hooks/useRelationships'
import type { Person } from '@/types'
import {
  ConnectionLine,
  groupByGeneration,
  isDirectConnection,
  calculateConnectionLines,
  getConnectionPath,
} from '@/lib/familyTreeUtils'

import Alert from '@/components/Alert'
import PersonCard from '@/components/PersonCard'
import EditPersonModal from '@/components/EditPersonModal'

interface CardWrapperProps {
  title?: string
  children: ReactNode
}

const CardWrapper: FC<CardWrapperProps> = ({ title = 'Family Tree', children }) => (
  <div className="card p-4 sm:p-5">
    <h3 className="section-title mb-4">{title}</h3>
    {children}
  </div>
)

const EmptyIcon: FC = () => (
  <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </svg>
)

const SvgDefs: FC = () => (
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#94a3b8" />
    </marker>
    <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <path d="M 0 0 L 8 3 L 0 6 L 2 3 Z" fill="#475569" />
    </marker>
  </defs>
)

interface ConnectionPathProps {
  line: ConnectionLine
  active: boolean
  dimmed: boolean
}

const ConnectionPath: FC<ConnectionPathProps> = ({ line, active, dimmed }) => (
  <path
    d={getConnectionPath(line)}
    fill="none"
    stroke={active ? '#475569' : '#94a3b8'}
    strokeWidth={active ? 2.5 : 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    markerEnd={active ? 'url(#arrow-active)' : 'url(#arrow)'}
    opacity={active ? 1 : dimmed ? 0.3 : 0.7}
    className="transition-all duration-200"
  />
)

const FamilyTree: FC = () => {
  const { data: people = [], isLoading, isError } = useTree()
  const deletePerson = useDeletePerson()

  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [lines, setLines] = useState<ConnectionLine[]>([])
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const groupedByGeneration = useMemo(() => groupByGeneration(people), [people])
  const sortedLevels = useMemo(
    () => Array.from(groupedByGeneration.keys()).sort((a, b) => a - b),
    [groupedByGeneration],
  )

  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })

  const updateLines = useCallback(() => {
    if (!containerRef.current || people.length === 0) return
    setLines(calculateConnectionLines(containerRef.current, people))
    setSvgSize({
      width: containerRef.current.scrollWidth,
      height: containerRef.current.scrollHeight,
    })
  }, [people])

  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(updateLines)
    window.addEventListener('resize', updateLines)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateLines)
    }
  }, [updateLines, groupedByGeneration])

  const handleDelete = useCallback(
    (id: number) => {
      if (window.confirm('Delete this person and their relationships?')) {
        deletePerson.mutate(id)
      }
    },
    [deletePerson],
  )

  const isHighlightedCard = useCallback(
    (personId: number): boolean =>
      hoveredId !== null &&
      (personId === hoveredId || isDirectConnection(people, hoveredId, personId)),
    [hoveredId, people],
  )

  const isHighlightedLine = useCallback(
    ({ parentId, childId }: ConnectionLine): boolean =>
      hoveredId !== null &&
      (hoveredId === parentId ||
        hoveredId === childId ||
        isDirectConnection(people, hoveredId, parentId) ||
        isDirectConnection(people, hoveredId, childId)),
    [hoveredId, people],
  )

  if (isLoading) {
    return (
      <CardWrapper>
        <div className="animate-pulse flex justify-center gap-4">
          <div className="w-28 h-20 bg-slate-100 rounded-xl" />
          <div className="w-28 h-20 bg-slate-100 rounded-xl" />
          <div className="w-28 h-20 bg-slate-100 rounded-xl" />
        </div>
      </CardWrapper>
    )
  }

  if (isError) {
    return (
      <CardWrapper>
        <Alert variant="error">Failed to load family tree. Please try again.</Alert>
      </CardWrapper>
    )
  }

  if (people.length === 0) {
    return (
      <CardWrapper title="Family Tree">
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <EmptyIcon />
          </div>
          <p className="text-sm text-slate-800 font-medium">Start your family tree</p>
          <p className="text-xs text-slate-500 mt-1.5">Add the first person using the form</p>
        </div>
      </CardWrapper>
    )
  }

  const hasHover = hoveredId !== null

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="section-title">Family Tree</h3>
        <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
          {people.length} {people.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {deletePerson.isError && (
        <Alert variant="error" className="mb-4">
          {deletePerson.error?.message || 'Failed to delete'}
        </Alert>
      )}

      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden pb-4"
        style={{ minHeight: sortedLevels.length * 160 }}
      >
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ zIndex: 0, width: svgSize.width || '100%', height: svgSize.height || '100%' }}
        >
          <SvgDefs />
          {lines.map((line, idx) => (
            <ConnectionPath
              key={idx}
              line={line}
              active={isHighlightedLine(line)}
              dimmed={hasHover && !isHighlightedLine(line)}
            />
          ))}
        </svg>

        <div className="space-y-16 inline-block min-w-full pt-4 pb-4">
          {sortedLevels.map((level) => (
            <div key={level} className="flex justify-center gap-8 px-4">
              {groupedByGeneration.get(level)!.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onEdit={setEditingPerson}
                  onDelete={handleDelete}
                  loading={deletePerson.isPending}
                  onHover={setHoveredId}
                  active={isHighlightedCard(person.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {editingPerson && (
        <EditPersonModal person={editingPerson} onClose={() => setEditingPerson(null)} />
      )}
    </div>
  )
}

export default FamilyTree
