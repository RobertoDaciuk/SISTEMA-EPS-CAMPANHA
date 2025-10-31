'use client'
import React from 'react'

interface Props {
  count?: number
}

const SkeletonRankingList: React.FC<Props> = ({ count = 8 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-lg p-3 animate-pulse flex items-center gap-4">
          <div className="w-8 text-center font-mono bg-muted/50 h-8 rounded" />
          <div className="w-12 h-12 rounded-full bg-muted/50" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 rounded bg-muted/50" />
            <div className="h-3 w-24 rounded bg-muted/50 mt-1" />
          </div>
          <div className="w-20 h-4 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  )
}

export default SkeletonRankingList
