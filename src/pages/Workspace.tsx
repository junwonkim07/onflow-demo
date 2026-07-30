import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ActionButton } from 'seed-design/ui/action-button'
import {
  IconChattingSendRegular,
  IconCheckRegular,
  IconLockRegular,
  IconUserGroupRegular,
  IconClockRegular,
  IconCalendarRegular,
  IconWarningRegular,
  IconAddRegular,
  IconCheckFlowerRegular,
} from '@seed-design/icon'
import {
  detect,
  slotToAction,
  conflictToAction,
  fmtHour,
  TOOLS,
  type Detected,
  type Intent,
  type AvailabilityAnswer,
  type ConflictAnswer,
  type ToolKey,
} from '../intent'
import { initialThread, teammates, memberSchedules, aqaraBriefing, briefing, type ThreadMessage, type SourceKey } from '../data'
import { Card, SourceBadge } from '../components/ui'
import { spatialExpressive, effect } from '../motion'

const PLACEHOLDERS = [
  'Where do things stand with Aqara Life?',
  'When is everyone free for tomorrow’s meeting?',
  'Notify logistics about SKUs below safety stock',
]

/** 고스트 자동완성 풀 — 앞부분이 일치하면 나머지가 섀도로 뜨고 Tab으로 완성된다 */
const SUGGESTIONS = [
  ...new Set([
    ...PLACEHOLDERS,
    ...briefing.map(b => b.prompt),
    'Trying to set a meeting tomorrow — when is everyone free?',
    'Email Sanghyun to schedule the meeting',
    'Post in #design-team that the review moved from 2pm to 3pm',
  ]),
]

/** 메시지·세션 ID — Date.now() 충돌(같은 ms 두 번) 방지용 단조 카운터 */
let seq = 1000
const nextId = () => ++seq

/* ---------- 자동 시연 시나리오 (실고객 이력 기반) ---------- */

type DemoStep =
  | { t: 'type'; text: string }
  | { t: 'wait'; ms: number }
  | { t: 'agentReply' }
  | { t: 'chain'; tool: 'calendar' | 'slack' }
  | { t: 'resolve'; source: 'erp' | 'drive' }
  | { t: 'run' }

const SCENARIOS: { key: string; label: string; steps: DemoStep[] }[] = [
  {
    key: 'aqara',
    label: 'Client briefing',
    steps: [
      { t: 'type', text: 'Where do things stand with Aqara Life?' },
      { t: 'wait', ms: 500 },
      { t: 'agentReply' },
      { t: 'wait', ms: 1400 },
      { t: 'type', text: 'Email Sanghyun to schedule the meeting' },
      { t: 'wait', ms: 900 },
      { t: 'run' },
    ],
  },
  {
    key: 'meeting',
    label: 'Scheduling',
    steps: [
      { t: 'type', text: 'Trying to set a meeting tomorrow — when is everyone free?' },
      { t: 'wait', ms: 1200 },
      { t: 'chain', tool: 'calendar' },
      { t: 'wait', ms: 1100 },
      { t: 'run' },
    ],
  },
  {
    key: 'stock',
    label: 'Stock conflict',
    steps: [
      { t: 'type', text: 'Notify logistics about SKUs below safety stock' },
      { t: 'wait', ms: 1100 },
      { t: 'resolve', source: 'erp' },
      { t: 'wait', ms: 1100 },
      { t: 'run' },
    ],
  },
]

type Session = { id: number; title: string; titled: boolean; thread: ThreadMessage[] }

const initialSessions: Session[] = [
  { id: 1, title: 'Ops daily', titled: true, thread: initialThread },
  {
    id: 2,
    title: 'Aqara Life rollout',
    titled: true,
    thread: [
      { id: 1, from: 'me', text: 'How far did we get on Aqara contract terms?', time: 'yesterday' },
      {
        id: 2,
        from: 'agent',
        text: 'We sent the quote — annual maintenance + monthly operations subscription. Only the contract meeting is left. Owner: Sanghyun Lee.',
        time: 'yesterday',
        sources: [
          { key: 'gmail', label: 'Quote · Jul 22' },
          { key: 'calendar', label: 'Contract meeting' },
        ],
      },
    ],
  },
]

