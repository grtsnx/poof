"use client"

/**
 * FLARE SSE Hook
 * Keeps a persistent connection open so emails land instantly.
 * Your inbox. But fast. Disturbingly fast.
 */

import { useEffect, useRef, useCallback } from "react"
import { RawIncomingEmail } from "./use-email"

interface UseSSEOptions {
  address: string | null
  onEmail: (email: RawIncomingEmail) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

export function useSSE({ address, onEmail, onConnected, onDisconnected }: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  // Keep latest callbacks in refs so connect() never needs to rebuild when they change
  const onEmailRef = useRef(onEmail)
  const onConnectedRef = useRef(onConnected)
  const onDisconnectedRef = useRef(onDisconnected)
  useEffect(() => {
    onEmailRef.current = onEmail
    onConnectedRef.current = onConnected
    onDisconnectedRef.current = onDisconnected
  })

  const connect = useCallback(() => {
    if (!address || !isMounted.current) return

    const es = new EventSource(`/api/email/stream/${encodeURIComponent(address)}`)
    esRef.current = es

    es.onopen = () => {
      onConnectedRef.current?.()
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === "email") {
          onEmailRef.current(data.email as RawIncomingEmail)
        }
      } catch {
        // Malformed event — ignore
      }
    }

    es.onerror = () => {
      es.close()
      onDisconnectedRef.current?.()
      if (isMounted.current) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }
  }, [address]) // only reconnects when address changes

  useEffect(() => {
    isMounted.current = true
    connect()
    return () => {
      isMounted.current = false
      esRef.current?.close()
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [connect])
}
