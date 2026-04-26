import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { useAspect, useTexture } from '@react-three/drei'
import { useMemo, useRef, useState, useEffect, Component } from 'react'
import * as THREE from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { Link } from 'react-router-dom'
import { Zap, ChevronRight, ArrowRight, Activity, TrendingUp, Shield } from 'lucide-react'

import {
  abs, blendScreen, float, mod, mx_cell_noise_float, oneMinus,
  smoothstep, texture, uniform, uv, vec2, vec3, pass, mix, add,
} from 'three/tsl'

const TEXTUREMAP = { src: 'https://i.postimg.cc/XYwvXN8D/img-4.png' }
const DEPTHMAP   = { src: 'https://i.postimg.cc/2SHKQh2q/raw-4.webp' }

extend(THREE)

// ─── Financial matrix rain canvas ────────────────────────────────────────────
function FinancialMatrix() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    // Character pools
    const NUMS    = '0123456789'
    const SYMS    = '$%↑↓+-·×.'
    const ALPHA   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const FULL    = NUMS + NUMS + NUMS + SYMS + SYMS + ALPHA  // weight numbers heavily

    const FONT_SZ = 12
    const COL_W   = 14
    let cols, drops, speeds, colorMode

    const init = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      cols      = Math.floor(canvas.width / COL_W) + 1
      drops     = Array.from({ length: cols }, () => Math.random() * -(canvas.height / FONT_SZ))
      speeds    = Array.from({ length: cols }, () => 0.18 + Math.random() * 0.55)
      colorMode = Array.from({ length: cols }, () => Math.random() > 0.28 ? 'lime' : 'cyan')
      ctx.fillStyle = 'rgba(3,5,8,1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    init()
    window.addEventListener('resize', init)

    const rndChar = () => FULL[Math.floor(Math.random() * FULL.length)]

    const draw = () => {
      ctx.fillStyle = 'rgba(3,5,8,0.055)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${FONT_SZ}px "Share Tech Mono",monospace`
      ctx.textAlign = 'center'

      for (let i = 0; i < cols; i++) {
        const x = i * COL_W + COL_W / 2
        const y = Math.floor(drops[i]) * FONT_SZ

        const isLime = colorMode[i] === 'lime'
        const head   = isLime ? 'rgba(204,255,0,0.90)' : 'rgba(0,212,255,0.85)'
        const neck   = isLime ? 'rgba(140,190,0,0.50)' : 'rgba(0,140,200,0.45)'
        const tail   = isLime ? 'rgba(60,90,0,0.28)'   : 'rgba(0,60,90,0.25)'

        ctx.fillStyle = head ; ctx.fillText(rndChar(), x, y)
        ctx.fillStyle = neck ; ctx.fillText(rndChar(), x, y - FONT_SZ)
        ctx.fillStyle = tail ; ctx.fillText(rndChar(), x, y - FONT_SZ * 2)

        drops[i] += speeds[i]
        if (drops[i] * FONT_SZ > canvas.height && Math.random() > 0.972) {
          drops[i] = Math.random() * -50
          // occasionally flip colour
          if (Math.random() > 0.85) colorMode[i] = colorMode[i] === 'lime' ? 'cyan' : 'lime'
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', init)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        zIndex: 3,
        mixBlendMode: 'screen',
        opacity: 0.28,
        pointerEvents: 'none',
      }}
    />
  )
}

// ─── WebGPU post-processing (scan line + bloom) ───────────────────────────────
function PostProcessing({ strength = 1, threshold = 1 }) {
  const { gl, scene, camera } = useThree()
  const progressRef = useRef({ value: 0 })
  const deadRef = useRef(false)

  const render = useMemo(() => {
    try {
      const pp = new THREE.PostProcessing(gl)
      const scenePass = pass(scene, camera)
      const color = scenePass.getTextureNode('output')
      const bloomPass = bloom(color, strength, 0.5, threshold)

      const uScan = uniform(0)
      progressRef.current = uScan

      const scanLine   = smoothstep(0, float(0.05), abs(uv().y.sub(float(uScan.value))))
      const redOverlay = vec3(1, 0, 0).mul(oneMinus(scanLine)).mul(0.4)
      const withScan   = mix(color, add(color, redOverlay), smoothstep(0.9, 1.0, oneMinus(scanLine)))

      pp.outputNode = withScan.add(bloomPass)
      return pp
    } catch (e) {
      console.warn('HeroFuturistic: PostProcessing setup failed —', e.message)
      deadRef.current = true
      return null
    }
  }, [camera, gl, scene, strength, threshold])

  useFrame(({ clock }) => {
    if (deadRef.current || !render) return
    try {
      progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
      render.renderAsync()
    } catch (e) {
      console.warn('HeroFuturistic: renderAsync failed —', e.message)
      deadRef.current = true
    }
  }, 1)

  return null
}

