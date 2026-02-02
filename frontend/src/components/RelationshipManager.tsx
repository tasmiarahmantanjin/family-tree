'use client'

import { FC, useState, useMemo, useCallback, useEffect } from 'react'
import { useForm, useWatch, Controller, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import clsx from 'clsx'
import { format } from 'date-fns'

import { useTree, useLinkRelationship, useUnlinkRelationship } from '@/hooks/useRelationships'
import { createRelationshipSchema, type CreateRelationshipInput } from '@/lib/validations'
import { FORM_CONTROL_BASE, ERROR_INPUT } from '@/lib/styles'
import { ApiError } from '@/lib/api'
import { MIN_PARENT_AGE_DIFF_YEARS } from '@/types'

import Alert from '@/components/Alert'
import Button from '@/components/Button'

type Mode = 'link' | 'unlink'

interface SelectOption {
  value: number
  label: string
}

interface PersonSelectProps {
  name: 'parentId' | 'childId'
  label: string
  control: Control<CreateRelationshipInput>
  options: SelectOption[]
  error?: string
  onChangeCallback: () => void
}

const PersonSelect: FC<PersonSelectProps> = ({
  name,
  label,
  control,
  options,
  error,
  onChangeCallback,
}) => (
  <div className={name === 'parentId' ? 'mb-4' : 'mb-5'}>
    <label htmlFor={name} className="block text-xs font-medium text-slate-600 mb-1.5">
      {label}
    </label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <select
          id={name}
          value={field.value || ''}
          onChange={(e) => {
            onChangeCallback()
            field.onChange(e.target.value ? Number(e.target.value) : 0)
          }}
          className={clsx(FORM_CONTROL_BASE, error && ERROR_INPUT)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    />
    {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
  </div>
)

const TABS: { value: Mode; label: string }[] = [
  { value: 'link', label: 'Link' },
  { value: 'unlink', label: 'Unlink' },
]

const RelationshipManager: FC = () => {
  const { data: people = [], isLoading } = useTree()
  const linkRelationship = useLinkRelationship()
  const unlinkRelationship = useUnlinkRelationship()

  const [mode, setMode] = useState<Mode>('link')

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateRelationshipInput>({
    resolver: zodResolver(createRelationshipSchema),
    mode: 'onChange',
    defaultValues: { parentId: 0, childId: 0 },
  })

  const parentId = useWatch({ control, name: 'parentId' })
  const childId = useWatch({ control, name: 'childId' })

  const mutation = mode === 'link' ? linkRelationship : unlinkRelationship
  const isLink = mode === 'link'

  const hasExistingRelationships = useMemo(
    () => people.some(({ parents }) => parents && parents.length > 0),
    [people],
  )

  const relationshipExists = useMemo(() => {
    if (!parentId || !childId) return false
    const child = people.find(({ id }) => id === childId)
    return child?.parents?.some(({ id }) => id === parentId) ?? false
  }, [people, parentId, childId])

  const ageWarning = useMemo(() => {
    if (!parentId || !childId || parentId === childId) return null
    const parent = people.find(({ id }) => id === parentId)
    const child = people.find(({ id }) => id === childId)
    if (!parent || !child) return null

    const ageDiffMs = new Date(child.dateOfBirth).getTime() - new Date(parent.dateOfBirth).getTime()
    const ageDiffYears = ageDiffMs / (1000 * 60 * 60 * 24 * 365.25)

    if (ageDiffYears < MIN_PARENT_AGE_DIFF_YEARS) {
      return `Age difference is ${ageDiffYears.toFixed(1)} years. Parent must be at least ${MIN_PARENT_AGE_DIFF_YEARS} years older.`
    }
    return null
  }, [people, parentId, childId])

  const personOptions = useMemo(
    () =>
      people.map(({ id, name, dateOfBirth }) => ({
        value: id,
        label: `${name} (${format(new Date(dateOfBirth), 'yyyy')})`,
      })),
    [people],
  )

  const clearMutationStates = useCallback(() => {
    linkRelationship.reset()
    unlinkRelationship.reset()
  }, [linkRelationship, unlinkRelationship])

  useEffect(() => {
    if (mutation.isSuccess) {
      const timer = setTimeout(() => clearMutationStates(), 3000)
      return () => clearTimeout(timer)
    }
  }, [mutation.isSuccess, clearMutationStates])

  const resetForm = useCallback(() => reset({ parentId: 0, childId: 0 }), [reset])

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    resetForm()
    clearMutationStates()
  }

  const onSubmit = (data: CreateRelationshipInput) => {
    mutation.mutate(data, { onSuccess: resetForm })
  }

  const hasSelections = parentId > 0 && childId > 0
  const canSubmit = isValid && hasSelections && (isLink || relationshipExists)
  const errorDetails = mutation.error instanceof ApiError ? mutation.error.details : undefined

  if (isLoading) {
    return (
      <div className="card p-4 sm:p-5">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/2 mb-4" />
          <div className="h-9 bg-slate-100 rounded mb-3" />
          <div className="h-9 bg-slate-100 rounded" />
        </div>
      </div>
    )
  }

  if (people.length < 2) {
    return (
      <div className="card p-4 sm:p-5">
        <h3 className="section-title mb-2">Manage Relationships</h3>
        <p className="text-xs text-slate-500">Add at least 2 people to manage relationships.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-4 sm:p-5 overflow-hidden">
      <h3 className="section-title mb-4">Manage Relationships</h3>

      <div role="tablist" className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4">
        {TABS.map(({ value, label }) => (
          <Button
            key={value}
            role="tab"
            aria-selected={mode === value}
            variant="tab"
            size="small"
            active={mode === value}
            onClick={() => handleModeChange(value)}
            disabled={value === 'unlink' && !hasExistingRelationships}
            className="flex-1"
          >
            {label}
          </Button>
        ))}
      </div>

      {mutation.isError && (
        <Alert variant="error" details={errorDetails} className="mb-4">
          {mutation.error?.message || `Failed to ${mode} relationship`}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert variant="success" className="mb-4">
          Relationship {isLink ? 'linked' : 'unlinked'} successfully
        </Alert>
      )}

      <PersonSelect
        name="parentId"
        label="Parent"
        control={control}
        options={personOptions}
        error={errors.parentId?.message}
        onChangeCallback={clearMutationStates}
      />

      <PersonSelect
        name="childId"
        label="Child"
        control={control}
        options={personOptions}
        error={errors.childId?.message}
        onChangeCallback={clearMutationStates}
      />

      {!isLink && hasSelections && !relationshipExists && (
        <Alert variant="warning" className="mb-3">
          No relationship exists between these people
        </Alert>
      )}

      {isLink && ageWarning && (
        <Alert variant="warning" className="mb-3">
          {ageWarning}
        </Alert>
      )}

      <Button
        type="submit"
        variant={isLink ? 'primary' : 'danger'}
        fullWidth
        disabled={!canSubmit}
        loading={mutation.isPending}
      >
        {isLink ? 'Link' : 'Unlink'}
      </Button>
    </form>
  )
}

export default RelationshipManager
