'use client'

import { FC, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useCreatePerson } from '@/hooks/usePeople'
import { createPersonSchema, type CreatePersonInput } from '@/lib/validations'
import { ApiError } from '@/lib/api'
import Alert from '@/components/Alert'
import Button from '@/components/Button'
import PersonFormFields from '@/components/PersonFormFields'

const PersonForm: FC = () => {
  const createPerson = useCreatePerson()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      dateOfBirth: '',
      placeOfBirth: '',
    },
  })

  useEffect(() => {
    if (createPerson.isSuccess) {
      const timer = setTimeout(() => createPerson.reset(), 3000)
      return () => clearTimeout(timer)
    }
  }, [createPerson.isSuccess, createPerson])

  const onSubmit = (data: CreatePersonInput) => {
    createPerson.mutate(
      {
        name: data.name.trim(),
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth?.trim() || undefined,
      },
      { onSuccess: () => reset() },
    )
  }

  const isLoading = isSubmitting || createPerson.isPending
  const errorDetails =
    createPerson.error instanceof ApiError ? createPerson.error.details : undefined

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-4 sm:p-5 overflow-hidden">
      <h3 className="section-title mb-4">Add Person</h3>

      {createPerson.isError && (
        <Alert variant="error" details={errorDetails} className="mb-4">
          {createPerson.error?.message || 'Failed to create person'}
        </Alert>
      )}

      {createPerson.isSuccess && (
        <Alert variant="success" className="mb-4">
          Person added successfully
        </Alert>
      )}

      <PersonFormFields register={register} errors={errors} />

      <Button type="submit" fullWidth loading={isLoading} disabled={!isValid}>
        Add Person
      </Button>
    </form>
  )
}

export default PersonForm
