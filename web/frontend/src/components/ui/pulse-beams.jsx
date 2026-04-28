import React from 'react'
import { motion } from 'framer-motion'

export function PulseBeams({
  children,
  className = '',
  background,
  beams = [],
  width = 858,
  height = 434,
  baseColor = 'rgba(255,255,255,0.06)',
  accentColor = 'rgba(255,255,255,0.14)',
  gradientColors = { start: '#00D4FF', middle: '#9D6FFF', end: '#CCFF00' },
}) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {background}
      <div className="relative z-10">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <BeamsSVG
          beams={beams}
          width={width}
          height={height}
          baseColor={baseColor}
          accentColor={accentColor}
          gradientColors={gradientColors}
        />
      </div>
    </div>
  )
}

function BeamsSVG({ beams, width, height, baseColor, accentColor, gradientColors }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto' }}
    >
      {beams.map((beam, i) => (
        <React.Fragment key={i}>
          <path d={beam.path} stroke={baseColor} strokeWidth="1" />
          <path d={beam.path} stroke={`url(#pbg${i})`} strokeWidth="2" strokeLinecap="round" />
          {beam.connectionPoints?.map((pt, j) => (
            <circle
              key={j}
              cx={pt.cx}
              cy={pt.cy}
              r={pt.r}
              fill={baseColor}
              stroke={accentColor}
              strokeWidth="1.5"
            />
          ))}
        </React.Fragment>
      ))}
      <defs>
        {beams.map((beam, i) => (
          <motion.linearGradient
            key={i}
            id={`pbg${i}`}
            gradientUnits="userSpaceOnUse"
            initial={beam.gradientConfig.initial}
            animate={beam.gradientConfig.animate}
            transition={beam.gradientConfig.transition}
          >
            <stop offset="0%"   stopColor={gradientColors.start}  stopOpacity="0" />
            <stop offset="20%"  stopColor={gradientColors.start}  stopOpacity="1" />
            <stop offset="50%"  stopColor={gradientColors.middle} stopOpacity="1" />
            <stop offset="100%" stopColor={gradientColors.end}    stopOpacity="0" />
          </motion.linearGradient>
        ))}
      </defs>
    </svg>
  )
}

export default PulseBeams
