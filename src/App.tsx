import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Avatar } from 'seed-design/ui/avatar'
import {
  IconHomeRegular,
  IconChattingRegular,
  IconListCheckRegular,
  IconSearchDocRegular,
  IconToolboxRegular,
  IconSettingRegular,
  IconNotificationRegular,
  IconSearchRegular,
  IconMoonRegular,
  IconSunRegular,
} from '@seed-design/icon'
import { applyTheme } from './theme'
import { initialApprovals, briefing, docs, type Approval } from './data'
import Home from './pages/Home'
import Workspace from './pages/Workspace'
import Approvals from './pages/Approvals'
import Knowledge from './pages/Knowledge'
import Integrations from './pages/Integrations'

type Page = 'home' | 'workspace' | 'approvals' | 'knowledge' | 'integrations'
type IconComp = typeof IconHomeRegular

const NAV: { key: Page; label: string; Icon: IconComp }[] = [
  { key: 'home', label: 'Home', Icon: IconHomeRegular },
  { key: 'workspace', label: 'Workspace', Icon: IconChattingRegular },
  { key: 'approvals', label: 'Approvals', Icon: IconListCheckRegular },
  { key: 'knowledge', label: 'Memory', Icon: IconSearchDocRegular },
  { key: 'integrations', label: 'Integrations', Icon: IconToolboxRegular },
]

const TITLES: Record<Page, string> = {
  home: 'Home',
  workspace: 'Workspace',
  approvals: 'Approvals',
  knowledge: 'Company Memory',
  integrations: 'Integrations',
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals)
  const [toast, setToast] = useState<string | null>(null)
  const [seed, setSeed] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const openBrief = (prompt: string) => {
    setSeed(prompt)
    setPage('workspace')
  }

  useEffect(() => {
    applyTheme(dark ? 'dark' : 'light')
  }, [dark])

  // ⌘K / Ctrl+K 커맨드 팔레트
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const pendingCount = approvals.filter(a => a.status === 'pending').length

  const decide = (id: number, status: 'approved' | 'rejected') => {
    setApprovals(xs => xs.map(x => (x.id === id ? { ...x, status } : x)))
    const a = approvals.find(x => x.id === id)
    if (a) setToast(status === 'approved' ? `Sent — ${a.title}` : `Rejected — ${a.title}`)
  }

  return (
    <MotionConfig reducedMotion="user">
    <div className="h-screen flex bg-[var(--m3-surface)] text-[var(--m3-on-surface)]">
      {/* M3 Navigation Rail */}
      <nav className="relative w-20 shrink-0 flex flex-col items-center py-4 gap-1 bg-[var(--m3-surface-container-low)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--m3-primary)] text-[var(--m3-on-primary)] grid place-items-center font-bold text-lg mb-4">
          O
        </div>
        {NAV.map(({ key, label, Icon }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              className="w-full flex flex-col items-center gap-1.5 py-2 group"
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`relative w-14 h-8 rounded-full grid place-items-center transition-colors ${
                  active
                    ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                    : 'text-[var(--m3-on-surface-variant)] group-hover:bg-[var(--m3-surface-container-high)]'
                }`}
              >
                <Icon width={20} height={20} />
                {key === 'approvals' && pendingCount > 0 && (
                  <span className="absolute -top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-[var(--m3-error)] text-white text-[10px] grid place-items-center">
                    {pendingCount}
                  </span>
                )}
              </span>
              <span className={`text-[11px] ${active ? 'font-bold' : 'text-[var(--m3-on-surface-variant)]'}`}>{label}</span>
            </button>
          )
        })}
        <div className="flex-1" />
        <button className="w-14 h-8 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]">
          <IconSettingRegular width={20} height={20} />
        </button>
      </nav>

      {/* Main */}
      <div className="relative flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center gap-3 px-6">
          <h1 className="font-bold text-lg tracking-tight">{TITLES[page]}</h1>
          <span className="text-xs text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-full px-2.5 py-1">
            Moho Inc.
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setPaletteOpen(true)}
            className="h-10 w-72 rounded-full bg-[var(--m3-surface-container)] flex items-center gap-2.5 px-4 text-sm text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)] transition-colors"
          >
            <IconSearchRegular width={16} height={16} />
            Search or command…
            <kbd className="ml-auto text-[10px] border border-[var(--m3-outline-variant)] rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <button
            onClick={() => setDark(d => !d)}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]"
          >
            {dark ? <IconSunRegular width={19} height={19} /> : <IconMoonRegular width={19} height={19} />}
          </button>
          <button
            aria-label="Notifications"
            className="w-10 h-10 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]"
          >
            <IconNotificationRegular width={19} height={19} />
          </button>
          <Avatar size="36" fallback="J" />
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto px-10 pb-8 flex">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="flex-1 min-h-0 flex"
          >
            {page === 'home' && (
              <Home
                pendingCount={pendingCount}
                onOpenBrief={openBrief}
                goWorkspace={() => setPage('workspace')}
                goApprovals={() => setPage('approvals')}
              />
            )}
            {page === 'workspace' && (
              <Workspace
                onExecuted={s => setToast(`Done — ${s}`)}
                seedPrompt={seed}
                onSeedConsumed={() => setSeed(null)}
              />
            )}
            {page === 'approvals' && <Approvals approvals={approvals} onDecide={decide} />}
            {page === 'knowledge' && <Knowledge onAsk={openBrief} />}
            {page === 'integrations' && <Integrations />}
          </motion.div>
        </main>
      </div>

      {/* 커맨드 팔레트 */}
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onNavigate={p => {
              setPage(p)
              setPaletteOpen(false)
            }}
            onPrompt={prompt => {
              openBrief(prompt)
              setPaletteOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* 토스트 */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--m3-inverse-surface)] text-[var(--m3-inverse-on-surface)] text-sm rounded-full px-5 py-2.5 shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  )
}

