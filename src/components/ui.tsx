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

/** 보더 없는 표면 — 톤 차이와 은은한 그림자로만 구분 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--m3-surface-container-lowest)] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_28px_-14px_rgba(0,0,0,.12)] ${className}`}
    >
      {children}
    </div>
  )
}

export function PageHeader({ title, desc, right }: { title: string; desc?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-7">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-[15px] text-[var(--m3-on-surface-variant)] mt-1.5">{desc}</p>}
      </div>
      {right}
    </div>
  )
}
