"use client"

import { useEffect, useRef } from "react"
import {
  isSoundEnabled,
  getSoundStyle,
  type SoundStyle,
} from "@/components/sound-toggle"

const GAIN = 0.45

function getCtx(): AudioContext | null {
  try {
    return new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
  } catch {
    return null
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = type
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(GAIN, start + 0.02)
  gain.gain.setValueAtTime(GAIN, start + duration * 0.3)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start)
  osc.stop(start + duration)
}

function playStyle1(ctx: AudioContext) {
  const t = ctx.currentTime
  tone(ctx, 520, t, 0.28)
  tone(ctx, 784, t + 0.22, 0.35)
  tone(ctx, 1047, t + 0.5, 0.3)
}

function playStyle2(ctx: AudioContext) {
  const t = ctx.currentTime
  tone(ctx, 880, t, 0.2)
  tone(ctx, 659, t + 0.18, 0.22)
  tone(ctx, 523, t + 0.35, 0.25)
  tone(ctx, 392, t + 0.52, 0.35)
}

function playStyle3(ctx: AudioContext) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = 220
  osc.type = "sine"
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(GAIN * 1.2, t + 0.05)
  gain.gain.setValueAtTime(GAIN * 1.2, t + 0.25)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7)
  osc.start(t)
  osc.stop(t + 0.7)
}

function playStyle4(ctx: AudioContext) {
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(1400, t)
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.5)
  osc.type = "sine"
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(GAIN, t + 0.02)
  gain.gain.setValueAtTime(GAIN, t + 0.35)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
  osc.start(t)
  osc.stop(t + 0.55)
}

const PLAYERS: Record<SoundStyle, (ctx: AudioContext) => void> = {
  1: playStyle1,
  2: playStyle2,
  3: playStyle3,
  4: playStyle4,
}

/** Play a specific sound style (e.g. for preview on selection). Ignores mute. */
export function playSoundStyle(style: SoundStyle) {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const play = PLAYERS[style]
    if (play) play(ctx)
  } catch {
    // Ignore
  }
}

function playNotificationSound() {
  if (!isSoundEnabled()) return
  const style = getSoundStyle()
  const ctx = getCtx()
  if (!ctx) return
  try {
    const play = PLAYERS[style]
    if (play) play(ctx)
  } catch {
    // Ignore
  }
}

export function useNewEmailSound(unreadCount: number) {
  const prevCount = useRef(unreadCount)

  useEffect(() => {
    if (unreadCount > prevCount.current && unreadCount > 0) {
      playNotificationSound()
    }
    prevCount.current = unreadCount
  }, [unreadCount])
}
