import { FC, ReactNode } from 'react'
import clsx from 'clsx'

interface AlertProps {
  variant: 'success' | 'error' | 'warning'
  children: ReactNode
  details?: string[]
  className?: string
}

const VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  error: 'bg-red-50 text-red-700 border-red-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
}

const Alert: FC<AlertProps> = ({ variant, children, details, className }) => {
  return (
    <div
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={clsx(
        'text-sm px-3 py-2.5 rounded-md border wrap-break-words',
        VARIANTS[variant],
        className,
      )}
    >
      <p>{children}</p>
      {details && details.length > 0 && (
        <ul className="mt-1.5 list-disc list-inside text-xs">
          {details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Alert
