'use client'
import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Crown, Trophy, Award, Sparkles, TrendingUp, Star } from 'lucide-react'

export interface RankingUser {
  id: string
  nome: string
  avatarUrl?: string | null
  rankingMoedinhas?: number
  rankingPontosReais?: number
  nivel?: string
  posicao: number
  optica?: {
    nome: string
  } | null
}

interface Props {
  user: RankingUser
  metric: 'moedinhas' | 'pontos'
  isCurrentUser?: boolean
}

/**
 * Badge de Nível - Compacto e Elegante
 */
const NivelBadge: React.FC<{ nivel?: string }> = ({ nivel }) => {
  if (!nivel) return null

  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    DIAMANTE: {
      bg: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border-cyan-400/40',
      text: 'text-cyan-400',
      icon: <Sparkles className="w-3 h-3" />,
    },
    OURO: {
      bg: 'bg-gradient-to-r from-yellow-500/15 to-amber-500/15 border-yellow-400/40',
      text: 'text-yellow-400',
      icon: <Crown className="w-3 h-3" />,
    },
    PRATA: {
      bg: 'bg-gradient-to-r from-slate-400/15 to-gray-400/15 border-slate-400/40',
      text: 'text-slate-300',
      icon: <Trophy className="w-3 h-3" />,
    },
    BRONZE: {
      bg: 'bg-gradient-to-r from-orange-500/15 to-amber-700/15 border-orange-400/40',
      text: 'text-orange-400',
      icon: <Award className="w-3 h-3" />,
    },
  }

  const style = config[nivel] || config.BRONZE

  return (
    <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} backdrop-blur-sm`}>
      {style.icon}
      <span>{nivel}</span>
    </div>
  )
}

const RankingListItem: React.FC<Props> = ({ user, metric, isCurrentUser = false }) => {
  const { posicao, nome, avatarUrl, nivel, optica } = user

  const valor = metric === 'moedinhas' ? user.rankingMoedinhas ?? 0 : user.rankingPontosReais ?? 0;
  const valorFormatado = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: metric === 'pontos' ? 2 : 0,
    maximumFractionDigits: metric === 'pontos' ? 2 : 0,
  });
  const labelMetrica = metric === 'moedinhas' ? 'Moedinhas' : 'Pontos (R$)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      whileHover={{ scale: 1.01, x: 4 }}
      className={`
        relative glass rounded-xl p-4 border
        hover:shadow-glass-lg transition-all duration-300
        flex items-center gap-4 group overflow-hidden
        ${
          isCurrentUser
            ? 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/40 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]'
            : 'border-border/30 hover:border-primary/20'
        }
      `}
    >
      {/* Background Gradient Overlay */}
      {isCurrentUser && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 -z-10" />
      )}

      {/* Animated Indicator for Current User */}
      {isCurrentUser && (
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-primary rounded-r-full"
        />
      )}

      {/* Position Badge */}
      <div
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-xl font-bold text-lg
          ${
            isCurrentUser
              ? 'bg-primary/20 text-primary border-2 border-primary/30'
              : 'bg-muted/50 text-muted-foreground border border-border/50'
          }
          font-mono shadow-sm transition-colors
        `}
      >
        #{posicao}
      </div>

      {/* Avatar with Ring */}
      <div
        className={`
          relative flex-shrink-0
          w-14 h-14 rounded-full overflow-hidden
          border-2 shadow-lg
          ${
            isCurrentUser
              ? 'border-primary/50 ring-2 ring-primary/20'
              : 'border-border/30 group-hover:border-primary/30'
          }
        `}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt={nome} width={56} height={56} className="object-cover w-full h-full" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary/60">{nome.charAt(0).toUpperCase()}</span>
          </div>
        )}

        {/* Icon Badge for Current User */}
        {isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary border-2 border-background">
            <TrendingUp className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`font-bold truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>{nome}</h4>
          {isCurrentUser && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase">Você</span>
          )}
        </div>

        {optica?.nome && (
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            {optica.nome}
          </p>
        )}
      </div>

      {/* Right Section: Level + Points */}
      <div className="flex items-center gap-4">
        {/* Level Badge */}
        {nivel && <NivelBadge nivel={nivel} />}

        {/* Valor da Métrica */}
        <div className="flex items-center gap-2 min-w-[120px]">
            <Star className={`h-5 w-5 ${metric === 'moedinhas' ? 'text-amber-400' : 'text-green-400'}`} />
            <div className="flex flex-col items-start">
                <span className="text-lg font-bold text-foreground leading-none">
                    {valorFormatado}
                </span>
                <span className="text-xs text-muted-foreground">
                    {labelMetrica}
                </span>
            </div>
        </div>
      </div>

      {/* Hover Glow Effect */}
      <div
        className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10
          ${isCurrentUser ? 'bg-primary/5' : 'bg-primary/3'}
        `}
      />
    </motion.div>
  )
}

export default RankingListItem
