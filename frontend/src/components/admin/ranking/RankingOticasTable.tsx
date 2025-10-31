'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Building, Users, Star } from 'lucide-react';
import { RankingOtica } from '@/modulos/ranking/ranking.service'; // Assuming type is accessible

interface RankingOticasTableProps {
  data: RankingOtica[];
}

const Row = ({ otica, index }: { otica: RankingOtica; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMatriz = otica.ehMatriz && otica.filiais && otica.filiais.length > 0;

  return (
    <>
      <tr
        className={`border-b border-border/50 ${isMatriz ? 'cursor-pointer' : ''} hover:bg-accent/50 transition-colors`}
        onClick={() => isMatriz && setIsExpanded(!isExpanded)}
      >
        <td className="p-3 text-sm text-center">{index + 1}</td>
        <td className="p-3 text-sm">
          <div className="flex items-center">
            {isMatriz ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 mr-2" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )
            ) : (
              <div className="w-6"></div> // Placeholder for alignment
            )}
            <Building className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-medium">{otica.nome}</span>
            {otica.ehMatriz && <span className="ml-2 text-xs text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded-full">Matriz</span>}
          </div>
        </td>
        <td className="p-3 text-sm text-center font-mono flex items-center justify-center">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            {otica.vendedores}
        </td>
        <td className="p-3 text-sm text-center font-bold font-mono flex items-center justify-center">
            <Star className="h-4 w-4 mr-2 text-yellow-400" />
            {otica.totalPontos.toLocaleString('pt-BR')}
        </td>
      </tr>
      {isMatriz && (
        <AnimatePresence>
          {isExpanded && (
            <motion.tr
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-accent/20"
            >
              <td colSpan={4} className="p-0">
                <div className="p-4">
                  <table className="w-full">
                    <tbody>
                      {otica.filiais?.map((filial) => (
                        <tr key={filial.id} className="border-b border-border/30 last:border-b-0">
                          <td className="p-2 text-xs pl-12 flex items-center">
                            <Building className="h-3 w-3 mr-2 text-muted-foreground" />
                            {filial.nome}
                          </td>
                          <td className="p-2 text-xs text-center font-mono flex items-center justify-center">
                            <Users className="h-3 w-3 mr-2 text-muted-foreground" />
                            {filial.vendedores}
                          </td>
                          <td className="p-2 text-xs text-center font-bold font-mono flex items-center justify-center">
                            <Star className="h-3 w-3 mr-2 text-yellow-400" />
                            {filial.totalPontos.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </motion.tr>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default function RankingOticasTable({ data }: RankingOticasTableProps) {
  if (!data || data.length === 0) {
    return <p>Nenhum dado de ranking de óticas para exibir.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50 bg-card/50 backdrop-blur-lg">
      <table className="min-w-full divide-y divide-border/50">
        <thead className="bg-accent/30">
          <tr>
            <th className="p-3 text-xs font-semibold tracking-wider text-left text-muted-foreground uppercase w-16 text-center">Pos.</th>
            <th className="p-3 text-xs font-semibold tracking-wider text-left text-muted-foreground uppercase">Ótica</th>
            <th className="p-3 text-xs font-semibold tracking-wider text-left text-muted-foreground uppercase w-32 text-center">Vendedores</th>
            <th className="p-3 text-xs font-semibold tracking-wider text-left text-muted-foreground uppercase w-48 text-center">Pontos Totais</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.map((otica, index) => (
            <Row key={otica.id} otica={otica} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
