'use client'

import { eliminarCliente } from '@/app/actions'
import { DeleteButton } from '@/components/delete-button'
import { ClienteDialog } from '@/components/forms/cliente-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import type { Cliente } from '@/lib/types'

type Row = Cliente & { compras: number; totalCompras: number }

export function ClientesTable({ clientes, simbolo }: { clientes: Row[]; simbolo: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead>Cliente</TableHead>
            <TableHead>DNI / RUC</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Dirección</TableHead>
            <TableHead className="text-right">Compras</TableHead>
            <TableHead className="text-right">Total comprado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Aún no hay clientes registrados.
              </TableCell>
            </TableRow>
          ) : (
            clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{c.documento || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{c.telefono || '-'}</span>
                    <span className="text-xs text-muted-foreground">{c.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.direccion || '-'}</TableCell>
                <TableCell className="text-right tabular-nums">{c.compras}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMoney(c.totalCompras, simbolo)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <ClienteDialog cliente={c} />
                    <DeleteButton
                      label={c.nombre}
                      description="El cliente se eliminará. Sus ventas se conservarán como Cliente general."
                      onConfirm={() => eliminarCliente(c.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
