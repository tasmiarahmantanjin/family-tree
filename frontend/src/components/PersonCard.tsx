'use client'

import { FC } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import type { Person } from '@/types'
import Button from '@/components/Button'

export interface PersonCardProps {
  person: Person
  onEdit: (person: Person) => void
  onDelete: (id: number) => void
  loading: boolean
  onHover: (id: number | null) => void
  active: boolean
}

const PersonCard: FC<PersonCardProps> = ({
  person,
  onEdit,
  onDelete,
  loading,
  onHover,
  active,
}) => {
  const { id, name, dateOfBirth, placeOfBirth } = person

  return (
    <div
      data-person-id={id}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      className={clsx(
        'bg-white border-2 rounded-xl p-2 sm:p-3 w-30 sm:w-35 shrink-0 relative z-10 cursor-pointer transition-all duration-200',
        active
          ? 'border-slate-600 shadow-[0_8px_30px_rgb(0,0,0,0.12)] scale-105 ring-4 ring-slate-100'
          : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-300 hover:scale-[1.02]',
      )}
    >
      <h3 className="text-sm font-semibold text-slate-800 text-center truncate" title={name}>
        {name}
      </h3>
      <p className="text-xs text-slate-500 text-center mt-1">
        {format(new Date(dateOfBirth), 'yyyy')}
      </p>
      {placeOfBirth && (
        <p className="text-xs text-slate-400 text-center truncate mt-0.5" title={placeOfBirth}>
          {placeOfBirth}
        </p>
      )}
      <div className="flex gap-1 mt-3 pt-2 border-t border-slate-100">
        <Button variant="secondary" size="small" onClick={() => onEdit(person)} className="flex-1">
          Edit
        </Button>
        <Button
          variant="danger"
          size="small"
          onClick={() => onDelete(id)}
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          ×
        </Button>
      </div>
    </div>
  )
}

export default PersonCard