/* ---------- ⌘K 커맨드 팔레트 ---------- */

function CommandPalette({
  onClose,
  onNavigate,
  onPrompt,
}: {
  onClose: () => void
  onNavigate: (p: Page) => void
  onPrompt: (prompt: string) => void
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const items = useMemo(() => {
    const nav = NAV.map(n => ({ group: 'Navigate', label: n.label, hint: 'Page', run: () => onNavigate(n.key) }))
    const quick = briefing.map(b => ({
      group: 'Quick actions',
      label: b.prompt,
      hint: b.title,
      run: () => onPrompt(b.prompt),
    }))
    const docItems = docs.map(d => ({
      group: 'Documents',
      label: d.title,
      hint: d.owner,
      run: () => onNavigate('knowledge'),
    }))
    return [...quick, ...nav, ...docItems]
  }, [onNavigate, onPrompt])

  const filtered = items.filter(i => !q.trim() || (i.label + i.hint).toLowerCase().includes(q.toLowerCase()))
  const groups = [...new Set(filtered.map(i => i.group))]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-start justify-center pt-[12vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="w-[560px] max-w-[90vw] rounded-2xl bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-[var(--m3-outline-variant)]">
          <IconSearchRegular width={17} height={17} className="text-[var(--m3-on-surface-variant)]" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return
              if (filtered[0]) filtered[0].run()
              else if (q.trim()) onPrompt(q.trim())
            }}
            placeholder="Search or just ask…  e.g. safety stock"
            className="flex-1 h-12 bg-transparent outline-none text-[15px]"
          />
          <kbd className="text-[10px] border border-[var(--m3-outline-variant)] rounded px-1.5 py-0.5 text-[var(--m3-on-surface-variant)]">
            esc
          </kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto py-2">
          {groups.map(g => (
            <div key={g}>
              <div className="px-4 pt-2 pb-1 text-[11px] font-bold text-[var(--m3-on-surface-variant)]">{g}</div>
              {filtered
                .filter(i => i.group === g)
                .map(i => (
                  <button
                    key={g + i.label}
                    onClick={i.run}
                    className="w-full text-left px-4 py-2 flex items-baseline gap-2.5 hover:bg-[var(--m3-surface-container)] transition-colors"
                  >
                    <span className="text-sm truncate">{i.label}</span>
                    <span className="ml-auto text-[11px] text-[var(--m3-on-surface-variant)] shrink-0">{i.hint}</span>
                  </button>
                ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--m3-on-surface-variant)]">
              No matches — press Enter to ask the agent in Workspace
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
