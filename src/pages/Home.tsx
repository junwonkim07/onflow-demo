import { motion } from 'framer-motion'
import { IconArrowRegular } from '@seed-design/icon'
import { briefing, homeStats, asset, type RecentTask } from '../data'
import { Card, SourceBadge, sourceName } from '../components/ui'
import { spatialExpressive } from '../motion'

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
      {/* 히어로 — 화면 상단 절반을 인사말이 차지한다 */}
      <div className="relative min-h-[38vh] flex flex-col justify-end pb-12">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spatialExpressive}
          className="text-[clamp(32px,4vw,44px)] font-bold tracking-tight leading-tight"
        >
          Good morning, Junwon
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.08 }}
          className="text-[17px] text-[var(--m3-on-surface-variant)] mt-3"
        >
          Thursday, July 31 · Synced 128 items from 4 sources overnight
        </motion.p>
      </div>

      <div className="relative">
        <div className="grid grid-cols-4 gap-5 mb-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.12 + i * 0.05 }}
            >
              <Card className={`p-5 h-full ${s.onClick ? 'cursor-pointer hover:shadow-[0_8px_26px_rgba(0,0,0,.12)] transition-shadow' : ''}`}>
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
        <h2 className="font-bold text-lg mb-4">Recent tasks</h2>
        <div className="grid grid-cols-3 gap-5 mb-10">
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
        <div className="space-y-3.5">
          {briefing.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spatialExpressive, delay: 0.24 + i * 0.06 }}
            >
              <button
                onClick={() => onOpenBrief(b.prompt)}
                className="w-full text-left bg-[var(--m3-surface-container-lowest)] rounded-xl border border-[var(--m3-outline-variant)] px-5 py-4 flex items-center gap-4 shadow-[0_1px_2px_rgba(0,0,0,.03)] hover:bg-[var(--m3-surface-container-low)] hover:border-[var(--m3-outline)] transition-colors group"
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
          Everything in the briefing is a draft — nothing leaves the company without approval.
        </p>
      </div>
    </div>
  )
}
