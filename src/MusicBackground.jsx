import { useEffect, useRef } from 'react'

const GLYPHS = ['\u2669', '\u266a', '\u266b', '\u266c']
const COLORS = ['rgba(167, 139, 250,', 'rgba(251, 191, 36,', 'rgba(26, 26, 46,']
const BAR_DIVISOR = 7

function barPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function spawnNote(canvas) {
  return {
    x: Math.random() * canvas.clientWidth,
    y: canvas.clientHeight + 40,
    size: 6 + Math.random() * 12,
    vy: 0.3 + Math.random() * 0.7,
    vx: (Math.random() - 0.5) * 0.4,
    sway: Math.random() * 0.02,
    swayPhase: Math.random() * Math.PI * 2,
    rotation: (Math.random() - 0.5) * 0.8,
    opacity: 0.65 + Math.random() * 0.35,
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

function spawnBurst(canvas, notes, cx, cy, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.6 + Math.random() * 1.6
    notes.push({
      x: cx,
      y: cy,
      size: 5 + Math.random() * 10,
      vy: Math.sin(angle) * speed - 0.8,
      vx: Math.cos(angle) * speed,
      sway: Math.random() * 0.03,
      swayPhase: Math.random() * Math.PI * 2,
      rotation: (Math.random() - 0.5) * 1.2,
      opacity: 0.8 + Math.random() * 0.2,
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1,
    })
  }
}

export default function MusicBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let notes = []
    let ripples = []
    let barCount = Math.max(24, Math.floor(window.innerWidth / BAR_DIVISOR))
    let bars = Array.from({ length: barCount }, () => 0)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const next = Math.max(24, Math.floor(canvas.clientWidth / BAR_DIVISOR))
      if (next !== barCount) {
        barCount = next
        bars = Array.from({ length: barCount }, () => 0)
      }
    }

    const tick = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      if (notes.length < 46 && Math.random() < 0.12) notes.push(spawnNote(canvas))

      for (let i = notes.length - 1; i >= 0; i -= 1) {
        const n = notes[i]
        n.x += n.vx + Math.sin(n.swayPhase) * n.sway
        n.y -= n.vy
        n.swayPhase += 0.03
        n.rotation += 0.004
        if (n.life !== undefined) n.life -= 0.012

        if (n.y < -60 || (n.life !== undefined && n.life <= 0)) {
          notes.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.translate(n.x, n.y)
        ctx.rotate(n.rotation)
        ctx.font = `${n.size}px "Segoe UI Symbol", serif`
        ctx.fillStyle = `${n.color} ${(n.life ?? 1) * n.opacity})`
        ctx.fillText(n.glyph, 0, 0)
        ctx.restore()
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i]
        r.radius += r.speed
        r.life -= 0.025
        if (r.life <= 0) {
          ripples.splice(i, 1)
          continue
        }
        ctx.beginPath()
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(167, 139, 250, ${r.life * 0.2})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      const barW = w / barCount
      const t = performance.now() / 1000
      const mid = (barCount - 1) / 2
      const NEON = [
        [196, 181, 253],
        [56, 224, 255],
        [255, 99, 213],
        [251, 191, 36],
      ]
      for (let i = 0; i < barCount; i += 1) {
        const d = Math.abs(i - mid)
        const edge = Math.pow(Math.max(0, 1 - d / mid), 0.8)
        const n =
          0.6 * Math.sin(d * 0.42 - t * 1.1) +
          0.3 * Math.sin(d * 0.9 + t * 2.2) +
          0.1 * Math.sin(d * 2.3 - t * 3.3)
        const target = (n * 0.5 + 0.5) * (0.3 + 0.7 * edge)
        bars[i] += (target - bars[i]) * 0.2
        const wave = bars[i]
        const bh = 4 + wave * 60
        const [r, g, bl] = NEON[i % NEON.length]
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, 0.2)`
        barPath(ctx, i * barW, h - bh, barW, bh, barW / 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    const onPointerDown = (e) => {
      ripples.push({ x: e.clientX, y: e.clientY, radius: 4, speed: 3.4, life: 1 })
      spawnBurst(canvas, notes, e.clientX, e.clientY)
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reduced) {
      window.addEventListener('pointerdown', onPointerDown)
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return <canvas ref={canvasRef} className="canvas-bg" aria-hidden="true" />
}
