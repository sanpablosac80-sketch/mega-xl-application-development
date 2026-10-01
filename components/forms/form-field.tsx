'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import type { ActionState } from '@/app/actions'
import { cn } from '@/lib/utils'

export const initialActionState: ActionState = { ok: false, message: '' }

export function FormField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function useActionFeedback(state: ActionState, onSuccess?: () => void) {
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  useEffect(() => {
    if (!state.ts) return
    if (state.ok) {
      toast.success(state.message)
      onSuccessRef.current?.()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state.ts, state.ok, state.message])
}

export function fieldProps(name: string, state: ActionState) {
  const error = state.errors?.[name]
  return {
    id: name,
    name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${name}-error` : undefined,
  }
}
