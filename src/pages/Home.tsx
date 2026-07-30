import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  IconArrowRegular,
  IconAddRegular,
  IconExpandMoreRegular,
  IconLockRegular,
  IconChattingSendRegular,
  IconCheckRegular,
} from '@seed-design/icon'
import { briefing, homeStats, asset, type RecentTask } from '../data'
import { Card, SourceBadge, sourceName } from '../components/ui'
import { spatialExpressive } from '../motion'

/** ChatGPT 스타일 라운드 커맨드 바 + Aside식 컨트롤 칩 줄 */
function HomeChatBar({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [v, setV] = useState('')
  const go = () => {
    if (!v.trim()) return
    onSubmit(v.trim())
    setV('')
  }
  const Chip = ({ children }: { children: React.ReactNode }) => (
    <button className="flex items-center gap-1 text-[12px] text-[var(--m3-on-surface-variant)] px-2 py-1 rounded-lg hover:bg-[var(--m3-surface-container)] transition-colors">
      {children}
      <IconExpandMoreRegular width={11} height={11} />
    </button>
  )
  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-full border border-[var(--m3-outline-variant)] glass-strong pl-2 pr-2 h-[52px] focus-within:border-[var(--m3-outline)] transition-colors">
        <button
          aria-label="Attach"
          className="w-9 h-9 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)] shrink-0"
        >
          <IconAddRegular width={18} height={18} />
        </button>
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Ask anything"
          className="flex-1 bg-transparent outline-none text-[15px] min-w-0"
        />
        <button
          onClick={go}
          aria-label="Send"
          disabled={!v.trim()}
          className={`w-9 h-9 rounded-full grid place-items-center shrink-0 transition-colors ${
            v.trim()
              ? 'bg-[var(--seed-color-bg-brand-solid)] text-[var(--seed-color-fg-brand-contrast)]'
              : 'text-[var(--m3-on-surface-variant)]'
          }`}
        >
          <IconChattingSendRegular width={16} height={16} />
        </button>
      </div>
      <div className="flex items-center px-2 mt-2">
        <Chip>
          <IconLockRegular width={12} height={12} /> Guard
        </Chip>
        <Chip>Local</Chip>
        <div className="flex-1" />
        <Chip>Gemini 2.5</Chip>
        <Chip>High</Chip>
      </div>
    </div>
  )
}

export default function Home({
  pendingCount,
  recent,
  onOpenBrief,
  goWorkspace,
  goApprovals,
}: {
  pendingCount: number
  recent: RecentTask[]
  onOpenBrief: (prompt: string) => void
  goWorkspace: () => void
  goApprovals: () => void
}) {
  const stats = [
    homeStats[0],
    { label: 'Pending approvals', value: `${pendingCount}`, sub: 'Review before anything goes out', onClick: goApprovals },
    ...homeStats.slice(1),
  ] as { label: string; value: string; sub: string; onClick?: () => void }[]

  return (
    <div className="max-w-5xl w-full mx-auto relative">
      {/* 히어로 — 인사말 + 커맨드 바 (이전 버전) */}
      <div className="relative min-h-[34vh] flex flex-col justify-end pb-14">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spatialExpressive}
          className="text-[clamp(30px,3.5vw,40px)] font-bold tracking-tight leading-tight"
        >
          Good morning, Junwon
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.08 }}
          className="text-[16px] text-[var(--m3-on-surface-variant)] mt-2.5"
        >
          Thursday, July 31 · Synced 128 items from 4 sources overnight
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.14 }}
          className="mt-9 w-full max-w-2xl mx-auto"
        >
          <HomeChatBar onSubmit={onOpenBrief} />
        </motion.div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 gap-3 mb-14">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.12 + i * 0.05 }}
            >
              <Card className={`p-5 h-full ${s.onClick ? 'cursor-pointer hover:bg-[var(--m3-surface-container-low)] transition-colors' : ''}`}>
                <button className="text-left w-full" onClick={s.onClick} disabled={!s.onClick}>
                  <div className="text-[13px] text-[var(--m3-on-surface-variant)]">{s.label}</div>
                  <div className="text-[28px] font-bold mt-1.5 tabular-nums tracking-tight">{s.value}</div>
                  <div className="text-xs text-[var(--m3-on-surface-variant)] mt-1">{s.sub}</div>
                </button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent tasks — Aside 스타일 활동 카드 */}
        <h2 className="font-bold text-lg mb-3.5">Recent tasks</h2>
        <div className="grid grid-cols-3 gap-3 mb-14">
          {recent.slice(0, 3).map((t, i) => (
            <motion.div
              key={t.title + t.when}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.18 + i * 0.05 }}
            >
              <Card className="p-4 h-full flex flex-col">
                <div className="text-xs text-[var(--m3-on-surface-variant)] mb-1">
                  {t.when === 'just now' ? 'Just now' : t.when}
                </div>
                <div className="font-semibold text-[15px] leading-snug line-clamp-1">{t.title}</div>
                {t.steps && (
                  <ul className="mt-2 space-y-1">
                    {t.steps.map(st => (
                      <li key={st} className="flex items-center gap-1.5 text-[12px] text-[var(--m3-on-surface-variant)]">
                        <IconCheckRegular width={12} height={12} className="shrink-0 opacity-60" />
                        <span className="truncate">{st}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex-1" />
                {t.img ? (
                  <img
                    src={asset(t.img)}
                    alt=""
                    className="mt-3 rounded-lg border border-[var(--m3-outline-variant)] h-24 w-full object-cover"
                  />
                ) : (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--m3-on-surface-variant)]">
                    <SourceBadge source={t.tool} size={18} />
                    {sourceName(t.tool)}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Today’s briefing</h2>
          <button
            onClick={goWorkspace}
            className="text-sm text-[var(--m3-primary)] font-medium flex items-center gap-1 hover:underline"
          >
            Continue in Workspace <IconArrowRegular width={14} height={14} />
          </button>
        </div>
        <div className="space-y-2.5">
          {briefing.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.24 + i * 0.06 }}
            >
              <button
                onClick={() => onOpenBrief(b.prompt)}
                className="w-full text-left bg-[var(--m3-surface-container-lowest)] rounded-xl border border-[var(--m3-outline-variant)] card-shadow px-5 py-4 flex items-center gap-4 hover:bg-[var(--m3-surface-container-low)] transition-colors group"
              >
                <SourceBadge source={b.tool} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold text-[16px] truncate">{b.title}</span>
                    <span className="text-xs text-[var(--m3-on-surface-variant)] shrink-0">
                      {sourceName(b.tool)} · {b.time}
                    </span>
                  </span>
                  <span className="block text-sm text-[var(--m3-on-surface-variant)] truncate mt-1">{b.detail}</span>
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] shrink-0 group-hover:hidden">
                  Ready
                </span>
                <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--m3-primary)] text-[var(--m3-on-primary)] shrink-0 hidden group-hover:flex items-center gap-1">
                  Continue <IconArrowRegular width={11} height={11} />
                </span>
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-[var(--m3-on-surface-variant)] mt-8 mb-4 text-center">
          Drafts only — nothing leaves without approval.
        </p>
      </div>
    </div>
  )
}
