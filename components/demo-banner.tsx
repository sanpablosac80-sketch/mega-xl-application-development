import Link from 'next/link'
import { Info } from 'lucide-react'

export function DemoBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-primary/20 bg-accent px-4 py-2 text-sm text-accent-foreground md:px-6"
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium">Modo demostración:</span> los datos son de ejemplo y no se
        guardan permanentemente.{' '}
        <Link href="/configuracion" className="font-medium underline underline-offset-2">
          Conectar Supabase
        </Link>
      </p>
    </div>
  )
}
