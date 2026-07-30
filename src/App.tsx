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
  IconCheckRegular,
  IconChattingSendRegular,
} from '@seed-design/icon'
import { SourceBadge } from './components/ui'
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
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifRead, setNotifRead] = useState(false)
  const [asideOpen, setAsideOpen] = useState(false) // 우측 패널 — 첫 화면은 기본 숨김, 토글로 on/off
  const [recent, setRecent] = useState<RecentTask[]>(seedRecent)

  const recordRun = (title: string, tool: ToolKey) => {
    setToast(`Done — ${title}`)
    setRecent(r =>
      [{ title, tool, when: 'just now', steps: ['Prepared while typing', 'You reviewed the draft', 'Ran'] }, ...r].slice(0, 6),
    )
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
      <nav className="relative w-16 shrink-0 flex flex-col items-center py-4 gap-3 glass border-r border-[var(--m3-outline-variant)]">
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
        <header className="h-16 shrink-0 flex items-center gap-3 px-6 glass">
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
          {page !== 'workspace' && (
            <button
              onClick={() => setAsideOpen(o => !o)}
              aria-label="Toggle side panel"
              title="Copilot panel"
              className={`w-10 h-10 rounded-full grid place-items-center transition-colors ${
                asideOpen ? 'text-[var(--m3-on-surface)] bg-[var(--m3-surface-container-high)]' : 'text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12.5 3.5v13" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setDark(d => !d)}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]"
          >
            {dark ? <IconSunRegular width={19} height={19} /> : <IconMoonRegular width={19} height={19} />}
          </button>
          <div className="relative">
            <button
              aria-label="Notifications"
              onClick={() => setNotifOpen(o => !o)}
              className="w-10 h-10 rounded-full grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)]"
            >
              <IconNotificationRegular width={19} height={19} />
              {!notifRead && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--m3-error)]" />}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-hidden">
                  <div className="flex items-center justify-between px-4 h-11 border-b border-[var(--m3-outline-variant)]">
                    <span className="text-[13px] font-bold">Notifications</span>
                    <button
                      onClick={() => setNotifRead(true)}
                      className="text-[11px] text-[var(--m3-on-surface-variant)] hover:text-[var(--m3-on-surface)]"
                    >
                      Mark all read
                    </button>
                  </div>
                  {[
                    {
                      title: `${pendingCount} drafts waiting for approval`,
                      sub: 'Purchase order · deadline reminder',
                      go: () => setPage('approvals'),
                    },
                    {
                      title: '3 unread mentions in #logistics-ops',
                      sub: 'Order deadline questions',
                      go: () => setPage('workspace'),
                    },
                    {
                      title: 'Overnight sync finished',
                      sub: '128 items from 4 sources',
                      go: () => setPage('knowledge'),
                    },
                  ].map(n => (
                    <button
                      key={n.title}
                      onClick={() => {
                        n.go()
                        setNotifOpen(false)
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-[var(--m3-surface-container-low)] transition-colors border-b border-[var(--m3-outline-variant)] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        {!notifRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--m3-primary)] shrink-0" />}
                        <span className="text-[13px] font-semibold truncate">{n.title}</span>
                      </div>
                      <div className="text-[11px] text-[var(--m3-on-surface-variant)] mt-0.5 truncate">{n.sub}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
              /* 워크스페이스와 같은 인셋 윈도우 프레임 + 공통 우측 패널 — 탭 간 연결성 */
              <div className="flex-1 min-h-0 flex gap-3 m-3 mt-0">
                <div className={`flex-1 min-h-0 rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-y-auto ${page === 'home' ? 'no-scrollbar' : ''}`}>
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
                {asideOpen && (
                  <GlobalAside
                    pendingCount={pendingCount}
                    recent={recent}
                    onAsk={openBrief}
                    goApprovals={() => setPage('approvals')}
                  />
                )}
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

/* ---------- 전 탭 공통 우측 패널 (Copilot / Details) ---------- */

function GlobalAside({
  pendingCount,
  recent,
  onAsk,
  goApprovals,
}: {
  pendingCount: number
  recent: RecentTask[]
  onAsk: (prompt: string) => void
  goApprovals: () => void
}) {
  const [tab, setTab] = useState<'copilot' | 'details'>('copilot')
  const [q, setQ] = useState('')
  const ask = () => {
    if (!q.trim()) return
    onAsk(q.trim())
    setQ('')
  }
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-hidden text-[13px]">
      <div className="h-12 shrink-0 flex items-center gap-4 px-4 border-b border-[var(--m3-outline-variant)]">
        {(['copilot', 'details'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative h-full text-[13px] font-semibold capitalize ${tab === t ? '' : 'text-[var(--m3-on-surface-variant)]'}`}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ea580c] rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'copilot' ? (
        <div className="flex-1 min-h-0 flex flex-col p-4">
          <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2">QUICK ACTIONS</div>
          <div className="space-y-1.5">
            {briefing.map(b => (
              <button
                key={b.id}
                onClick={() => onAsk(b.prompt)}
                className="w-full text-left px-3 py-2 rounded-lg bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] transition-colors truncate text-[12.5px]"
              >
                {b.prompt}
              </button>
            ))}
          </div>
          <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mt-4 mb-2">RECENT</div>
          <ul className="space-y-1.5">
            {recent.slice(0, 3).map(t => (
              <li key={t.title + t.when} className="flex items-center gap-2">
                <IconCheckRegular width={13} height={13} className="shrink-0 text-[var(--m3-primary)]" />
                <span className="flex-1 truncate text-[12.5px]">{t.title}</span>
                <span className="text-[10px] text-[var(--m3-on-surface-variant)] shrink-0">{t.when === 'just now' ? 'now' : t.when}</span>
              </li>
            ))}
          </ul>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--m3-outline-variant)] pl-3 pr-1 py-1 focus-within:border-[var(--m3-outline)] transition-colors">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="Ask a question"
              className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
            />
            <button
              onClick={ask}
              aria-label="Ask"
              className="w-7 h-7 rounded-md bg-[var(--seed-color-bg-brand-solid)] text-[var(--seed-color-fg-brand-contrast)] grid place-items-center shrink-0"
            >
              <IconChattingSendRegular width={13} height={13} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2">PENDING APPROVALS</div>
            <button
              onClick={goApprovals}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] transition-colors"
            >
              <span className="font-semibold">{pendingCount} waiting</span>
              <span className="text-[11px] text-[var(--m3-on-surface-variant)]">Review →</span>
            </button>
          </div>
          <div>
            <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2.5">CONNECTED</div>
            <div className="flex items-center gap-2">
              {(['slack', 'notion', 'gmail', 'calendar', 'erp'] as const).map(k => (
                <SourceBadge key={k} source={k} size={28} />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[var(--m3-on-surface-variant)] leading-relaxed border-t border-[var(--m3-outline-variant)] pt-3">
            Only what you can access — nothing else is revealed to exist.
          </p>
        </div>
      )}
    </aside>
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
