import { clsx, type ClassValue } from 'clsx'
import { makeUseQueryWithStatus } from 'convex-helpers/react'
import { useQueries } from 'convex-helpers/react/cache/hooks'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const useQueryWithStatus = makeUseQueryWithStatus(useQueries)
