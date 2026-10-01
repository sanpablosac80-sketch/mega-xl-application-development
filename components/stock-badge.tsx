import { cn } from '@/lib/utils'
import type { EstadoStock } from '@/lib/types'

const styles: Record<EstadoStock, string> = {
  OK: 'bg-success/12 text-success-foreground ring-success/30',
  'STOCK BAJO': 'bg-warning/18 text-warning-foreground ring-warning/40',
  'SIN STOCK': 'bg-destructive/10 text-destructive ring-destructive/30',
}

export function StockBadge({ estado, className }: { estado: EstadoStock; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        styles[estado],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {estado}
    </span>
  )
}
