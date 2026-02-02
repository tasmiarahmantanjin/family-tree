import { FC, forwardRef, InputHTMLAttributes } from 'react'
import { UseFormRegister, FieldErrors } from 'react-hook-form'
import clsx from 'clsx'

import { INPUT_BASE, ERROR_INPUT } from '@/lib/styles'
import type { CreatePersonInput } from '@/lib/validations'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  optional?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, optional, id, className, ...props }, ref) => (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
        {optional && <span className="text-slate-400 font-normal"> (optional)</span>}
      </label>
      <input ref={ref} id={id} className={clsx(INPUT_BASE, error && ERROR_INPUT)} {...props} />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  ),
)

Input.displayName = 'Input'

interface PersonFormFieldsProps {
  register: UseFormRegister<CreatePersonInput>
  errors: FieldErrors<CreatePersonInput>
  idPrefix?: string
}

const PersonFormFields: FC<PersonFormFieldsProps> = ({ register, errors, idPrefix = '' }) => {
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <Input
        {...register('name')}
        id={`${idPrefix}name`}
        label="Name"
        type="text"
        placeholder="Full name"
        error={errors.name?.message}
        className="mb-4"
      />

      <Input
        {...register('dateOfBirth')}
        id={`${idPrefix}dateOfBirth`}
        label="Date of Birth"
        type="date"
        max={today}
        error={errors.dateOfBirth?.message}
        className="mb-4"
      />

      <Input
        {...register('placeOfBirth')}
        id={`${idPrefix}placeOfBirth`}
        label="Place of Birth"
        type="text"
        placeholder="City, Country"
        optional
        error={errors.placeOfBirth?.message}
        className="mb-5"
      />
    </>
  )
}

export default PersonFormFields
