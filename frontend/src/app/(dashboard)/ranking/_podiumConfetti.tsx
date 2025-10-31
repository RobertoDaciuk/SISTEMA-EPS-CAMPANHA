'use client'
import React from 'react'
import { motion } from 'framer-motion'

// Pequeno helper visual para confetes (opcional import na page se quiser)
export default function PodiumConfetti() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -10, scale: 0.6 }}
          animate={{ opacity: [0, 0.95, 0], y: [-10, -40, -80], scale: [0.6, 1, 0.3] }}
          transition={{ repeat: 0, duration: 1.1, delay: 0.15 + i * 0.07 }}
          className={`absolute w-2 h-2 rounded-full bg-amber-300/80`}
          style={{ left: `${8 + i * 10}%`, top: `${18 + (i % 3) * 6}%` }}
        />
      ))}
    </div>
  )
}
