"use client"

import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 640

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    setIsMobile(mql.matches)
    const handler = () => setIsMobile(mql.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])
  return isMobile
}
