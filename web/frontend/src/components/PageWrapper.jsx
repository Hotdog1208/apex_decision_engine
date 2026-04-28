import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const easing = [0.16, 1, 0.3, 1]

// A global custom cursor to enhance the "fever dream" feel
function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [isClicking, setIsClicking] = useState(false)

  useEffect(() => {
    const minMv = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e) => {
      if (e.target.tagName.toLowerCase() === 'a' ||
        e.target.tagName.toLowerCase() === 'button' ||
        e.target.closest('a') ||
        e.target.closest('button') ||
        e.target.classList.contains('cursor-pointer') ||
        window.getComputedStyle(e.target).cursor === 'pointer') {
        setIsHovering(true)
      } else {
        setIsHovering(false)
      }
    }

    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)

    window.addEventListener('mousemove', minMv)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', minMv)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden mix-blend-difference hidden md:block">
      {/* Outer Ring */}
      <motion.div
        className="absolute w-12 h-12 rounded-full border border-apex-accent flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
          scale: isClicking ? 0.8 : isHovering ? 1.5 : 1,
          borderColor: isHovering ? 'var(--accent-pink)' : 'var(--accent-cyan)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }}
      >
        {/* Crosshair lines */}
        <div className={`absolute w-full h-[1px] ${isHovering ? 'bg-apex-pink' : 'bg-apex-cyan'} opacity-50`} />
        <div className={`absolute h-full w-[1px] ${isHovering ? 'bg-apex-pink' : 'bg-apex-cyan'} opacity-50`} />
      </motion.div>

      {/* Trailing Dot */}
      <motion.div
        className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-none"
        animate={{
          x: mousePosition.x,
          y: mousePosition.y,
          scale: isClicking ? 0 : isHovering ? 0 : 1
        }}
        transition={{ type: 'spring', stiffness: 1000, damping: 40, mass: 0.1 }}
      />
    </div>
  )
}

export default function PageWrapper({ children, className = '' }) {
  return (
    <>
      <CustomCursor />
      {/* Subtle dot-grid texture across all inner pages */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -24, filter: 'blur(6px)' }}
        transition={{ duration: 0.55, ease: easing }}
        className={`relative w-full ${className}`}
        style={{ zIndex: 1 }}
      >
        {children}
      </motion.div>
    </>
  )
}
