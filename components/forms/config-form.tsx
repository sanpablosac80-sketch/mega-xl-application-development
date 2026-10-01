'use client'

import { useActionState } from 'react'
import { guardarConfiguracion } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Configuracion } from '@/lib/types'
import { FormField, fieldProps, initialActionState, useActionFeedback } from './form-field'

export function ConfigForm({ config }: { config: Configuracion }) {
  const [state, action, pending] = useActionState(guardarConfiguracion, initialActionState)
  useActionFeedback(state)
  const err = state.errors ?? {}

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="nombre_empresa" label="Nombre de la empresa" error={err.nombre_empresa}>
          <Input {...fieldProps('nombre_empresa', state)} defaultValue={config.nombre_empresa} required />
        </FormField>
        <FormField id="ruc" label="RUC / NIT">
          <Input {...fieldProps('ruc', state)} defaultValue={config.ruc} />
        </FormField>
        <FormField id="direccion" label="Dirección" className="sm:col-span-2">
          <Input {...fieldProps('direccion', state)} defaultValue={config.direccion} />
        </FormField>
        <FormField id="telefono" label="Teléfono">
          <Input {...fieldProps('telefono', state)} type="tel" defaultValue={config.telefono} />
        </FormField>
        <FormField id="email" label="Correo electrónico" error={err.email}>
          <Input {...fieldProps('email', state)} type="email" defaultValue={config.email} />
        </FormField>
        <FormField id="simbolo_moneda" label="Símbolo de moneda" error={err.simbolo_moneda} hint="Ej. S/, $, €">
          <Input {...fieldProps('simbolo_moneda', state)} defaultValue={config.simbolo_moneda} maxLength={5} required />
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
