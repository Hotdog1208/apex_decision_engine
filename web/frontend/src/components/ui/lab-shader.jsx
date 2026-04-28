import { useEffect, useRef } from 'react'

const FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
in vec2 v_uv;
uniform vec3  iResolution;
uniform float iTime;
uniform int   iFrame;
uniform vec4  iMouse;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2  r  = iResolution.xy;
  float t  = iTime;
  vec3  FC = vec3(fragCoord, t);
  vec4  o  = vec4(0.0);
  vec3 s = normalize(FC.rgb * 2.1 - r.xyy), p, c = s;
  c /= max(1e-4, abs(c.y));
  c.z -= t;
  float z = 0.0, d = 1.0;
  for (float i = 0.0; i < 30.0; i++) {
    p = s * z;
    p.z -= t;
    float py = p.y;
    d = ++py;
    p.y = abs(mod(d - 2.0, 4.0) - 2.0);
    p += 0.03 * sin(c / 0.04) * abs(p.y - d);
    float dxz = abs(length(cos(p.xz)) - 0.4);
    float dy  = abs(cos(p.y + z));
    float stepLen = 0.6 * dxz + 0.1 * dy;
    z += stepLen;
    d  = max(stepLen, 1e-4);
    o.rgb += (1.1 - sin(p)) / d;
  }
  o = tanh(o / 400.0);
  fragColor = vec4(o.rgb, 1.0);
}

void main() { mainImage(fragColor, gl_FragCoord.xy); }
`

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`

function mkShader(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function mkProgram(gl, vs, fs) {
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog))
    gl.deleteProgram(prog)
    return null
  }
  return prog
}

export default function LabShader({ className = '', style = {} }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false })
    if (!gl) return

    let disposed = false
    let raf = null
    const mouse = { x: 0, y: 0, l: 0 }

    const vao = gl.createVertexArray()
    const vbo = gl.createBuffer()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const vs = mkShader(gl, gl.VERTEX_SHADER, VERT)
    const fs = mkShader(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const program = mkProgram(gl, vs, fs)
    if (!program) return

    const uRes   = gl.getUniformLocation(program, 'iResolution')
    const uTime  = gl.getUniformLocation(program, 'iTime')
    const uFrame = gl.getUniformLocation(program, 'iFrame')
    const uMouse = gl.getUniformLocation(program, 'iMouse')

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = rect.height - (e.clientY - rect.top)
    }
    const onDown = (e) => { if (e.button === 0) mouse.l = 1 }
    const onUp   = (e) => { if (e.button === 0) mouse.l = 0 }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mousedown', onDown)
    canvas.addEventListener('mouseup', onUp)

    const applySize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    const ro = new ResizeObserver(applySize)
    ro.observe(canvas)
    applySize()

    let start = performance.now()
    let frame = 0

    const tick = (now) => {
      if (disposed) return
      const t = (now - start) / 1000
      frame++
      applySize()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      gl.useProgram(program)
      uRes   && gl.uniform3f(uRes, canvas.width, canvas.height, dpr)
      uTime  && gl.uniform1f(uTime, t)
      uFrame && gl.uniform1i(uFrame, frame)
      uMouse && gl.uniform4f(uMouse, mouse.x, mouse.y, mouse.l, 0)
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mousedown', onDown)
      canvas.removeEventListener('mouseup', onUp)
      try { ro.disconnect() } catch {}
      try { gl.deleteProgram(program) } catch {}
      try { gl.deleteShader(vs) } catch {}
      try { gl.deleteShader(fs) } catch {}
      try { gl.deleteBuffer(vbo) } catch {}
      try { gl.deleteVertexArray(vao) } catch {}
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    />
  )
}
