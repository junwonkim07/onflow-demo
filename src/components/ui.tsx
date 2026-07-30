import type { ReactNode } from 'react'
import { TOOLS, type ToolKey } from '../intent'
import { IconHousekeepingBookRegular, IconFileRegular } from '@seed-design/icon'

/** ERP/Drive처럼 TOOLS에 없는 소스까지 커버하는 아이콘 배지 */
export function SourceBadge({ source, size = 28 }: { source: ToolKey | 'erp' | 'drive'; size?: number }) {
  const style = {
    width: size,
    height: size,
    borderRadius: size * 0.32,
  }
  if (source === 'erp')
    return (
      <div className="grid place-items-center bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)]" style={style}>
        <IconHousekeepingBookRegular width={size * 0.55} height={size * 0.55} />
      </div>
    )
  if (source === 'drive')
    return (
      <div className="grid place-items-center bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]" style={style}>
        <IconFileRegular width={size * 0.55} height={size * 0.55} />
      </div>
    )
  const tool = TOOLS[source]
  return (
    <div
      className="grid place-items-center bg-[var(--m3-surface-container)]"
      style={{ ...style, color: tool.color }}
    >
      {tool.logo}
    </div>
  )
}

export function sourceName(source: ToolKey | 'erp' | 'drive'): string {
  if (source === 'erp') return 'Sabangnet ERP'
  if (source === 'drive') return 'Google Drive'
  return TOOLS[source].name
}

/** Onflow 에이전트 글리프 — 흐름(flow)을 나타내는 이중 웨이브 (Gemini 별 아님) */
export function SparkIcon({ width = 16, height, className }: { width?: number; height?: number; className?: string }) {
  return (
    <svg width={width} height={height ?? width} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 9.2c2.6-2.9 5.4-2.9 8 0s5.4 2.9 8 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 15c2.6-2.9 5.4-2.9 8 0s5.4 2.9 8 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

/** 인터콤풍 표면 — 화이트 + 헤어라인 보더 + 아주 옅은 그림자 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--m3-surface-container-lowest)] rounded-xl border border-[var(--m3-outline-variant)] card-shadow ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-[21px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-sm text-[var(--m3-on-surface-variant)] mt-1">{desc}</p>}
      </div>
      {right}
    </div>
  )
}
