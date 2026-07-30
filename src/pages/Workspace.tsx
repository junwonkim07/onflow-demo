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
  IconSearchRegular,
  IconExpandMoreRegular,
  IconReviewStarRegular,
  IconMoreHorizRegular,
  IconMoonRegular,
  IconHomeRegular,
  IconChattingRegular,
  IconWriteRegular,
  IconListRegular,
  IconMyProfileRegular,
  IconChartRegular,
  IconAddCircleRegular,
  IconBookmarkRegular,
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
import { initialThread, teammates, memberSchedules, aqaraBriefing, briefing, asset, type ThreadMessage, type SourceKey } from '../data'
import { SourceBadge } from '../components/ui'
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

/** 메시지·세션 ID — Date.now() 충돌 방지용 단조 카운터 */
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
      {
        id: 1,
        from: 'me',
        text: 'Site photo from yesterday’s pilot install — lock placement look right to you?',
        time: 'yesterday',
        image: 'img/smarthome.jpg',
      },
      {
        id: 2,
        from: 'agent',
        text: 'Matches the spec in their install guide (handle-side, 1.2m). I’d attach this to the PoC report.\n\nOn commercials: quote sent — annual maintenance + monthly operations subscription. Only the contract meeting is left. Owner: Sanghyun Lee.',
        time: 'yesterday',
        sources: [
          { key: 'gmail', label: 'Quote · Jul 22' },
          { key: 'calendar', label: 'Contract meeting' },
          { key: 'notion', label: 'Install guide v2' },
        ],
      },
    ],
  },
]