// ─── 3-D depth-map parallax scene ────────────────────────────────────────────
const W = 300, H = 300

function Scene() {
  const [rawMap, depthMap] = useTexture([TEXTUREMAP.src, DEPTHMAP.src])
  const meshRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => { if (rawMap && depthMap) setVisible(true) }, [rawMap, depthMap])

  const { material, uniforms } = useMemo(() => {
    const uPointer  = uniform(new THREE.Vector2(0))
    const uProgress = uniform(0)
    const tDepth = texture(depthMap)
    const tMap   = texture(rawMap, uv().add(tDepth.r.mul(uPointer).mul(0.01)))

    const aspect  = float(W).div(H)
    const tUv     = vec2(uv().x.mul(aspect), uv().y)
    const tiling  = vec2(120.0)
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0)
    const bright  = mx_cell_noise_float(tUv.mul(tiling).div(2))
    const dot     = float(smoothstep(0.5, 0.49, float(tiledUv.length()))).mul(bright)
    const flow    = oneMinus(smoothstep(0, 0.02, abs(tDepth.sub(uProgress))))
    const mask    = dot.mul(flow).mul(vec3(10, 0, 0))

    const mat = new THREE.MeshBasicNodeMaterial({
      colorNode: blendScreen(tMap, mask),
      transparent: true,
      opacity: 0,
    })
    return { material: mat, uniforms: { uPointer, uProgress } }
  }, [rawMap, depthMap])

  const [w, h] = useAspect(W, H)

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    if (meshRef.current?.material && 'opacity' in meshRef.current.material) {
      meshRef.current.material.opacity = THREE.MathUtils.lerp(
        meshRef.current.material.opacity, visible ? 1 : 0, 0.07
      )
    }
  })
  useFrame(({ pointer }) => { uniforms.uPointer.value = pointer })

  return (
    <mesh ref={meshRef} scale={[w * 0.4, h * 0.4, 1]} material={material}>
      <planeGeometry />
    </mesh>
  )
}

function HeroCanvas() {
  const [adapterReady, setAdapterReady] = useState(false)

  useEffect(() => {
    // requestAdapter() returns null when WebGPU exists in the browser but is
    // actually unavailable (GPU blocklist, driver failure, etc.). Only mount
    // the Canvas when we have a confirmed usable adapter.
    navigator.gpu?.requestAdapter()
      .then(a => { if (a) setAdapterReady(true) })
      .catch(() => {})
  }, [])

  if (!adapterReady) return null

  return (
    <Canvas
      flat
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
      gl={async (props) => {
        const r = new THREE.WebGPURenderer(props)
        if (typeof r.init === 'function') await r.init()
        return r
      }}
    >
      <PostProcessing />
      <Scene />
    </Canvas>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const MONO = { fontFamily: 'var(--font-data)', textTransform: 'uppercase', letterSpacing: '0.14em' }

function PulseDot({ color = 'var(--color-profit)', size = 5 }) {
  return (
    <span className="animate-pulse" style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: color, boxShadow: `0 0 7px ${color}`, flexShrink: 0,
    }} />
  )
}

// ─── Vignette ─────────────────────────────────────────────────────────────────
function Vignette() {
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 75% 70% at 48% 50%, transparent 20%, rgba(3,5,8,0.55) 65%, rgba(3,5,8,0.92) 100%)',
      }}
    />
  )
}

// ─── Top accent line ──────────────────────────────────────────────────────────
function TopAccent({ visible }) {
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1, zIndex: 22,
        background: 'linear-gradient(90deg, transparent 0%, rgba(204,255,0,0.6) 30%, rgba(0,212,255,0.8) 60%, transparent 100%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 1s ease 0.3s',
      }}
    />
  )
}

