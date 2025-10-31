'use client'
import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  paginaAtual: number
  totalPaginas: number
  baseUrl?: string
}

const PaginationControls: React.FC<Props> = ({ paginaAtual, totalPaginas, baseUrl = '/ranking' }) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigateTo = (novaPagina: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set('pagina', String(novaPagina))
    router.push(`${baseUrl}?${params.toString()}`)
  }

  return (
    <div className="flex items-center justify-between mt-6">
      <button
        onClick={() => navigateTo(Math.max(1, paginaAtual - 1))}
        disabled={paginaAtual <= 1}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border/30 bg-card/50 hover:shadow-glass-md transition"
      >
        <ChevronLeft /> Anterior
      </button>

      <div className="text-sm text-muted-foreground">
        Página {paginaAtual} de {totalPaginas}
      </div>

      <button
        onClick={() => navigateTo(Math.min(totalPaginas, paginaAtual + 1))}
        disabled={paginaAtual >= totalPaginas}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border/30 bg-card/50 hover:shadow-glass-md transition"
      >
        Próxima <ChevronRight />
      </button>
    </div>
  )
}

export default PaginationControls
