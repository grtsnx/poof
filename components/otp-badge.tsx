"use client"

import { useState } from "react"
import { Copy, Check } from "@phosphor-icons/react"

interface Props {
  codes: string[]
}

export function OTPBadge({ codes }: Props) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  if (codes.length === 0) return null

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="otp-container">
      <div className="otp-codes">
        {codes.map((code) => (
          <button key={code} className="otp-code" onClick={() => copy(code)}>
            <span className="otp-digits">{code.split("").join(" ")}</span>
            <span className="otp-copy-icon">
              {copiedCode === code ? (
                <Check size={14} weight="bold" className="otp-check" />
              ) : (
                <Copy size={14} />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