const AVATAR_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

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
  const activeSession = sessions.find(s => s.id === activeId)

  const [input, setInput] = useState('')
  const [detected, setDetected] = useState<Detected | null>(null)
  const [forced, setForced] = useState<Intent | null>(null)
  const [draft, setDraft] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [running, setRunning] = useState(false)
  const [phIndex, setPhIndex] = useState(0)
  const [demoKey, setDemoKey] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<'details' | 'copilot'>('copilot')
  const [copilotQ, setCopilotQ] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const demoToken = useRef(0)

  const stateRef = useRef({ detected, forced, draft, input })
  stateRef.current = { detected, forced, draft, input }

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

  /** 문장을 컴포저에 자동 타이핑 — 제안 칩·홈 브리핑·⌘K·Copilot이 모두 이 경로를 쓴다 */
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

  // Copilot 패널용: 마지막 질문/답변
  const lastMe = [...thread].reverse().find(m => m.from === 'me')
  const lastAgent = [...thread].reverse().find(m => m.from === 'agent')

  return (
    <div
      className="flex-1 min-h-0 flex rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] shadow-[0_1px_2px_rgba(0,0,0,.03)] overflow-hidden text-[13px]"
      onKeyDown={e => e.key === 'Escape' && setDismissed(true)}
    >
      {/* ── Col 1: Inbox nav ─────────────────────── */}
      <aside className="w-52 shrink-0 hidden lg:flex flex-col border-r border-[var(--m3-outline-variant)]">
        <div className="h-12 shrink-0 flex items-center justify-between px-3.5">
          <span className="text-[15px] font-bold">Inbox</span>
          <span className="flex items-center gap-0.5 text-[var(--m3-on-surface-variant)]">
            <button className="w-7 h-7 rounded-lg grid place-items-center hover:bg-[var(--m3-surface-container)]" aria-label="Search inbox">
              <IconSearchRegular width={15} height={15} />
            </button>
            <button onClick={newSession} className="w-7 h-7 rounded-lg grid place-items-center hover:bg-[var(--m3-surface-container)]" aria-label="New session">
              <IconAddRegular width={15} height={15} />
            </button>
          </span>
        </div>
        <div className="px-2 space-y-px overflow-y-auto">
          <NavRow Icon={IconHomeRegular} label="Your inbox" count={sessions.length} active />
          <NavRow Icon={IconChattingRegular} label="Mentions" count={3} />
          <NavRow Icon={IconWriteRegular} label="Created by you" count={0} />
          <NavRow Icon={IconListRegular} label="All" count={2370} />
          <NavRow Icon={IconMyProfileRegular} label="Unassigned" count={0} />
          <NavRow Icon={IconChartRegular} label="Dashboard" />
          <div className="pt-3 pb-1 px-2 text-[11px] font-semibold text-[var(--m3-on-surface-variant)] flex items-center justify-between">
            Views <IconExpandMoreRegular width={12} height={12} />
          </div>
          <div className="border-l border-[var(--m3-outline-variant)] ml-3.5 pl-1 space-y-px">
            {['Customer Support', 'Account Management', 'Product Questions', 'Feedback & Requests'].map(v => (
              <button key={v} className="w-full text-left px-2 py-1 rounded-md text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)] truncate">
                {v}
              </button>
            ))}
          </div>
          <div className="pt-2">
            <NavRow Icon={IconCheckFlowerRegular} label="Onflow AI Agent" chevron />
          </div>
        </div>
        <div className="flex-1" />
        <div className="px-3.5 py-3 text-[11px] text-[var(--m3-on-surface-variant)] border-t border-[var(--m3-outline-variant)]">
          Demo:{' '}
          {SCENARIOS.map(s => (
            <button
              key={s.key}
              onClick={() => runDemo(s.key)}
              className={`mr-1 underline-offset-2 ${demoKey === s.key ? 'font-bold text-[var(--m3-on-surface)]' : 'hover:underline'}`}
            >
              {demoKey === s.key ? `${s.label}…` : s.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Col 2: Session list ──────────────────── */}
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-[var(--m3-outline-variant)]">
        <div className="h-12 shrink-0 flex items-center justify-between px-3.5 border-b border-[var(--m3-outline-variant)]">
          <button className="flex items-center gap-1 font-semibold">
            {sessions.length} Open <IconExpandMoreRegular width={13} height={13} className="text-[var(--m3-on-surface-variant)]" />
          </button>
          <button className="flex items-center gap-1 text-[var(--m3-on-surface-variant)]">
            Newest <IconExpandMoreRegular width={13} height={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {sessions.map((s, i) => {
            const active = s.id === activeId
            const last = s.thread[s.thread.length - 1]
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveId(s.id)
                  clearAll()
                }}
                className={`w-full text-left flex gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors ${
                  active ? 'bg-[var(--m3-surface-container)]' : 'hover:bg-[var(--m3-surface-container-low)]'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full shrink-0 grid place-items-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {s.title[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate ${active ? 'font-bold' : 'font-semibold'}`}>{s.title}</span>
                    <span className="text-[11px] text-[var(--m3-on-surface-variant)] shrink-0">{last?.time === 'now' ? '1m' : last?.time ?? ''}</span>
                  </span>
                  <span className="block text-[12px] text-[var(--m3-on-surface-variant)] truncate mt-0.5">
                    {last ? last.text.replace(/\n/g, ' ').slice(0, 32) : 'No messages yet'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Col 3: Conversation ──────────────────── */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 flex items-center gap-1 px-4 border-b border-[var(--m3-outline-variant)]">
          <span className={`agent-dot w-2 h-2 mr-1.5 ${dotClass}`} aria-hidden />
          <span className="font-bold text-[15px] truncate">{activeSession?.title ?? 'Session'}</span>
          <div className="flex-1" />
          <div className="flex -space-x-1 mr-1.5">
            {teammates.map(t => (
              <img
                key={t.name}
                src={asset(t.avatar)}
                alt={`${t.name} — viewing`}
                title={`${t.name} — viewing`}
                className="w-6 h-6 rounded-full object-cover ring-2 ring-[var(--m3-surface-container-lowest)]"
              />
            ))}
          </div>
          {[IconReviewStarRegular, IconMoreHorizRegular, IconMoonRegular].map((I, i) => (
            <button key={i} className="w-8 h-8 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]">
              <I width={16} height={16} />
            </button>
          ))}
          <button className="ml-1 h-7 px-3 rounded-full bg-[var(--seed-color-bg-brand-solid)] text-white text-[12px] font-bold flex items-center gap-1">
            <IconCheckRegular width={13} height={13} /> Close
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {thread.length === 0 ? (
            <EmptyState onPick={runSeed} />
          ) : (
            <>
              <div className="text-center">
                <span className="text-[11px] text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-lg px-2.5 py-1">
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
          {/* 즉답 카드 */}
          <AnimatePresence>
            {answer && (
              <motion.section
                key="answer"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: effect }}
                transition={spatialExpressive}
                className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] shadow-[0_8px_28px_rgba(0,0,0,.10)]"
                aria-label="Availability answer"
              >
                <div className="p-3.5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center">
                      <IconCalendarRegular width={15} height={15} />
                    </span>
                    <div className="leading-tight">
                      <div className="font-bold">
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
                  <div className="flex items-center gap-2 mt-3">
                    {answer.alt && (
                      <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                        Backup: {fmtHour(answer.alt.start)}–{fmtHour(answer.alt.end)} ({answer.alt.free}/{answer.alt.total} free)
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <ActionButton size="xsmall" variant="neutralWeak" onClick={() => setDismissed(true)}>
                        Dismiss
                      </ActionButton>
                      <ActionButton size="xsmall" variant="neutralOutline" onClick={() => chain('slack')} disabled={!answer.best}>
                        Draft team notice
                      </ActionButton>
                      <ActionButton size="xsmall" variant="brandSolid" onClick={() => chain('calendar')} disabled={!answer.best}>
                        Book this slot
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 상충 카드 */}
          <AnimatePresence>
            {conflict && (
              <motion.section
                key="conflict"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, transition: effect }}
                transition={spatialExpressive}
                className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] shadow-[0_8px_28px_rgba(0,0,0,.10)]"
                aria-label="Source conflict"
              >
                <div className="p-3.5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] grid place-items-center">
                      <IconWarningRegular width={15} height={15} />
                    </span>
                    <div className="leading-tight">
                      <div className="font-bold">{conflict.item}</div>
                      <div className="text-[11px] text-[var(--m3-on-surface-variant)]">{conflict.question}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {conflict.options.map(o => (
                      <button
                        key={o.source}
                        onClick={() => resolveConflict(o.source)}
                        className="text-left rounded-lg border border-[var(--m3-outline-variant)] hover:border-[var(--m3-outline)] hover:bg-[var(--m3-surface-container-low)] transition-colors p-2.5 flex items-start gap-2.5"
                      >
                        <SourceBadge source={o.source} size={28} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold">{o.label}</span>
                          <span className="block text-[16px] font-bold tabular-nums leading-tight mt-0.5">{o.value}</span>
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
                  <div className="flex items-center mt-2.5">
                    <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                      Your choice is saved and auto-applied to future conflicts
                    </span>
                    <div className="ml-auto">
                      <ActionButton size="xsmall" variant="neutralWeak" onClick={() => setDismissed(true)}>
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
                className="rounded-xl overflow-hidden border bg-[var(--m3-surface-container-lowest)]"
                style={{
                  borderColor: actionIntent.tool.color,
                  boxShadow: `0 8px 28px ${actionIntent.tool.color}26`,
                }}
                aria-label="Run preview"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2 text-white" style={{ backgroundColor: actionIntent.tool.color }}>
                  <span className="w-5.5 h-5.5 rounded-md bg-white grid place-items-center" style={{ color: actionIntent.tool.color }}>
                    {actionIntent.tool.logo}
                  </span>
                  <span className="font-bold">{actionIntent.title}</span>
                  <span className="text-[11px] opacity-80">{actionIntent.target}</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] opacity-90">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    />
                    {forced ? 'Built from the confirmed basis' : 'Prepared while you typed'}
                  </span>
                </div>
                <div className="p-3 space-y-2.5">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={Math.min(7, Math.max(2, draft.split('\n').length))}
                    className="w-full resize-none rounded-lg bg-[var(--m3-surface-container)] px-3 py-2.5 leading-relaxed outline-none focus:ring-2 focus:ring-[var(--m3-primary)]"
                    aria-label="Draft to run"
                  />
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-[var(--m3-on-surface-variant)]">
                      <IconLockRegular width={12} height={12} />
                      Nothing is sent until you run it · your edits teach the next draft
                    </span>
                    <div className="ml-auto flex gap-2">
                      <ActionButton
                        size="xsmall"
                        variant="neutralWeak"
                        onClick={() => (forced ? setForced(null) : setDismissed(true))}
                        disabled={running}
                      >
                        {forced ? 'Back' : 'Dismiss'}
                      </ActionButton>
                      <ActionButton size="xsmall" variant="brandSolid" onClick={execute} loading={running}>
                        {actionIntent.tool.actionLabel}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Reply 컴포저 — 인터콤 포맷 */}
          <div
            className={`relative rounded-xl border bg-[var(--m3-surface-container-lowest)] shadow-[0_1px_2px_rgba(0,0,0,.03)] transition-colors ${
              anyCard ? 'border-[var(--m3-outline)]' : 'border-[var(--m3-outline-variant)] focus-within:border-[var(--m3-outline)]'
            }`}
          >
            {thinking && <span className="progress-line" aria-hidden />}
            <div className="flex items-center gap-1 px-3.5 pt-2.5 text-[12px] font-semibold">
              Reply <IconExpandMoreRegular width={12} height={12} className="text-[var(--m3-on-surface-variant)]" />
            </div>
            <div className="relative px-3.5 py-2">
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
                rows={2}
                className="w-full resize-none outline-none text-[13px] leading-6 bg-transparent max-h-32"
                aria-label="Message input"
              />
              {ghost && (
                <div className="absolute inset-0 px-3.5 py-2 pointer-events-none text-[13px] leading-6 whitespace-pre-wrap break-words" aria-hidden>
                  <span className="invisible">{input}</span>
                  <span className="text-[var(--m3-on-surface-variant)] opacity-35">{ghost}</span>
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
                    className="absolute inset-0 px-3.5 py-2 pointer-events-none text-[13px] leading-6 text-[var(--m3-on-surface-variant)] truncate"
                  >
                    {PLACEHOLDERS[phIndex]}
                  </motion.span>
                </AnimatePresence>
              )}
            </div>
            <div className="flex items-center gap-0.5 px-2.5 pb-2.5">
              {[IconAddCircleRegular, IconBookmarkRegular, IconWriteRegular, IconCheckFlowerRegular].map((I, i) => (
                <button key={i} className="w-7 h-7 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]">
                  <I width={15} height={15} />
                </button>
              ))}
              <span className="flex-1 text-right pr-2 text-[10px] text-[var(--m3-on-surface-variant)]">
                {ghost ? 'Tab to complete' : showActionCard ? 'Enter runs the card' : ''}
              </span>
              <button
                onClick={showActionCard ? execute : sendPlain}
                className="h-8 rounded-lg bg-[var(--seed-color-bg-brand-solid)] text-white text-[12px] font-bold flex items-center overflow-hidden"
              >
                <span className="px-3.5">{showActionCard ? 'Run' : 'Send'}</span>
                <span className="w-px self-stretch bg-white/25" />
                <span className="px-1.5 grid place-items-center">
                  <IconExpandMoreRegular width={13} height={13} />
                </span>
              </button>
            </div>
          </div>
        </footer>
      </section>

      {/* ── Col 4: Details / Copilot ─────────────── */}
      <aside className="w-72 shrink-0 hidden xl:flex flex-col border-l border-[var(--m3-outline-variant)]">
        <div className="h-12 shrink-0 flex items-center gap-4 px-4 border-b border-[var(--m3-outline-variant)]">
          {(['details', 'copilot'] as const).map(t => (
            <button
              key={t}
              onClick={() => setRightTab(t)}
              className={`relative h-full text-[13px] font-semibold capitalize ${
                rightTab === t ? '' : 'text-[var(--m3-on-surface-variant)]'
              }`}
            >
              {t}
              {rightTab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ea580c] rounded-full" />}
            </button>
          ))}
        </div>

        {rightTab === 'copilot' ? (
          <div className="flex-1 min-h-0 flex flex-col p-4">
            {lastMe ? (
              <>
                <h3 className="font-bold text-[14px] leading-snug">{lastMe.text}</h3>
                {lastAgent && (
                  <>
                    <div className="mt-3 rounded-lg bg-[var(--m3-surface-container-low)] border border-[var(--m3-outline-variant)] p-3 text-[12.5px] leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto">
                      {lastAgent.text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <button
                        onClick={() => {
                          cancelDemo()
                          setInput(lastAgent.text)
                        }}
                        className="h-8 px-3 rounded-lg bg-[var(--seed-color-bg-brand-solid)] text-white text-[12px] font-bold flex items-center gap-1.5"
                      >
                        <IconWriteRegular width={13} height={13} /> Add to composer
                      </button>
                      <button className="w-8 h-8 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]">
                        <IconMoreHorizRegular width={15} height={15} />
                      </button>
                    </div>
                    <div className="mt-4 text-[12px] font-semibold text-[var(--m3-on-surface-variant)]">
                      {(lastAgent.sources?.length ?? 2)} relevant sources found
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {(lastAgent.sources ?? [
                        { key: 'notion' as SourceKey, label: 'Ops handbook · refunds' },
                        { key: 'wiki' as SourceKey, label: 'Internal SOP' },
                      ]).map(s => (
                        <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
                          {s.key === 'wiki' ? <span className="agent-dot w-3 h-3 mx-1" /> : <SourceBadge source={s.key} size={20} />}
                          <span className="truncate">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="m-auto text-center text-[var(--m3-on-surface-variant)] text-[12.5px]">
                Ask anything — answers come
                <br />
                with sources from company memory
              </div>
            )}
            <div className="flex-1" />
            {/* Ask a question — Fin 스타일 그라디언트 링 (인터콤 레퍼런스 예외) */}
            <div className="rounded-full p-[1.5px] bg-gradient-to-r from-violet-400/60 via-rose-300/60 to-amber-300/60">
              <div className="flex items-center gap-1 rounded-full bg-[var(--m3-surface-container-lowest)] pl-4 pr-1 py-1">
                <input
                  value={copilotQ}
                  onChange={e => setCopilotQ(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && copilotQ.trim()) {
                      runSeed(copilotQ.trim())
                      setCopilotQ('')
                    }
                  }}
                  placeholder="Ask a question"
                  className="flex-1 bg-transparent outline-none text-[13px] min-w-0"
                />
                <button
                  onClick={() => {
                    if (!copilotQ.trim()) return
                    runSeed(copilotQ.trim())
                    setCopilotQ('')
                  }}
                  aria-label="Ask"
                  className="w-7 h-7 rounded-full bg-[var(--seed-color-bg-brand-solid)] text-white grid place-items-center shrink-0"
                >
                  <IconChattingSendRegular width={13} height={13} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <h3 className="text-[12px] font-bold text-[var(--m3-on-surface-variant)] mb-2">CONTEXT IN THIS SESSION</h3>
              <ul className="space-y-2">
                {[
                  ['calendar', '4 team calendars (live)'],
                  ['slack', '#logistics-ops · #design-team'],
                  ['gmail', '9 Aqara Life threads'],
                  ['notion', 'PoC roadmap · meeting notes'],
                ].map(([k, label]) => {
                  const tool = TOOLS[k as keyof typeof TOOLS]
                  return (
                    <li key={k} className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-[var(--m3-surface-container)] grid place-items-center" style={{ color: tool.color }}>
                        {tool.logo}
                      </span>
                      <span>{label}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 pt-3 border-t border-[var(--m3-outline-variant)] text-[11px] text-[var(--m3-on-surface-variant)] leading-relaxed">
                Search covers only what you can access. Documents outside your permissions are never revealed to exist.
              </p>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-[var(--m3-on-surface-variant)] mb-2">RECENT RUNS</h3>
              <ul className="space-y-2">
                {[
                  ['Sent Aqara Life quote', 'yesterday'],
                  ['Filed weekly minutes to Notion', 'yesterday'],
                  ['Sent order-deadline reminder', 'Monday'],
                ].map(([t, when]) => (
                  <li key={t} className="flex items-start gap-2">
                    <IconCheckRegular width={13} height={13} className="mt-0.5 shrink-0 text-[var(--m3-primary)]" />
                    <span className="flex-1">{t}</span>
                    <span className="text-[11px] text-[var(--m3-on-surface-variant)] flex items-center gap-0.5">
                      <IconClockRegular width={10} height={10} />
                      {when}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--m3-on-surface-variant)]">
              <IconUserGroupRegular width={13} height={13} /> 3 teammates viewing this session
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ---------- Inbox nav row ---------- */

function NavRow({
  Icon,
  label,
  count,
  active,
  chevron,
}: {
  Icon: typeof IconHomeRegular
  label: string
  count?: number
  active?: boolean
  chevron?: boolean
}) {
  return (
    <button
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg ${
        active ? 'bg-[var(--m3-surface-container)] font-semibold' : 'hover:bg-[var(--m3-surface-container-low)]'
      }`}
    >
      <Icon width={15} height={15} className="text-[var(--m3-on-surface-variant)] shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && <span className="text-[11px] text-[var(--m3-on-surface-variant)] tabular-nums">{count}</span>}
      {chevron && <IconExpandMoreRegular width={12} height={12} className="text-[var(--m3-on-surface-variant)] -rotate-90" />}
    </button>
  )
}

/** 빈 세션의 기본 화면 */
function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 pb-10">
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spatialExpressive}
        className="w-12 h-12 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center"
        aria-hidden
      >
        <IconCheckFlowerRegular width={22} height={22} />
      </motion.span>
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.06 }}
          className="text-[17px] font-bold tracking-tight"
        >
          What can I help with?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spatialExpressive, delay: 0.12 }}
          className="text-[12px] text-[var(--m3-on-surface-variant)] mt-1"
        >
          Connected to your company data · anything outbound is always previewed before it runs
        </motion.p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
        {briefing.map((b, i) => (
          <motion.button
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spatialExpressive, delay: 0.16 + i * 0.05 }}
            onClick={() => onPick(b.prompt)}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] hover:bg-[var(--m3-surface-container-low)] transition-colors"
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
            <span className="w-11 text-[10px] text-[var(--m3-on-surface-variant)] shrink-0 text-right truncate">{m.name}</span>
            <div className="relative flex-1 h-3.5 rounded-full bg-[var(--m3-surface-container)] overflow-hidden">
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
            left: `calc(3.375rem + (100% - 3.375rem) * ${(best.start - dayStart) / span})`,
            width: `calc((100% - 3.375rem) * ${(best.end - best.start) / span})`,
          }}
        />
      )}
      <div className="flex justify-between pl-[3.375rem] mt-1 text-[10px] text-[var(--m3-on-surface-variant)] tabular-nums">
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
          className="flex items-center gap-1.5 text-[11px] text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-md pl-1 pr-2 py-0.5"
        >
          {s.key === 'wiki' ? (
            <span className="agent-dot w-2.5 h-2.5 mx-0.5" aria-hidden />
          ) : (
            <SourceBadge source={s.key} size={16} />
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
      className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      {!mine && (
        <span className="w-6 h-6 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center shrink-0 mb-4">
          <IconCheckFlowerRegular width={13} height={13} />
        </span>
      )}
      <div className="max-w-[75%]">
        {tool && m.toolNote && (
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-[var(--m3-on-surface-variant)]">
            <span className="w-4 h-4 grid place-items-center" style={{ color: tool.color }}>
              {tool.logo}
            </span>
            {m.toolNote}
          </div>
        )}
        {m.image && (
          <img
            src={asset(m.image)}
            alt="attachment"
            className={`rounded-xl border border-[var(--m3-outline-variant)] mb-1.5 max-w-[300px] max-h-52 object-cover ${mine ? 'ml-auto' : ''}`}
          />
        )}
        <div
          className={`rounded-xl px-3.5 py-2 leading-relaxed whitespace-pre-line ${
            mine
              ? 'bg-[var(--seed-color-bg-brand-solid)] text-white rounded-br-md'
              : tool
                ? 'bg-[var(--m3-surface-container-lowest)] border rounded-bl-md'
                : 'bg-[var(--m3-surface-container)] rounded-bl-md'
          }`}
          style={tool ? { borderColor: tool.color } : undefined}
        >
          {m.text}
          {!mine && m.sources && <SourceChips sources={m.sources} />}
        </div>
        <div className={`text-[10px] text-[var(--m3-on-surface-variant)] mt-1 ${mine ? 'text-right' : ''}`}>{m.time}</div>
      </div>
    </motion.div>
  )
}
