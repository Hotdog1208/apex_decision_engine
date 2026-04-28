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
  vec2 p = FC.xy - r * 0.5;
  for (float i, a; i++ < 7.0; ) {
    a = length(p) / r.y - (i * i) / 50.0;
    float denom = max(a, -a * 4.0) + 2.0 / r.y;
    a = atan(p.y, p.x) * 3.0 + t * sin(i * i) + i * i;
    float gate = smoothstep(0.0, 0.6, cos(a));
    o += 0.02 / denom * gate * (1.0 + sin(a - i + vec4(0.0, 0.2, 0.5, 0.0)));
  }
  o = tanh(o);
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

export default function RadialShader({ className = '', style = {} }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false })
    if (!gl) return

    let disposed = false
    let raf = null

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
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
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
