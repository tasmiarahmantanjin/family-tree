import { FC, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  active?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'tab'
  size?: 'default' | 'small' | 'icon'
}

const BASE = [
  'inline-flex items-center justify-center font-medium rounded-md cursor-pointer',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-all duration-150',
].join(' ')

const SIZES = {
  default: 'h-10 sm:h-9 px-4 text-sm',
  small: 'py-1.5 px-2.5 text-xs min-h-[32px]',
  icon: 'w-8 h-8 text-lg',
}

const VARIANTS = {
  primary: 'bg-slate-800 text-white hover:bg-slate-700',
  secondary:
    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  danger: 'text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300',
  tab: 'text-slate-500 hover:text-slate-700',
}

const ACTIVE_VARIANTS: Partial<Record<ButtonProps['variant'] & string, string>> = {
  tab: 'bg-white text-slate-800 shadow-sm',
}

const Button: FC<ButtonProps> = ({
  className,
  children,
  loading = false,
  fullWidth = false,
  active = false,
  variant = 'primary',
  size = 'default',
  disabled = false,
  type = 'button',
  ...rest
}) => {
  const isDisabled = disabled || loading
  const activeClass = active && variant ? ACTIVE_VARIANTS[variant] : undefined

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={clsx(
        BASE,
        SIZES[size],
        VARIANTS[variant],
        activeClass,
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? '...' : children}
    </button>
  )
}

export default Button
