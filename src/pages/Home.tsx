import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { IconArrowRegular, IconAddRegular, IconExpandMoreRegular, IconLockRegular, IconSearchRegular } from '@seed-design/icon'
import { briefing, homeStats, asset, type RecentTask } from '../data'
import { Card, SourceBadge, sourceName } from '../components/ui'
import { spatialExpressive } from '../motion'

/** 라이브 시계 — 개인화 대신 시간이 히어로다 */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return (
    <div className="text-center">
      <div className="text-[clamp(44px,6vw,64px)] font-semibold tracking-tight tabular-nums leading-none">
        {hh}:{mm}
      </div>
      <div className="text-[15px] text-[var(--m3-on-surface-variant)] mt-3">
        Thursday, July 31 · Synced 128 items from 4 sources overnight
      </div>
    </div>
  )
}

/** Aside 스타일 커맨드 바 — Search | Ask AI 세그먼트 + 아래 컨트롤 칩 */
function HomeChatBar({ onSubmit, onSearch }: { onSubmit: (text: string) => void; onSearch: () => void }) {
  const [v, setV] = useState('')
  const go = () => {
    if (!v.trim()) return
    onSubmit(v.trim())
    setV('')
  }
  const Chip = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <button
      className={`flex items-center gap-1 text-[12px] text-[var(--m3-on-surface-variant)] px-2 py-1 rounded-lg hover:bg-[var(--m3-surface-container)] transition-colors ${right ? '' : ''}`}
    >
      {children}
      <IconExpandMoreRegular width={11} height={11} />
    </button>
  )
  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] pl-5 pr-2 h-14 focus-within:border-[var(--m3-outline)] transition-colors">
        <input
          value={v}
          onChange={e => setV(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Ask a task, @ for context"
          className="flex-1 bg-transparent outline-none text-[15px] min-w-0"
        />
        <div className="flex items-center rounded-xl bg-[var(--m3-surface-container)] p-1 shrink-0">
          <button
            onClick={onSearch}
            className="h-8 px-3.5 rounded-lg text-[13px] text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)] transition-colors flex items-center gap-1.5"
          >
            <IconSearchRegular width={13} height={13} /> Search
          </button>
          <button
            onClick={go}
            className="h-8 px-3.5 rounded-lg text-[13px] font-semibold bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)]"
          >
            Ask AI
          </button>
        </div>
      </div>
      <div className="flex items-center px-2 mt-2">
        <button aria-label="Attach" className="w-7 h-7 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]">
          <IconAddRegular width={15} height={15} />
        </button>
        <Chip>
          <IconLockRegular width={12} height={12} /> Guard
        </Chip>
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
  onSearch,
  goWorkspace,
  goApprovals,
}: {
  pendingCount: number
  recent: RecentTask[]
  onOpenBrief: (prompt: string) => void
  onSearch: () => void
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
      {/* 히어로 — 시계 + 커맨드 바 (중앙) */}
      <div className="relative min-h-[30vh] flex flex-col items-center justify-end pb-10">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spatialExpressive}>
          <Clock />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.1 }}
          className="mt-7 w-full max-w-2xl mx-auto"
        >
          <HomeChatBar onSubmit={onOpenBrief} onSearch={onSearch} />
        </motion.div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 gap-3 mb-8">
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
        <h2 className="font-bold text-lg mb-3">Recent tasks</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {recent.slice(0, 3).map((t, i) => (
            <motion.div
              key={t.title + t.when}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.18 + i * 0.05 }}
            >
              <Card className="p-4 h-full flex flex-col">
                <div className="text-xs text-[var(--m3-on-surface-variant)] mb-1.5">
                  {t.when === 'just now' ? 'Just now' : t.when}
                </div>
                <div className="font-semibold text-[15px] leading-snug line-clamp-2">{t.title}</div>
                <div className="flex items-center gap-2 mt-3">
                  <SourceBadge source={t.tool} size={22} />
                  <span className="text-[11px] text-[var(--m3-on-surface-variant)]">{sourceName(t.tool)}</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded-lg bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]">
                    Done
                  </span>
                </div>
                {t.img && (
                  <img
                    src={asset(t.img)}
                    alt=""
                    className="mt-3 rounded-lg border border-[var(--m3-outline-variant)] h-24 w-full object-cover"
                  />
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
                className="w-full text-left bg-[var(--m3-surface-container-lowest)] rounded-xl border border-[var(--m3-outline-variant)] px-5 py-4 flex items-center gap-4 hover:bg-[var(--m3-surface-container-low)] transition-colors group"
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