export default function Workspace({
  onExecuted,
  seedPrompt,
  onSeedConsumed,
}: {
  onExecuted: (summary: string, tool: ToolKey) => void
  seedPrompt?: string | null
  onSeedConsumed?: () => void
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeId, setActiveId] = useState(1)
  const thread = sessions.find(s => s.id === activeId)?.thread ?? []

  /** 활성 세션에 메시지 추가 + 첫 메시지로 세션 제목 자동 생성 */
  const pushMessages = (msgs: ThreadMessage[]) => {
    setSessions(ss =>
      ss.map(s => {
        if (s.id !== activeId) return s
        const firstMe = !s.titled && msgs.find(m => m.from === 'me')
        return {
          ...s,
          thread: [...s.thread, ...msgs],
          title: firstMe ? firstMe.text.slice(0, 18) + (firstMe.text.length > 18 ? '…' : '') : s.title,
          titled: s.titled || !!firstMe,
        }
      }),
    )
  }

  const newSession = () => {
    const id = nextId()
    setSessions(ss => [{ id, title: 'New session', titled: false, thread: [] }, ...ss])
    setActiveId(id)
    clearAll()
  }
  const [input, setInput] = useState('')
  const [detected, setDetected] = useState<Detected | null>(null)
  const [forced, setForced] = useState<Intent | null>(null)
  const [draft, setDraft] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [running, setRunning] = useState(false)
  const [phIndex, setPhIndex] = useState(0)
  const [demoKey, setDemoKey] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const demoToken = useRef(0)

  // 최신 상태를 데모 러너에서 읽기 위한 ref
  const stateRef = useRef({ detected, forced, draft, input })
  stateRef.current = { detected, forced, draft, input }

  useEffect(() => {
    if (forced) return
    const t = setTimeout(() => {
      const next = detect(input, memberSchedules)
      setDetected(prev => {
        if (!next) return null
        const changed =
          !prev ||
          prev.kind !== next.kind ||
          (prev.kind === 'action' && next.kind === 'action' && prev.intent.draft !== next.intent.draft)
        if (changed) {
          if (next.kind === 'action') setDraft(next.intent.draft)
          setDismissed(false)
          return next
        }
        return prev
      })
    }, 180)
    return () => clearTimeout(t)
  }, [input, forced])

  useEffect(() => {
    if (input) return
    const t = setInterval(() => setPhIndex(i => (i + 1) % PLACEHOLDERS.length), 4000)
    return () => clearInterval(t)
  }, [input])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [thread])

  const actionIntent: Intent | null = forced ?? (detected?.kind === 'action' && !dismissed ? detected.intent : null)
  const answer: AvailabilityAnswer | null =
    !forced && detected?.kind === 'availability' && !dismissed ? detected : null
  const conflict: ConflictAnswer | null = !forced && detected?.kind === 'conflict' && !dismissed ? detected : null
  const showActionCard = actionIntent !== null && (forced !== null || input.trim().length > 0)
  const thinking = input.trim().length > 0 && !showActionCard && !answer && !conflict
  const anyCard = showActionCard || !!answer || !!conflict
  const dotClass = running || thinking ? 'agent-dot--thinking' : anyCard ? 'agent-dot--ready' : ''

  // 고스트 자동완성 — 입력 접두어와 일치하는 제안의 나머지를 섀도로 보여주고 Tab으로 완성
  const ghost = useMemo(() => {
    const t = input
    if (t.trim().length < 2 || t.includes('\n')) return ''
    const m = SUGGESTIONS.find(s => s.toLowerCase().startsWith(t.toLowerCase()) && s.length > t.length)
    return m ? m.slice(t.length) : ''
  }, [input])

  const clearAll = () => {
    setInput('')
    setDetected(null)
    setForced(null)
    setRunning(false)
  }

  const execute = () => {
    const intent = stateRef.current.forced ?? (stateRef.current.detected?.kind === 'action' ? stateRef.current.detected.intent : null)
    if (!intent || running) return
    setRunning(true)
    const userText = stateRef.current.input.trim() || intent.title
    const finalDraft = stateRef.current.draft
    setTimeout(() => {
      pushMessages([
        { id: nextId(), from: 'me', text: userText, time: 'now' },
        {
          id: nextId(),
          from: 'agent',
          text: finalDraft,
          time: 'now',
          tool: intent.tool.key,
          toolNote: `${intent.tool.name} · ${intent.target} · Done`,
        },
      ])
      onExecuted(intent.title, intent.tool.key)
      clearAll()
    }, 800)
  }

  const chain = (tool: 'calendar' | 'slack') => {
    const a = stateRef.current.detected
    if (a?.kind !== 'availability' || !a.best) return
    const next = slotToAction(tool, a.best, a.members.map(m => m.name))
    setForced(next)
    setDraft(next.draft)
  }

  const resolveConflict = (source: 'erp' | 'drive') => {
    const c = stateRef.current.detected
    if (c?.kind !== 'conflict') return
    const next = conflictToAction(c, source)
    setForced(next)
    setDraft(next.draft)
  }

  const sendPlain = () => {
    if (!input.trim()) return
    pushMessages([
      { id: nextId(), from: 'me', text: input.trim(), time: 'now' },
      { id: nextId(), from: 'agent', text: 'Got it — pulling the relevant data together for you.', time: 'now' },
    ])
    setInput('')
  }

  /* ---------- 데모 러너 ---------- */

  const cancelDemo = () => {
    demoToken.current++
    setDemoKey(null)
  }

  const typeIn = async (text: string, token: number, speed = 34) => {
    // 백그라운드 탭은 타이머가 1초로 클램프되므로 즉시 입력한다
    if (document.hidden) {
      if (demoToken.current !== token) return false
      setInput(text)
      return true
    }
    for (let i = 1; i <= text.length; i++) {
      if (demoToken.current !== token) return false
      setInput(text.slice(0, i))
      await new Promise(r => setTimeout(r, speed + Math.random() * 30))
    }
    return true
  }

  /** 문장을 컴포저에 자동 타이핑 — 빈 세션 제안 칩·홈 브리핑·⌘K가 모두 이 경로를 쓴다 */
  const runSeed = (text: string, after?: () => void) => {
    const token = ++demoToken.current
    setDemoKey(null)
    clearAll()
    ;(async () => {
      if (!document.hidden) await new Promise(r => setTimeout(r, 300))
      await typeIn(text, token, 22)
      after?.()
    })()
  }

  // 홈 브리핑·⌘K에서 넘어온 요청
  useEffect(() => {
    if (!seedPrompt) return
    runSeed(seedPrompt, onSeedConsumed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPrompt])

  const runDemo = async (key: string) => {
    const scenario = SCENARIOS.find(s => s.key === key)
    if (!scenario) return
    const token = ++demoToken.current
    const alive = () => demoToken.current === token
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    clearAll()
    setDemoKey(key)
    await sleep(400)

    for (const step of scenario.steps) {
      if (!alive()) return
      if (step.t === 'type') {
        if (!(await typeIn(step.text, token))) return
      } else if (step.t === 'wait') {
        await sleep(step.ms)
      } else if (step.t === 'agentReply') {
        const userText = stateRef.current.input
        pushMessages([
          { id: nextId(), from: 'me', text: userText, time: 'now' },
          { id: nextId(), from: 'agent', text: aqaraBriefing.text, time: 'now', sources: aqaraBriefing.sources },
        ])
        setInput('')
        setDetected(null)
      } else if (step.t === 'chain') {
        chain(step.tool)
      } else if (step.t === 'resolve') {
        resolveConflict(step.source)
      } else if (step.t === 'run') {
        execute()
        await sleep(1000)
      }
    }
    if (alive()) setDemoKey(null)
  }

  return (
    <div className="flex-1 min-h-0 flex gap-5" onKeyDown={e => e.key === 'Escape' && setDismissed(true)}>
      {/* 세션 레일 — 컨텍스트별로 대화를 나눈다 */}
      <aside className="w-52 shrink-0 hidden lg:flex flex-col pt-1">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[13px] font-bold text-[var(--m3-on-surface-variant)]">Sessions</span>
          <button
            onClick={newSession}
            aria-label="New session"
            className="w-7 h-7 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)] transition-colors"
          >
            <IconAddRegular width={16} height={16} />
          </button>
        </div>
        <div className="space-y-1 overflow-y-auto">
          {sessions.map(s => {
            const active = s.id === activeId
            const last = s.thread[s.thread.length - 1]
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveId(s.id)
                  clearAll()
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                  active ? 'bg-[var(--m3-surface-container-lowest)] shadow-[0_1px_2px_rgba(0,0,0,.05)]' : 'hover:bg-[var(--m3-surface-container)]'
                }`}
              >
                <span className={`block text-[13px] truncate ${active ? 'font-bold' : 'font-medium'}`}>{s.title}</span>
                <span className="block text-[11px] text-[var(--m3-on-surface-variant)] truncate mt-0.5">
                  {last ? last.text.replace(/\n/g, ' ').slice(0, 26) : 'No messages yet'}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <Card className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="px-5 h-14 shrink-0 flex items-center justify-between border-b border-[var(--m3-outline-variant)]">
          <div className="flex items-center gap-2.5">
            <span className={`agent-dot w-2.5 h-2.5 ${dotClass}`} aria-hidden />
            <span className="font-bold">Ops workspace</span>
            <span className="text-xs text-[var(--m3-on-surface-variant)]">Your team sees this session too</span>
          </div>
          <div className="flex items-center">
            <div className="flex -space-x-1.5 mr-2">
              {teammates.map(t => (
                <div
                  key={t.name}
                  title={`${t.name} — viewing`}
                  className="w-6.5 h-6.5 rounded-full grid place-items-center text-[11px] font-semibold text-white ring-2 ring-[var(--m3-surface-container-lowest)]"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name[0]}
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs text-[var(--m3-on-surface-variant)]">
              <IconUserGroupRegular width={14} height={14} /> 3 online
            </span>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {thread.length === 0 ? (
            <EmptyState onPick={runSeed} />
          ) : (
            <>
              <div className="text-center">
                <span className="text-xs text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-lg px-3 py-1">
                  Thursday, July 31
                </span>
              </div>
              {thread.map(m => (
                <Bubble key={m.id} m={m} />
              ))}
            </>
          )}
        </div>

        <footer className="px-4 pb-4 pt-1 space-y-2.5">
          {/* 가용 시간 즉답 카드 */}
          <AnimatePresence>
            {answer && (
              <motion.section
                key="answer"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: effect }}
                transition={spatialExpressive}
                className="rounded-2xl bg-[var(--m3-surface-container-lowest)] shadow-[0_8px_32px_rgba(0,0,0,.14)]"
                aria-label="Availability answer"
              >
                <div className="rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="w-7 h-7 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center">
                      <IconCalendarRegular width={15} height={15} />
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-bold">
                        {answer.best ? (
                          <>
                            Everyone is free tomorrow{' '}
                            <span className="text-[var(--m3-primary)]">{fmtHour(answer.best.start)}–{fmtHour(answer.best.end)}</span>
                          </>
                        ) : (
                          'No slot works for everyone tomorrow'
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--m3-on-surface-variant)]">
                        Checked {answer.members.length} calendars while you typed
                      </div>
                    </div>
                  </div>

                  <Timeline answer={answer} />

                  <div className="flex items-center gap-2 mt-3.5">
                    {answer.alt && (
                      <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                        Backup: {fmtHour(answer.alt.start)}–{fmtHour(answer.alt.end)} ({answer.alt.free}/{answer.alt.total} free)
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <ActionButton size="small" variant="neutralWeak" onClick={() => setDismissed(true)}>
                        Dismiss
                      </ActionButton>
                      <ActionButton size="small" variant="neutralOutline" onClick={() => chain('slack')} disabled={!answer.best}>
                        Draft team notice
                      </ActionButton>
                      <ActionButton size="small" variant="brandSolid" onClick={() => chain('calendar')} disabled={!answer.best}>
                        Book this slot
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 상충 해소 카드 — Source of Truth */}
          <AnimatePresence>
            {conflict && (
              <motion.section
                key="conflict"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: effect }}
                transition={spatialExpressive}
                className="rounded-2xl bg-[var(--m3-surface-container-lowest)] shadow-[0_8px_32px_rgba(0,0,0,.14)]"
                aria-label="Source conflict"
              >
                <div className="rounded-2xl p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] grid place-items-center">
                      <IconWarningRegular width={15} height={15} />
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-bold">{conflict.item}</div>
                      <div className="text-[11px] text-[var(--m3-on-surface-variant)]">{conflict.question}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {conflict.options.map(o => (
                      <button
                        key={o.source}
                        onClick={() => resolveConflict(o.source)}
                        className="text-left rounded-xl border border-[var(--m3-outline-variant)] hover:border-[var(--m3-primary)] hover:bg-[var(--m3-surface-container-low)] transition-colors p-3 flex items-start gap-2.5"
                      >
                        <SourceBadge source={o.source} size={30} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold">{o.label}</span>
                          <span className="block text-lg font-bold tabular-nums leading-tight mt-0.5">{o.value}</span>
                          <span className="block text-[11px] text-[var(--m3-on-surface-variant)] mt-0.5">{o.asOf}</span>
                        </span>
                        {o.recommended && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)] shrink-0">
                            Suggested
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center mt-3">
                    <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                      Your choice is saved and auto-applied to future conflicts
                    </span>
                    <div className="ml-auto">
                      <ActionButton size="small" variant="neutralWeak" onClick={() => setDismissed(true)}>
                        Dismiss
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 실행 카드 */}
          <AnimatePresence>
            {showActionCard && actionIntent && (
              <motion.section
                key={actionIntent.tool.key + actionIntent.title}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: effect }}
                transition={spatialExpressive}
                className="rounded-2xl overflow-hidden border bg-[var(--m3-surface-container-lowest)]"
                style={{
                  borderColor: actionIntent.tool.color,
                  boxShadow: `0 8px 32px ${actionIntent.tool.color}2e`,
                }}
                aria-label="Run preview"
              >
                <div className="flex items-center gap-2.5 px-4 py-2.5 text-white" style={{ backgroundColor: actionIntent.tool.color }}>
                  <span className="w-6 h-6 rounded-md bg-white grid place-items-center" style={{ color: actionIntent.tool.color }}>
                    {actionIntent.tool.logo}
                  </span>
                  <span className="text-sm font-bold">{actionIntent.title}</span>
                  <span className="text-xs opacity-80">{actionIntent.target}</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[11px] opacity-90">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    />
                    {forced ? 'Built from the confirmed basis' : 'Prepared while you typed'}
                  </span>
                </div>
                <div className="p-3.5 space-y-3">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={Math.min(7, Math.max(2, draft.split('\n').length))}
                    className="w-full resize-none rounded-xl bg-[var(--m3-surface-container)] px-3.5 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[var(--m3-primary)]"
                    aria-label="Draft to run"
                  />
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--m3-on-surface-variant)]">
                      <IconLockRegular width={13} height={13} />
                      Nothing is sent until you run it · your edits teach the next draft
                    </span>
                    <div className="ml-auto flex gap-2">
                      <ActionButton
                        size="small"
                        variant="neutralWeak"
                        onClick={() => (forced ? setForced(null) : setDismissed(true))}
                        disabled={running}
                      >
                        {forced ? 'Back' : 'Dismiss'}
                      </ActionButton>
                      <ActionButton size="small" variant="brandSolid" onClick={execute} loading={running}>
                        {actionIntent.tool.actionLabel}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 컴포저 */}
          <div
            className={`relative flex items-end gap-2 rounded-2xl border bg-[var(--m3-surface-container-lowest)] px-4 py-2.5 transition-[border-color,box-shadow] duration-200 ${
              showActionCard || answer || conflict
                ? 'border-[var(--m3-primary)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--m3-primary)_14%,transparent)]'
                : 'border-[var(--m3-outline-variant)] focus-within:border-[var(--m3-outline)]'
            }`}
          >
            {thinking && <span className="progress-line" aria-hidden />}
            <div className="relative flex-1">
              <textarea
                value={input}
                onChange={e => {
                  cancelDemo()
                  setInput(e.target.value)
                  if (forced) setForced(null)
                }}
                onKeyDown={e => {
                  if (e.key === 'Tab' && !e.shiftKey && ghost) {
                    e.preventDefault()
                    cancelDemo()
                    setInput(input + ghost)
                    return
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (showActionCard) execute()
                    else if (!answer && !conflict) sendPlain()
                  }
                }}
                rows={1}
                className="w-full resize-none outline-none text-[15px] leading-6 bg-transparent max-h-32"
                aria-label="Message input"
              />
              {ghost && (
                <div className="absolute inset-0 pointer-events-none text-[15px] leading-6 whitespace-pre-wrap break-words" aria-hidden>
                  <span className="invisible">{input}</span>
                  <span className="text-[var(--m3-on-surface-variant)] opacity-60">{ghost}</span>
                </div>
              )}
              {!input && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={effect}
                    className="absolute inset-0 pointer-events-none text-[15px] leading-6 text-[var(--m3-on-surface-variant)] truncate"
                  >
                    {PLACEHOLDERS[phIndex]}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
            <motion.button
              onClick={showActionCard ? execute : sendPlain}
              aria-label="Send"
              whileTap={{ scale: 0.92 }}
              className={`w-8 h-8 shrink-0 rounded-full grid place-items-center transition-colors ${
                input.trim() || showActionCard
                  ? 'bg-[var(--m3-primary)] text-[var(--m3-on-primary)]'
                  : 'bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)]'
              }`}
            >
              <IconChattingSendRegular width={15} height={15} />
            </motion.button>
          </div>
          <div className="flex items-center justify-between px-1 text-[11px] text-[var(--m3-on-surface-variant)]">
            <span className="flex items-center gap-1.5">
              Demo:
              {SCENARIOS.map(s => (
                <button
                  key={s.key}
                  onClick={() => runDemo(s.key)}
                  className={`px-2 py-0.5 rounded-lg transition-colors ${
                    demoKey === s.key
                      ? 'bg-[var(--m3-primary)] text-[var(--m3-on-primary)]'
                      : 'bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)]'
                  }`}
                >
                  {demoKey === s.key ? `Playing ${s.label}…` : s.label}
                </button>
              ))}
            </span>
            <span>Connected: Slack · Notion · Gmail · Calendar · ERP</span>
          </div>
        </footer>
      </Card>

      {/* 컨텍스트 패널 */}
      <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3">Context in this session</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ['calendar', '4 team calendars (live)'],
              ['slack', '#logistics-ops · #design-team'],
              ['gmail', '9 Aqara Life threads'],
              ['notion', 'PoC roadmap · meeting notes'],
            ].map(([k, label]) => {
              const tool = TOOLS[k as keyof typeof TOOLS]
              return (
                <li key={k} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md border border-[var(--m3-outline-variant)] grid place-items-center" style={{ color: tool.color }}>
                    {tool.logo}
                  </span>
                  <span className="text-[13px]">{label}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 pt-3 border-t border-[var(--m3-outline-variant)] text-[11px] text-[var(--m3-on-surface-variant)] leading-relaxed">
            Search covers only what you can access. Documents outside your permissions are never revealed to exist.
          </p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-bold mb-3">Recent runs</h3>
          <ul className="space-y-2.5">
            {[
              ['Sent Aqara Life quote', 'yesterday'],
              ['Filed weekly minutes to Notion', 'yesterday'],
              ['Sent order-deadline reminder', 'Monday'],
            ].map(([t, when]) => (
              <li key={t} className="flex items-start gap-2 text-[13px]">
                <IconCheckRegular width={14} height={14} className="mt-0.5 shrink-0 text-[var(--m3-primary)]" />
                <span className="flex-1">{t}</span>
                <span className="text-[11px] text-[var(--m3-on-surface-variant)] flex items-center gap-0.5">
                  <IconClockRegular width={11} height={11} />
                  {when}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  )
}

/** 빈 세션의 기본 화면 — 오브 + 제안. 무엇을 할 수 있는지 바로 보여준다 */
function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 pb-10">
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spatialExpressive}
        className="w-14 h-14 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center"
        aria-hidden
      >
        <IconCheckFlowerRegular width={26} height={26} />
      </motion.span>
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.06 }}
          className="text-xl font-bold tracking-tight"
        >
          What can I help with?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.12 }}
          className="text-[13px] text-[var(--m3-on-surface-variant)] mt-1.5"
        >
          Connected to your company data · anything outbound is always previewed before it runs
        </motion.p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {briefing.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spatialExpressive, delay: 0.16 + i * 0.05 }}
            onClick={() => onPick(b.prompt)}
            className="text-[13px] px-3.5 py-2 rounded-xl bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] transition-colors"
          >
            {b.prompt}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 가용 시간 타임라인 ---------- */

function Timeline({ answer }: { answer: AvailabilityAnswer }) {
  const { dayStart, dayEnd, members, best } = answer
  const span = dayEnd - dayStart
  const pct = (t: number) => `${((t - dayStart) / span) * 100}%`
  const width = (s: number, e: number) => `${((e - s) / span) * 100}%`

  return (
    <div className="relative">
      <div className="space-y-1.5">
        {members.map((m, mi) => (
          <div key={m.name} className="flex items-center gap-2.5">
            <span className="w-8 text-[11px] text-[var(--m3-on-surface-variant)] shrink-0 text-right">{m.name}</span>
            <div className="relative flex-1 h-4 rounded-full bg-[var(--m3-surface-container)] overflow-hidden">
              {m.busy.map(([s, e], i) => (
                <motion.span
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ ...effect, delay: 0.06 * mi + 0.03 * i }}
                  className="absolute top-1 bottom-1 rounded-full origin-left"
                  style={{ left: pct(s), width: width(s, e), backgroundColor: `${m.color}55` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {best && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...effect, delay: 0.35 }}
          className="absolute -top-1 -bottom-1 rounded-lg slot-band pointer-events-none"
          style={{
            left: `calc(2.625rem + (100% - 2.625rem) * ${(best.start - dayStart) / span})`,
            width: `calc((100% - 2.625rem) * ${(best.end - best.start) / span})`,
          }}
        />
      )}
      <div className="flex justify-between pl-[2.625rem] mt-1.5 text-[10px] text-[var(--m3-on-surface-variant)] tabular-nums">
        {Array.from({ length: 5 }, (_, i) => dayStart + (span / 4) * i).map(h => (
          <span key={h}>{Math.round(h)}:00</span>
        ))}
      </div>
    </div>
  )
}

function SourceChips({ sources }: { sources: { key: SourceKey; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sources.map(s => (
        <span
          key={s.label}
          className="flex items-center gap-1.5 text-[11px] text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-full pl-1 pr-2.5 py-1"
        >
          {s.key === 'wiki' ? (
            <span className="agent-dot w-3 h-3" aria-hidden />
          ) : (
            <SourceBadge source={s.key} size={18} />
          )}
          {s.label}
        </span>
      ))}
    </div>
  )
}

function Bubble({ m }: { m: ThreadMessage }) {
  const mine = m.from === 'me'
  const tool = m.tool ? TOOLS[m.tool] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spatialExpressive}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className="max-w-[72%]">
        {tool && m.toolNote && (
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[var(--m3-on-surface-variant)]">
            <span className="w-4 h-4 grid place-items-center" style={{ color: tool.color }}>
              {tool.logo}
            </span>
            {m.toolNote}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
            mine
              ? 'bg-[var(--m3-primary)] text-[var(--m3-on-primary)] rounded-tr-md'
              : tool
                ? 'bg-[var(--m3-surface-container-lowest)] border rounded-tl-md'
                : 'bg-[var(--m3-surface-container)] rounded-tl-md'
          }`}
          style={tool ? { borderColor: tool.color } : undefined}
        >
          {m.text}
          {!mine && m.sources && <SourceChips sources={m.sources} />}
        </div>
        <div className={`text-[11px] text-[var(--m3-on-surface-variant)] mt-1 ${mine ? 'text-right' : ''}`}>{m.time}</div>
      </div>
    </motion.div>
  )
}
