export const FORM_CONTROL_BASE = [
  'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-md text-slate-900 bg-white',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:border-transparent',
  'min-w-0 max-w-full box-border',
].join(' ')

export const INPUT_BASE = `${FORM_CONTROL_BASE} placeholder:text-slate-400`

export const ERROR_INPUT = 'border-red-300 bg-red-50 focus-visible:ring-red-500'
