"use client"

import { useEffect, useRef } from "react"

function getBadgeDataUrl(count: number): string {
  if (typeof document === "undefined") return ""
  const size = 32
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return ""

  const accent = "#cdff3e"
  const bg = "#080808"
  const textColor = "#000"

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
    } else {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
    }
  }

  // Rounded rect background (match favicon)
  ctx.fillStyle = bg
  roundRect(0, 0, size, size, 7)
  ctx.fill()

  // Envelope outline
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.8
  roundRect(4, 9, 24, 16, 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(4, 11)
  ctx.lineTo(16, 20)
  ctx.lineTo(28, 11)
  ctx.stroke()

  // Badge circle top-right
  const badgeRadius = 8
  const badgeX = size - badgeRadius - 2
  const badgeY = badgeRadius + 2
  ctx.fillStyle = "#ff5500"
  ctx.beginPath()
  ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = bg
  ctx.lineWidth = 1.5
  ctx.stroke()

  const label = count > 99 ? "99+" : String(count)
  ctx.fillStyle = textColor
  ctx.font = "bold 10px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(label, badgeX, badgeY)

  return canvas.toDataURL("image/png")
}

export function FaviconBadge({ count }: { count: number }) {
  const linkRef = useRef<HTMLLinkElement | null>(null)

  useEffect(() => {
    const link =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? null
    linkRef.current = link
    if (!link) return

    if (count > 0) {
      link.href = getBadgeDataUrl(count)
    } else {
      link.href = "/favicon.svg"
    }

    return () => {
      if (linkRef.current) linkRef.current.href = "/favicon.svg"
    }
  }, [count])

  return null
}
