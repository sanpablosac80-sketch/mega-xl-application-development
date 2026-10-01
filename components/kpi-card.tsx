import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const tones = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success-foreground',
  warning: 'bg-warning/20 text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
} as const

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: keyof typeof tones
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  )
}
