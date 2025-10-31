'use client'

import React from 'react'
import Image from 'next/image'
import { Crown, Trophy, Award, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export interface PodiumUser {
  id: string
  nome: string
  avatarUrl?: string | null
  rankingMoedinhas?: number
  rankingPontosReais?: number
  posicao: number
  nivel?: string
  optica?: {
    nome: string
  } | null
}

interface Props {
  user: PodiumUser
  metric: 'moedinhas' | 'pontos'
  /** size variant: 'lg' for 1st, 'md' for 2nd/3rd */
  size?: 'lg' | 'md' | 'sm'
}

/**
 * Badge de Nível - Estilizado
 */
const NivelBadge: React.FC<{ nivel?: string }> = ({ nivel }) => {
  if (!nivel) return null

  const config: Record<string, any> = {
    DIAMANTE: {
      bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/30',
      text: 'text-cyan-400',
      icon: <Sparkles className="w-3 h-3" />,
    },
    OURO: {
      bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-400/30',
      text: 'text-yellow-400',
      icon: <Crown className="w-3 h-3" />,
    },
    PRATA: {
      bg: 'bg-gradient-to-r from-slate-400/20 to-gray-400/20 border-slate-400/30',
      text: 'text-slate-300',
      icon: <Trophy className="w-3 h-3" />,
    },
    BRONZE: {
      bg: 'bg-gradient-to-r from-orange-500/20 to-amber-700/20 border-orange-400/30',
      text: 'text-orange-400',
      icon: <Award className="w-3 h-3" />,
    },
  }

  const style = config[nivel] || config.BRONZE

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${style.bg} ${style.text} text-xs font-semibold backdrop-blur-sm`}
    >
      {style.icon}
      <span>{nivel}</span>
    </div>
  )
}

const PodiumCard: React.FC<Props> = ({ user, metric, size: propSize }) => {
  const { posicao, nome, avatarUrl, nivel, optica } = user

  const valor = metric === 'moedinhas' ? user.rankingMoedinhas ?? 0 : user.rankingPontosReais ?? 0;
  const valorFormatado = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: metric === 'pontos' ? 2 : 0,
    maximumFractionDigits: metric === 'pontos' ? 2 : 0,
  });
  const labelMetrica = metric === 'moedinhas' ? 'Moedinhas' : 'Pontos (R$)';

  // Configuração visual por posição
  const config = {
    1: {
      size: propSize || 'lg',
      gradient: 'from-yellow-400/30 via-amber-500/20 to-yellow-600/30',
      border: 'border-yellow-400/50',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
      ring: 'ring-4 ring-yellow-400/30',
      icon: <Crown className="w-8 h-8 text-yellow-400" />,
      label: '🏆 Campeão',
      labelColor: 'text-yellow-400 font-bold',
    },
    2: {
      size: propSize || 'md',
      gradient: 'from-slate-400/20 via-gray-300/15 to-slate-500/20',
      border: 'border-slate-400/40',
      glow: 'shadow-[0_0_30px_rgba(148,163,184,0.2)]',
      ring: 'ring-3 ring-slate-400/20',
      icon: <Trophy className="w-7 h-7 text-slate-300" />,
      label: '🥈 2º Lugar',
      labelColor: 'text-slate-300',
    },
    3: {
      size: propSize || 'md',
      gradient: 'from-orange-400/20 via-amber-600/15 to-orange-500/20',
      border: 'border-orange-400/40',
      glow: 'shadow-[0_0_30px_rgba(251,146,60,0.2)]',
      ring: 'ring-3 ring-orange-400/20',
      icon: <Award className="w-7 h-7 text-orange-300" />,
      label: '🥉 3º Lugar',
      labelColor: 'text-orange-300',
    },
  }

  const style = config[posicao as 1 | 2 | 3] || config[3]

  const sizeClasses = {
    lg: {
      card: 'p-8 min-w-[280px] max-w-[320px]',
      avatar: 'w-36 h-36',
      name: 'text-2xl',
      points: 'text-4xl',
      iconBadge: 'w-16 h-16 p-4',
      iconTop: '-top-8',
    },
    md: {
      card: 'p-6 min-w-[240px] max-w-[280px]',
      avatar: 'w-28 h-28',
      name: 'text-xl',
      points: 'text-3xl',
      iconBadge: 'w-14 h-14 p-3.5',
      iconTop: '-top-7',
    },
    sm: {
      card: 'p-5 min-w-[200px] max-w-[240px]',
      avatar: 'w-24 h-24',
      name: 'text-lg',
      points: 'text-2xl',
      iconBadge: 'w-12 h-12 p-3',
      iconTop: '-top-6',
    },
  }

  const classes = sizeClasses[style.size as 'lg' | 'md' | 'sm']

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: posicao * 0.1 }}
      className={`
        relative flex flex-col items-center
        ${classes.card} w-full
        bg-gradient-to-br from-card/40 via-card/30 to-card/50
        backdrop-blur-xl
        border ${style.border}
        rounded-3xl
        ${style.glow} ${style.ring}
        hover:scale-105 transition-transform duration-300
        pt-10
      `}
    >
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${style.gradient} opacity-50 -z-10`}
      />

      {/* Animated Sparkles for 1st place */}
      {posicao === 1 && (
        <>
          <Sparkles className="absolute top-4 left-4 w-5 h-5 text-yellow-400/40 animate-pulse" />
          <Sparkles className="absolute top-4 right-4 w-4 h-4 text-yellow-400/30 animate-pulse delay-75" />
          <Sparkles className="absolute bottom-4 left-6 w-4 h-4 text-yellow-400/30 animate-pulse delay-150" />
        </>
      )}

        {/* Icon Badge - CORRIGIDO: Background sólido para evitar transparência */}
        <div className={`absolute ${classes.iconTop} left-1/2 transform -translate-x-1/2 z-20`}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className={`
              ${classes.iconBadge}
              rounded-full
              ${style.border} border-2
              bg-card
              backdrop-blur-sm ${style.glow}
              flex items-center justify-center
              shadow-xl
            `}
          >
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.gradient} opacity-60 -z-10`} />
            {style.icon}
          </motion.div>
        </div>


      {/* Avatar with Ring */}
      <div className={`relative ${classes.avatar} mb-4`}>
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.gradient} ${style.ring} blur-sm`}
        />
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={nome}
            width={200}
            height={200}
            className={`relative ${classes.avatar} rounded-full object-cover border-4 ${style.border}`}
          />
        ) : (
          <div
            className={`
              relative ${classes.avatar} rounded-full
              bg-gradient-to-br from-primary/20 to-primary/40
              border-4 ${style.border}
              flex items-center justify-center
              text-5xl font-bold text-primary
            `}
          >
            {nome.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Level Badge */}
      <NivelBadge nivel={nivel} />

      {/* Name */}
      <h3 className={`${classes.name} font-bold text-center mt-3 text-foreground`}>
        {nome}
      </h3>

      {/* Ótica */}
      {optica?.nome && (
        <p className="text-sm text-muted-foreground text-center mt-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          {optica.nome}
        </p>
      )}

      {/* Valor da Métrica */}
      <div className="mt-4 flex flex-col items-center gap-1">
        <span className={`${classes.points} font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent`}>
          {valorFormatado}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {labelMetrica}
        </span>
      </div>

      {/* Position Label */}
      <div className={`mt-4 ${style.labelColor} text-sm font-semibold tracking-wide`}>
        {style.label}
      </div>

      {/* Bottom Glow */}
      <div
        className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r ${style.gradient} blur-xl opacity-50`}
      />
    </motion.div>
  )
}

export default PodiumCard