// ─── HUD corner brackets ─────────────────────────────────────────────────────
function HudBrackets({ visible }) {
  const b = (pos, borders) => ({
    position: 'absolute', width: 24, height: 24,
    pointerEvents: 'none', zIndex: 20,
    opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease',
    ...pos, ...borders,
  })
  const L = 'rgba(204,255,0,0.55)', C = 'rgba(0,212,255,0.40)'
  return (
    <>
      <div style={b({ top: 12, left: 12 },   { borderTop: `1px solid ${L}`, borderLeft:  `1px solid ${L}` })} />
      <div style={b({ top: 12, right: 12 },  { borderTop: `1px solid ${C}`, borderRight: `1px solid ${C}` })} />
      <div style={b({ bottom: 12, left: 12 },{ borderBottom: `1px solid ${C}`, borderLeft: `1px solid ${C}` })} />
      <div style={b({ bottom: 12, right: 12},{ borderBottom: `1px solid ${L}`, borderRight:`1px solid ${L}` })} />
    </>
  )
}

// ─── Top bar ─────────────────────────────────────────────────────────────────
function TopBar({ visible }) {
  const [time, setTime] = useState('--:--:--')
  const [mkt, setMkt]   = useState('...')

  useEffect(() => {
    const tick = () => {
      const est  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const hh   = String(est.getHours()).padStart(2, '0')
      const mm   = String(est.getMinutes()).padStart(2, '0')
      const ss   = String(est.getSeconds()).padStart(2, '0')
      setTime(`${hh}:${mm}:${ss}`)
      const m = est.getHours() * 60 + est.getMinutes()
      setMkt(m >= 570 && m < 960 ? 'MARKET OPEN' : m >= 240 && m < 570 ? 'PRE-MARKET' : 'AFTER HOURS')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const mktColor = mkt === 'MARKET OPEN' ? 'var(--color-profit)' : 'var(--color-warning)'

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 lg:px-8"
      style={{
        zIndex: 15, height: 56,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(to bottom, rgba(3,5,8,0.80) 0%, transparent 100%)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ ...MONO, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 900, color: 'var(--accent-primary)', letterSpacing: '0.22em' }}>
          APEX
        </span>
        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.12)' }} />
        <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.16em' }}>Decision Engine</span>
        <div className="hidden sm:flex items-center gap-1.5" style={{ ...MONO, fontSize: 7, color: 'var(--color-profit)', border: '1px solid rgba(0,232,121,0.22)', padding: '2px 7px', marginLeft: 4 }}>
          <PulseDot size={4} /> ONLINE
        </div>
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="hidden md:flex flex-col items-end leading-none gap-0.5">
          <span style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.20)' }}>EST</span>
          <span style={{ ...MONO, fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFeatureSettings: '"tnum"', letterSpacing: '0.06em' }}>{time}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ ...MONO, fontSize: 7, color: mktColor, border: `1px solid ${mktColor}33`, padding: '3px 9px' }}>
          <PulseDot color={mktColor} size={4} /> {mkt}
        </div>
        <div className="hidden lg:flex flex-col items-end gap-0.5">
          <span style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.18)' }}>Engine</span>
          <span style={{ ...MONO, fontSize: 7, color: 'rgba(157,111,255,0.65)' }}>Multi-Layer AI · v2</span>
        </div>
      </div>
    </div>
  )
}

