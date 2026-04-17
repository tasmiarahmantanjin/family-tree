'use client'

import { FC } from 'react'
import type { AuthUser } from '@/lib/auth'

interface UserBadgeProps {
  user: AuthUser
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?'

const UserBadge: FC<UserBadgeProps> = ({ user }) => {
  return (
    <div className="flex items-center gap-2 min-w-0" data-testid="user-badge">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          className="w-8 h-8 rounded-full object-cover border border-slate-200"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center">
          {initials(user.name)}
        </div>
      )}
      <div className="min-w-0 hidden sm:block">
        <div className="text-sm font-medium text-slate-800 truncate" data-testid="user-name">
          {user.name}
        </div>
        <div className="text-xs text-slate-500 truncate">{user.email}</div>
      </div>
    </div>
  )
}

export default UserBadge
