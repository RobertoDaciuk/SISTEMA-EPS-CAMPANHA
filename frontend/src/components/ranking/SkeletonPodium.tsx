'use client'
import React from 'react'

/**
 * Skeleton Loader para o Pódio (Top 3)
 *
 * Layout responsivo que imita a estrutura do pódio real:
 * - Mobile: Cards empilhados verticalmente
 * - Desktop: 3 cards em linha (2º, 1º, 3º)
 */
const SkeletonPodium: React.FC = () => {
  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto items-end">
        {/* 2º Lugar - Skeleton */}
        <div className="order-2 md:order-1 md:pb-8">
          <div className="glass rounded-3xl p-6 animate-pulse border-2 border-border/30 mx-auto max-w-[280px]">
            {/* Icon Badge */}
            <div className="h-12 w-12 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Avatar */}
            <div className="w-28 h-28 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Level Badge */}
            <div className="h-6 w-24 rounded-full bg-muted/50 mx-auto mb-3" />

            {/* Name */}
            <div className="h-5 w-32 rounded bg-muted/50 mx-auto mb-2" />

            {/* Ótica */}
            <div className="h-3 w-28 rounded bg-muted/50 mx-auto mb-4" />

            {/* Points */}
            <div className="h-8 w-24 rounded bg-muted/50 mx-auto mb-2" />
            <div className="h-3 w-16 rounded bg-muted/50 mx-auto mb-4" />

            {/* Label */}
            <div className="h-4 w-20 rounded bg-muted/50 mx-auto" />
          </div>
        </div>

        {/* 1º Lugar - Skeleton (Maior) */}
        <div className="order-1 md:order-2">
          <div className="glass rounded-3xl p-8 animate-pulse border-2 border-border/30 mx-auto max-w-[300px]">
            {/* Icon Badge */}
            <div className="h-14 w-14 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Avatar */}
            <div className="w-36 h-36 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Level Badge */}
            <div className="h-6 w-28 rounded-full bg-muted/50 mx-auto mb-3" />

            {/* Name */}
            <div className="h-6 w-36 rounded bg-muted/50 mx-auto mb-2" />

            {/* Ótica */}
            <div className="h-3 w-32 rounded bg-muted/50 mx-auto mb-4" />

            {/* Points */}
            <div className="h-10 w-28 rounded bg-muted/50 mx-auto mb-2" />
            <div className="h-3 w-16 rounded bg-muted/50 mx-auto mb-4" />

            {/* Label */}
            <div className="h-4 w-24 rounded bg-muted/50 mx-auto" />
          </div>
        </div>

        {/* 3º Lugar - Skeleton */}
        <div className="order-3 md:pb-8">
          <div className="glass rounded-3xl p-6 animate-pulse border-2 border-border/30 mx-auto max-w-[280px]">
            {/* Icon Badge */}
            <div className="h-12 w-12 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Avatar */}
            <div className="w-28 h-28 rounded-full bg-muted/50 mx-auto mb-4" />

            {/* Level Badge */}
            <div className="h-6 w-24 rounded-full bg-muted/50 mx-auto mb-3" />

            {/* Name */}
            <div className="h-5 w-32 rounded bg-muted/50 mx-auto mb-2" />

            {/* Ótica */}
            <div className="h-3 w-28 rounded bg-muted/50 mx-auto mb-4" />

            {/* Points */}
            <div className="h-8 w-24 rounded bg-muted/50 mx-auto mb-2" />
            <div className="h-3 w-16 rounded bg-muted/50 mx-auto mb-4" />

            {/* Label */}
            <div className="h-4 w-20 rounded bg-muted/50 mx-auto" />
          </div>
        </div>
      </div>

      {/* Bottom Divider */}
      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}

export default SkeletonPodium