// ─── Left rail ────────────────────────────────────────────────────────────────
function LeftRail({ visible }) {
  return (
    <div
      className="absolute top-0 bottom-0 left-0 hidden lg:flex flex-col items-center justify-center"
      style={{ width: 36, borderRight: '1px solid rgba(255,255,255,0.04)', zIndex: 15, pointerEvents: 'none', opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.2s' }}
    >
      {[0.2, 0.38, 0.62, 0.80].map(p => (
        <div key={p} style={{ position: 'absolute', top: `${p * 100}%`, right: 0, width: 5, height: 1, background: 'rgba(255,255,255,0.10)' }} />
      ))}
      <span style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.13)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', letterSpacing: '0.26em' }}>
        Signal · Intelligence · Platform
      </span>
    </div>
  )
}

// ─── Left stat column (new — counterbalances right signal panel) ──────────────
const LEFT_STATS = [
  { icon: TrendingUp, label: 'Signal Layers',  val: '5',    color: 'var(--accent-primary)' },
  { icon: Activity,   label: 'Verdict Window', val: '1–3d', color: 'var(--accent-cyan)'    },
  { icon: Shield,     label: 'Asset Classes',  val: '3',    color: 'rgba(255,255,255,0.55)' },
]

function LeftPanel({ visible }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { if (visible) setTimeout(() => setLoaded(true), 100) }, [visible])

  return (
    <div
      className="absolute left-10 xl:left-14 top-1/2 hidden xl:flex flex-col gap-3"
      style={{
        zIndex: 15, pointerEvents: 'none',
        transform: `translateY(-50%) translateX(${loaded ? 0 : -20}px)`,
        opacity: loaded ? 1 : 0,
        transition: 'all 0.65s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.22)', marginBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 6 }}>
        At a glance
      </div>
      {LEFT_STATS.map(({ icon: Icon, label, val, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={11} style={{ color }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
            <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', marginTop: 2 }}>{label}</div>
          </div>
        </div>
      ))}
      {/* Thin vertical accent */}
      <div style={{ position: 'absolute', left: -12, top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(204,255,0,0.25) 50%, transparent)' }} />
    </div>
  )
}

// ─── Right signal panel ───────────────────────────────────────────────────────
const SIGNALS = [
  { sym: 'NVDA', verdict: 'STRONG BUY', conf: 84, color: '#00E879', note: 'UOA ↑ · RSI 62 · Vol 2.8×' },
  { sym: 'META', verdict: 'BUY',        conf: 71, color: '#52F7A2', note: 'Breakout · sentiment ↑'    },
  { sym: 'AAPL', verdict: 'WATCH',      conf: 51, color: '#FFB800', note: 'Consolidating near 52w hi'  },
]

function RightPanel({ visible }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { if (visible) setTimeout(() => setLoaded(true), 120) }, [visible])

  return (
    <div
      className="absolute right-6 xl:right-10 top-1/2 hidden xl:block"
      style={{
        zIndex: 15, width: 215, pointerEvents: 'none',
        transform: `translateY(-50%) translateX(${loaded ? 0 : 26}px)`,
        opacity: loaded ? 1 : 0,
        transition: 'all 0.65s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-1.5">
          <Activity size={9} style={{ color: 'rgba(255,255,255,0.32)' }} />
          <span style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.28)' }}>Live Signals</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ ...MONO, fontSize: 7, color: 'var(--color-profit)' }}>
          <PulseDot size={4} /> LIVE
        </div>
      </div>

      <div className="space-y-1.5">
        {SIGNALS.map(({ sym, verdict, conf, color, note }) => (
          <div key={sym} style={{ background: 'rgba(0,0,0,0.50)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `2px solid ${color}`, padding: '7px 9px' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 900, color: '#fff' }}>{sym}</span>
                <span style={{ ...MONO, fontSize: 6, color, border: `1px solid ${color}44`, padding: '1px 4px' }}>{verdict}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color }}>{conf}%</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 5 }}>
              <div style={{ height: '100%', width: `${conf}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }} />
            </div>
            <span style={{ ...MONO, fontSize: 6, color: 'rgba(255,255,255,0.27)', letterSpacing: '0.10em' }}>{note}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ ...MONO, fontSize: 6, color: 'rgba(255,255,255,0.18)' }}>Demo signals · not financial advice</div>
      </div>
    </div>
  )
}

// ─── Center headline ──────────────────────────────────────────────────────────
function CenterContent({ phase }) {
  const WORDS = ['THE', 'EDGE', 'IS', 'YOURS']
  const [visibleWords, setVisibleWords] = useState(0)

  useEffect(() => {
    if (phase < 1 || visibleWords >= WORDS.length) return
    const t = setTimeout(() => setVisibleWords(v => v + 1), 420)
    return () => clearTimeout(t)
  }, [phase, visibleWords])

  return (
    <div
      className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Dark halo behind text for readability against matrix */}
      <div style={{
        position: 'absolute', width: '55vw', height: '55vh', minWidth: 380,
        background: 'radial-gradient(ellipse, rgba(3,5,8,0.72) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: -1,
      }} />

      {/* Category label */}
      <div
        className="flex items-center gap-2 mb-5"
        style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        <div style={{ width: 28, height: 1, background: 'var(--accent-cyan)', opacity: 0.6 }} />
        <span style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--accent-cyan)', letterSpacing: '0.22em' }}>
          Signal Engine v2.0
        </span>
        <div style={{ width: 28, height: 1, background: 'var(--accent-cyan)', opacity: 0.6 }} />
      </div>

      {/* Title */}
      <div
        className="flex flex-wrap justify-center gap-x-4"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem,6.2vw,6rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}
      >
        {WORDS.map((w, i) => (
          <span
            key={i}
            className={i < visibleWords ? 'hero-word-in' : ''}
            style={{
              opacity: i < visibleWords ? 1 : 0,
              color: w === 'YOURS' ? 'var(--accent-primary)' : '#fff',
              textShadow: w === 'YOURS'
                ? '0 0 50px rgba(204,255,0,0.4), 0 0 100px rgba(204,255,0,0.15)'
                : '0 2px 30px rgba(0,0,0,0.8)',
            }}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Subtitle */}
      <p
        style={{
          ...MONO, fontFamily: 'var(--font-data)',
          fontSize: 'clamp(0.58rem,1.25vw,0.82rem)',
          color: 'rgba(255,255,255,0.40)',
          marginTop: 18, textAlign: 'center',
          maxWidth: 480,
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.8s ease',
          textShadow: '0 1px 12px rgba(0,0,0,0.9)',
        }}
      >
        Technical indicators · Options flow · Volume · News — fused by a stack of AI models
        into one decisive verdict.
      </p>

      {/* Stat pills */}
      <div
        className="flex flex-wrap justify-center mt-7 gap-px"
        style={{ opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        {[
          { val: '5',    label: 'Signal Layers', color: 'var(--accent-primary)',       bg: 'rgba(204,255,0,0.06)'  },
          { val: '84%',  label: 'Backtest Acc',  color: 'var(--color-profit)',         bg: 'rgba(0,232,121,0.06)' },
          { val: '3',    label: 'Asset Classes', color: 'var(--accent-cyan)',          bg: 'rgba(0,212,255,0.06)' },
          { val: '1–3d', label: 'Horizon',       color: 'rgba(255,255,255,0.55)',      bg: 'transparent'          },
        ].map(({ val, label, color, bg }) => (
          <div key={label} style={{ padding: '10px 18px', background: bg, border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', minWidth: 68 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
            <div style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.26)', marginTop: 3, letterSpacing: '0.11em' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bottom CTA bar ───────────────────────────────────────────────────────────
function BottomBar({ visible }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex flex-col items-center"
      style={{
        zIndex: 15, paddingBottom: 34,
        opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease',
        pointerEvents: visible ? 'auto' : 'none',
        background: 'linear-gradient(to top, rgba(3,5,8,0.82) 0%, transparent 100%)',
      }}
    >
      {/* Feature tags */}
      <div className="flex items-center flex-wrap justify-center gap-x-3 gap-y-1 mb-6" style={{ paddingTop: 32 }}>
        {[
          { text: 'Stocks',         color: 'rgba(255,255,255,0.36)' },
          { text: 'Options Flow',   color: 'var(--accent-cyan)',    dot: true },
          { text: 'Futures',        color: 'rgba(255,255,255,0.36)' },
          { text: 'AI Synthesis',   color: 'var(--accent-violet)',  dot: true },
          { text: 'News Sentiment', color: 'rgba(255,255,255,0.36)' },
          { text: 'Daily Verdicts', color: 'var(--accent-primary)', dot: true },
        ].map(({ text, color, dot }, i) => (
          <div key={text} className="flex items-center gap-2" style={{ ...MONO, fontSize: 7, color }}>
            {i > 0 && <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>}
            {dot && <span style={{ width: 3, height: 3, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />}
            {text}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 hover:bg-white transition-colors"
          style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700, background: 'var(--accent-primary)', color: '#000', padding: '13px 28px', cursor: 'none' }}
        >
          <Zap size={12} /> Open Terminal <ChevronRight size={11} />
        </Link>
        <Link
          to="/track-record"
          className="inline-flex items-center gap-2 transition-colors hover:border-white/40"
          style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.16)', padding: '13px 24px', cursor: 'none' }}
        >
          Track Record <ArrowRight size={11} />
        </Link>
      </div>

      <p style={{ ...MONO, fontSize: 7, color: 'rgba(255,255,255,0.17)', marginTop: 12, textAlign: 'center' }}>
        Analysis only · Not financial advice · Past performance is not indicative of future results
      </p>
    </div>
  )
}

// ─── Master overlay ───────────────────────────────────────────────────────────
function HeroOverlay() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 2750),
      setTimeout(() => setPhase(4), 3250),
      setTimeout(() => setPhase(5), 4200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <>
      <HudBrackets  visible={phase >= 1} />
      <TopAccent    visible={phase >= 1} />
      <TopBar       visible={phase >= 1} />
      <LeftRail     visible={phase >= 1} />
      <LeftPanel    visible={phase >= 5} />
      <CenterContent phase={phase} />
      <RightPanel   visible={phase >= 5} />
      <BottomBar    visible={phase >= 4} />
    </>
  )
}

// ─── Fallback (non-WebGPU) ────────────────────────────────────────────────────
function HeroFallback() {
  return (
    <div className="relative flex flex-col overflow-hidden border-b" style={{ height: '100svh', background: 'var(--bg-void)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="absolute inset-0 terminal-grid opacity-25 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(204,255,0,0.06) 0%, transparent 70%)' }} />
      <FinancialMatrix />
      <Vignette />
      <HudBrackets visible />
      <TopAccent visible />
      <TopBar visible />
      <LeftRail visible />
      <div className="flex-1 flex flex-col justify-center items-center px-8 text-center" style={{ zIndex: 10 }}>
        <div style={{ position: 'absolute', width: '55vw', height: '55vh', background: 'radial-gradient(ellipse, rgba(3,5,8,0.8) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="flex items-center gap-2 mb-5" style={{ position: 'relative' }}>
          <div style={{ width: 28, height: 1, background: 'var(--accent-cyan)', opacity: 0.6 }} />
          <span style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 8, color: 'var(--accent-cyan)', letterSpacing: '0.22em' }}>Signal Engine v2.0</span>
          <div style={{ width: 28, height: 1, background: 'var(--accent-cyan)', opacity: 0.6 }} />
        </div>
        <h1 className="font-display font-black tracking-tighter leading-none mb-5" style={{ fontSize: 'clamp(3rem,8vw,6.5rem)', position: 'relative' }}>
          <span style={{ color: '#fff', textShadow: '0 2px 30px rgba(0,0,0,0.8)' }}>THE EDGE</span><br />
          <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 50px rgba(204,255,0,0.4)' }}>IS YOURS</span>
        </h1>
        <p style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 'clamp(0.58rem,1.25vw,0.82rem)', color: 'rgba(255,255,255,0.40)', marginBottom: 32, maxWidth: 460, position: 'relative' }}>
          Technical indicators · Options flow · Volume · News — fused by a stack of AI models into one decisive verdict.
        </p>
        <div className="flex items-center gap-3 justify-center flex-wrap" style={{ position: 'relative' }}>
          <Link to="/dashboard" className="inline-flex items-center gap-2 hover:bg-white transition-colors" style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 10, fontWeight: 700, background: 'var(--accent-primary)', color: '#000', padding: '13px 28px', cursor: 'none' }}>
            <Zap size={12} /> Open Terminal <ChevronRight size={11} />
          </Link>
          <Link to="/track-record" className="inline-flex items-center gap-2" style={{ ...MONO, fontFamily: 'var(--font-data)', fontSize: 10, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.16)', padding: '13px 24px', cursor: 'none' }}>
            Track Record <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Error boundary ───────────────────────────────────────────────────────────
class HeroErrorBoundary extends Component {
  state = { crashed: false }
  static getDerivedStateFromError() { return { crashed: true } }
  componentDidCatch(e) { console.warn('HeroFuturistic: WebGPU crashed —', e.message) }
  render() { return this.state.crashed ? <HeroFallback /> : this.props.children }
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function HeroFuturistic() {
  const [gpuAvailable, setGpuAvailable] = useState(null)

  useEffect(() => {
    setGpuAvailable(typeof navigator !== 'undefined' && 'gpu' in navigator)
  }, [])

  if (gpuAvailable === null) return null
  if (!gpuAvailable) return <HeroFallback />

  return (
    <HeroErrorBoundary>
      <div className="relative border-b" style={{ height: '100svh', background: 'var(--bg-void)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* Base radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0, background: 'radial-gradient(ellipse 65% 55% at 48% 52%, rgba(204,255,0,0.055) 0%, rgba(0,212,255,0.03) 45%, transparent 70%)' }}
        />

        {/* Layer order */}
        <HeroCanvas />           {/* z: 1  — WebGPU canvas  */}
        <FinancialMatrix />      {/* z: 3  — matrix rain, screen blend */}
        <Vignette />             {/* z: 4  — dark edge vignette */}
        <HeroOverlay />          {/* z: 10–20 — all HUD chrome */}
      </div>
    </HeroErrorBoundary>
  )
}
