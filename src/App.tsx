import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
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
import { Component, type ReactNode } from 'react'
import { initialApprovals, briefing, docs, seedRecent, asset, type Approval, type RecentTask } from './data'
import type { ToolKey } from './intent'
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
  const [dark, setDark] = useState(false) // 기본 라이트 모드
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals)
  const [toast, setToast] = useState<string | null>(null)
  const [seed, setSeed] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [recent, setRecent] = useState<RecentTask[]>(seedRecent)

  const recordRun = (title: string, tool: ToolKey) => {
    setToast(`Done — ${title}`)
    setRecent(r => [{ title, tool, when: 'just now' }, ...r].slice(0, 6))
  }

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
    if (a) {
      setToast(status === 'approved' ? `Sent — ${a.title}` : `Rejected — ${a.title}`)
      if (status === 'approved') setRecent(r => [{ title: a.title, tool: a.tool, when: 'just now' }, ...r].slice(0, 6))
    }
  }

  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
    <div className="h-screen flex bg-[var(--m3-surface)] text-[var(--m3-on-surface)]">
      {/* M3 Navigation Rail */}
      <nav className="relative w-16 shrink-0 flex flex-col items-center py-4 gap-3 bg-[var(--m3-surface-container-lowest)] border-r border-[var(--m3-outline-variant)]">
        {NAV.map(({ key, label, Icon }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => setPage(key)}
              title={label}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`relative w-11 h-11 rounded-lg grid place-items-center transition-colors ${
                active
                  ? 'bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface)]'
                  : 'text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]'
              }`}
            >
              <Icon width={23} height={23} />
              {key === 'approvals' && pendingCount > 0 && (
                <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full bg-[var(--m3-error)] text-white text-[10px] grid place-items-center ring-2 ring-[var(--m3-surface-container-lowest)]">
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          title="Settings"
          aria-label="Settings"
          className="w-11 h-11 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]"
        >
          <IconSettingRegular width={22} height={22} />
        </button>
      </nav>

      {/* Main */}
      <div className="relative flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 flex items-center gap-3 px-6">
          <h1 className="font-bold text-lg tracking-tight">{TITLES[page]}</h1>
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
          <img src={asset('img/avatar-junwon.jpg')} alt="Junwon Kim" className="w-9 h-9 rounded-full object-cover" />
        </header>

        <main className="flex-1 min-h-0 flex overflow-hidden">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="flex-1 min-h-0 flex"
          >
            {page === 'workspace' ? (
              <Workspace onExecuted={recordRun} seedPrompt={seed} onSeedConsumed={() => setSeed(null)} />
            ) : (
              /* 워크스페이스와 같은 인셋 윈도우 프레임 — 탭 간 연결성 */
              <div className="flex-1 min-h-0 m-3 mt-0 rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-y-auto">
                <div className="px-10 py-8 min-h-full flex">
                  {page === 'home' && (
                    <Home
                      pendingCount={pendingCount}
                      recent={recent}
                      onOpenBrief={openBrief}
                      goWorkspace={() => setPage('workspace')}
                      goApprovals={() => setPage('approvals')}
                    />
                  )}
                  {page === 'approvals' && <Approvals approvals={approvals} onDecide={decide} />}
                  {page === 'knowledge' && <Knowledge onAsk={openBrief} />}
                  {page === 'integrations' && <Integrations />}
                </div>
              </div>
            )}
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--m3-inverse-surface)] text-[var(--m3-inverse-on-surface)] text-sm rounded-xl px-5 py-2.5"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
    </ErrorBoundary>
  )
}

/** 크래시 시 빈 화면/리로드처럼 보이는 대신 에러를 그대로 보여준다 (튕김 진단용) */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen grid place-items-center bg-[var(--m3-surface)] text-[var(--m3-on-surface)] p-8">
          <div className="max-w-lg text-center space-y-3">
            <h1 className="text-lg font-bold">Something broke</h1>
            <pre className="text-xs text-left whitespace-pre-wrap bg-[var(--m3-surface-container)] rounded-xl p-4 overflow-auto max-h-60">
              {String(this.state.error?.stack || this.state.error)}
            </pre>
            <button
              onClick={() => location.reload()}
              className="px-4 h-10 rounded-lg bg-[var(--m3-primary)] text-[var(--m3-on-primary)] text-sm font-bold"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
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
        className="w-[560px] max-w-[90vw] rounded-xl bg-[var(--m3-surface-container-lowest)] border border-[var(--m3-outline-variant)] overflow-hidden"
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
