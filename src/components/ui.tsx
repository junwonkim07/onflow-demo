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

/** 인터콤풍 표면 — 화이트 + 헤어라인 보더 + 아주 옅은 그림자 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--m3-surface-container-lowest)] rounded-xl border border-[var(--m3-outline-variant)] ${className}`}
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
