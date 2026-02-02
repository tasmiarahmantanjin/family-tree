'use client'

import { FC, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useUpdatePerson } from '@/hooks/usePeople'
import { createPersonSchema, type CreatePersonInput } from '@/lib/validations'
import { ApiError } from '@/lib/api'
import type { Person } from '@/types'

import Alert from '@/components/Alert'
import Button from '@/components/Button'
import PersonFormFields from '@/components/PersonFormFields'

interface EditPersonModalProps {
  person: Person
  onClose: () => void
}

const EditPersonModal: FC<EditPersonModalProps> = ({ person, onClose }) => {
  const updatePerson = useUpdatePerson()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    mode: 'onChange',
    defaultValues: {
      name: person.name,
      dateOfBirth: new Date(person.dateOfBirth).toISOString().split('T')[0],
      placeOfBirth: person.placeOfBirth || '',
    },
  })

  const onSubmit = (data: CreatePersonInput) => {
    updatePerson.mutate(
      {
        id: person.id,
        data: {
          name: data.name.trim(),
          dateOfBirth: data.dateOfBirth,
          placeOfBirth: data.placeOfBirth?.trim() || undefined,
        },
      },
      { onSuccess: () => onClose() },
    )
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const isLoading = isSubmitting || updatePerson.isPending
  const errorDetails =
    updatePerson.error instanceof ApiError ? updatePerson.error.details : undefined

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-person-title"
        className="bg-white rounded-lg p-4 sm:p-5 w-full max-w-sm mx-3 sm:mx-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="edit-person-title" className="section-title">
            Edit Person
          </h3>
          <Button variant="secondary" size="icon" onClick={onClose} aria-label="Close dialog">
            ×
          </Button>
        </div>

        {updatePerson.isError && (
          <Alert variant="error" details={errorDetails} className="mb-4">
            {updatePerson.error?.message || 'Failed to update person'}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <PersonFormFields register={register} errors={errors} idPrefix="edit-" />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={isLoading} disabled={!isDirty || !isValid}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditPersonModal
