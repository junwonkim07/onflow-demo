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

type Session = { id: number; title: string; titled: boolean; thread: ThreadMessage[]; createdByYou?: boolean }

/* ---------- Inbox 뷰 시스템 ---------- */

type ViewKey = 'inbox' | 'mentions' | 'created' | 'all' | 'unassigned' | 'dashboard' | 'cs' | 'am' | 'pq' | 'fr' | 'agent'

type InboxItem = {
  id: string
  source: Exclude<SourceKey, 'wiki'>
  from: string
  title: string
  preview: string
  time: string
  body: string
  /** "Draft reply in session" 클릭 시 새 세션 컴포저에 심어지는 요청 */
  prompt: string
}

const MENTIONS: InboxItem[] = [
  {
    id: 'm1',
    source: 'slack',
    from: 'Mina Park',
    title: '#logistics-ops — order deadline',
    preview: '@junwon is the summer order entry really closing…',
    time: '1h',
    body: '@junwon is the summer order entry really closing tomorrow 6 PM? Two vendors asked if late SKUs can still go in.',
    prompt: 'Reply in #logistics-ops about the order deadline questions',
  },
  {
    id: 'm2',
    source: 'slack',
    from: 'Dana Lee',
    title: '#design-team — review time',
    preview: '@junwon did the design review move? My calendar…',
    time: '2h',
    body: '@junwon did the design review move? My calendar still shows 2 PM but Sihoon said 3.',
    prompt: 'Post in #design-team that the review moved from 2pm to 3pm',
  },
  {
    id: 'm3',
    source: 'gmail',
    from: 'Hanbit Trading',
    title: 'RE: July price update',
    preview: 'Hi Junwon, following up on our July price sheet…',
    time: '2h',
    body: 'Hi Junwon,\n\nFollowing up on our July price sheet (+3.2% vs June). Could you confirm by Friday so we can lock August volumes?\n\nBest,\nHanbit purchasing',
    prompt: 'Email Hanbit a reply about the price increase',
  },
]

const VIEW_ITEMS: Record<'cs' | 'am' | 'pq' | 'fr', InboxItem[]> = {
  cs: [
    {
      id: 'cs1',
      source: 'gmail',
      from: 'Carlos Rivera',
      title: 'Damaged item — refund?',
      preview: 'The table I ordered just arrived and one of the legs…',
      time: '1m',
      body: 'The table I ordered just arrived and one of the legs is broken. What’s your refund policy for damaged items?',
      prompt: 'Email Hanbit a reply about the price increase',
    },
    {
      id: 'cs2',
      source: 'slack',
      from: 'CS bot',
      title: '#cs-escalations — login issue',
      preview: 'Customer #4821 keeps getting login failures on…',
      time: '30m',
      body: 'Customer #4821 keeps getting login failures on the store app. 3rd report today — possible incident?',
      prompt: 'Draft an agenda doc for the 9:30 logistics meeting',
    },
  ],
  am: [
    {
      id: 'am1',
      source: 'gmail',
      from: 'Daesung Distribution',
      title: 'August promo volumes',
      preview: 'We’d like to double promo volume for August…',
      time: '3h',
      body: 'We’d like to double promo volume for August. Can you confirm pricing terms this week?',
      prompt: 'Email Hanbit a reply about the price increase',
    },
    {
      id: 'am2',
      source: 'calendar',
      from: 'Aqara Life',
      title: 'Contract meeting — reschedule?',
      preview: 'Sanghyun asked if the contract meeting can move…',
      time: '1d',
      body: 'Sanghyun asked if the contract meeting can move to next Monday afternoon.',
      prompt: 'Email Sanghyun to schedule the meeting',
    },
  ],
  pq: [
    {
      id: 'pq1',
      source: 'erp',
      from: 'Sabangnet ERP',
      title: 'SKU-2381 stock mismatch',
      preview: 'Nightly sync flagged a quantity mismatch on…',
      time: '6h',
      body: 'Nightly sync flagged a quantity mismatch on SKU-2381 (Summer Cooling Pad): ERP 8 vs price sheet 10.',
      prompt: 'Notify logistics about SKUs below safety stock',
    },
    {
      id: 'pq2',
      source: 'slack',
      from: 'Jihoon',
      title: '#product — sizing question',
      preview: 'Anyone know if the cooling pad L size ships…',
      time: '1d',
      body: 'Anyone know if the cooling pad L size ships this month? A reseller is asking.',
      prompt: 'Reply in #logistics-ops about the order deadline questions',
    },
  ],
  fr: [
    {
      id: 'fr1',
      source: 'notion',
      from: 'Feedback form',
      title: 'Feature request — weekly digest',
      preview: 'Would love a Monday-morning digest of everything…',
      time: '2d',
      body: 'Would love a Monday-morning digest of everything the agent ran last week, grouped by tool.',
      prompt: 'Draft an agenda doc for the 9:30 logistics meeting',
    },
    {
      id: 'fr2',
      source: 'slack',
      from: 'Sihoon',
      title: '#feedback — approvals UX',
      preview: 'Approve & send should show a diff when I edited…',
      time: '3d',
      body: 'Approve & send should show a diff when I edited the draft — otherwise I can’t tell what changed.',
      prompt: 'Trying to set a meeting tomorrow — when is everyone free?',
    },
  ],
}

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
          { key: 'gmail', label: 'Quote' },
          { key: 'calendar', label: 'Contract meeting' },
          { key: 'notion', label: 'Install guide' },
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
  const [view, setView] = useState<ViewKey>('inbox')
  const [itemId, setItemId] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const demoToken = useRef(0)

  // 컴포저 자동 확장 — 내용 길이에 맞춰 커진다 (최대 176px)
  useEffect(() => {
    const el = composerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 176) + 'px'
  }, [input])

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
    setSessions(ss => [{ id, title: 'New session', titled: false, thread: [], createdByYou: true }, ...ss])
    setActiveId(id)
    clearAll()
  }

  // 뷰 파생 상태
  const sessionsMode = view === 'inbox' || view === 'created' || view === 'all'
  const listSessions = view === 'created' ? sessions.filter(s => s.createdByYou) : sessions
  const items: InboxItem[] =
    view === 'mentions' ? MENTIONS : view === 'cs' || view === 'am' || view === 'pq' || view === 'fr' ? VIEW_ITEMS[view] : []
  const itemsMode = items.length > 0 || view === 'mentions'
  const selectedItem = itemsMode ? items.find(i => i.id === itemId) ?? items[0] ?? null : null
  const showList = sessionsMode || itemsMode || view === 'unassigned'

  const openView = (v: ViewKey) => {
    setView(v)
    setItemId(null)
  }

  /** 아이템에서 새 세션으로 답장 초안 시작 */
  const replyToItem = (item: InboxItem) => {
    setView('inbox')
    newSession()
    runSeed(item.prompt)
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
          toolNote: 'Done',
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

  /** 실행 취소 — 결과 메시지와 그 직전의 내 요청을 함께 제거 */
  const undoRun = (agentMsgId: number) => {
    setSessions(ss =>
      ss.map(s => {
        if (s.id !== activeId) return s
        const idx = s.thread.findIndex(m => m.id === agentMsgId)
        if (idx < 0) return s
        const start = idx > 0 && s.thread[idx - 1].from === 'me' ? idx - 1 : idx
        return { ...s, thread: [...s.thread.slice(0, start), ...s.thread.slice(idx + 1)] }
      }),
    )
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
      className="flex-1 min-h-0 flex m-3 mt-0 rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-hidden text-[13px]"
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
          <NavRow Icon={IconHomeRegular} label="Your inbox" count={sessions.length} active={view === 'inbox'} onClick={() => openView('inbox')} />
          <NavRow Icon={IconChattingRegular} label="Mentions" count={MENTIONS.filter(m => !readIds.has(m.id)).length} active={view === 'mentions'} onClick={() => openView('mentions')} />
          <NavRow Icon={IconWriteRegular} label="Created by you" count={sessions.filter(s => s.createdByYou).length} active={view === 'created'} onClick={() => openView('created')} />
          <NavRow Icon={IconListRegular} label="All" count={sessions.length} active={view === 'all'} onClick={() => openView('all')} />
          <NavRow Icon={IconMyProfileRegular} label="Unassigned" count={0} active={view === 'unassigned'} onClick={() => openView('unassigned')} />
          <NavRow Icon={IconChartRegular} label="Dashboard" active={view === 'dashboard'} onClick={() => openView('dashboard')} />
          <div className="pt-3 pb-1 px-2 text-[11px] font-semibold text-[var(--m3-on-surface-variant)] flex items-center justify-between">
            Views <IconExpandMoreRegular width={12} height={12} />
          </div>
          <div className="border-l border-[var(--m3-outline-variant)] ml-3.5 pl-1 space-y-px">
            {(
              [
                ['cs', 'Customer Support'],
                ['am', 'Account Management'],
                ['pq', 'Product Questions'],
                ['fr', 'Feedback & Requests'],
              ] as [ViewKey, string][]
            ).map(([k, v]) => (
              <button
                key={k}
                onClick={() => openView(k)}
                className={`w-full text-left px-2 py-1 rounded-md truncate transition-colors ${
                  view === k
                    ? 'bg-[var(--m3-surface-container)] font-semibold'
                    : 'text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="pt-2">
            <NavRow Icon={IconCheckFlowerRegular} label="Onflow AI Agent" chevron active={view === 'agent'} onClick={() => openView('agent')} />
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

      {/* ── Col 2: List (sessions or items) ──────── */}
      {showList && (
      <aside className="w-60 shrink-0 hidden md:flex flex-col border-r border-[var(--m3-outline-variant)]">
        <div className="h-12 shrink-0 flex items-center justify-between px-3.5 border-b border-[var(--m3-outline-variant)]">
          <button className="flex items-center gap-1 font-semibold">
            {sessionsMode ? `${listSessions.length} Open` : `${items.length} Open`}{' '}
            <IconExpandMoreRegular width={13} height={13} className="text-[var(--m3-on-surface-variant)]" />
          </button>
          <button className="flex items-center gap-1 text-[var(--m3-on-surface-variant)]">
            Newest <IconExpandMoreRegular width={13} height={13} />
          </button>
        </div>
        {itemsMode ? (
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {items.map(it => {
              const active = selectedItem?.id === it.id
              const unread = !readIds.has(it.id)
              return (
                <button
                  key={it.id}
                  onClick={() => {
                    setItemId(it.id)
                    setReadIds(rs => new Set(rs).add(it.id))
                  }}
                  className={`w-full text-left flex gap-2.5 px-2.5 py-2.5 rounded-lg transition-colors ${
                    active ? 'bg-[var(--m3-surface-container)]' : 'hover:bg-[var(--m3-surface-container-low)]'
                  }`}
                >
                  <SourceBadge source={it.source} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{it.from}</span>
                      <span className="text-[11px] text-[var(--m3-on-surface-variant)] shrink-0 flex items-center gap-1.5">
                        {unread && <span className="w-1.5 h-1.5 rounded-full bg-[var(--m3-primary)]" />}
                        {it.time}
                      </span>
                    </span>
                    <span className="block text-[12px] text-[var(--m3-on-surface-variant)] truncate mt-0.5">{it.preview}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : view === 'unassigned' ? (
          <div className="flex-1 grid place-items-center p-6 text-center text-[12px] text-[var(--m3-on-surface-variant)]">
            Nothing unassigned —<br />Onflow triages everything it can.
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {listSessions.map(s => {
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
                <span className="w-7 h-7 rounded-lg shrink-0 grid place-items-center text-[11px] font-bold bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
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
        )}
      </aside>
      )}

      {/* ── Col 3: Center ────────────────────────── */}
      {view === 'dashboard' ? (
        <DashboardPanel sessions={sessions} />
      ) : view === 'agent' ? (
        <AgentPanel />
      ) : view === 'unassigned' ? (
        <section className="flex-1 min-w-0 grid place-items-center text-center p-8">
          <div>
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--m3-surface-container)] grid place-items-center text-[var(--m3-on-surface-variant)] mb-3">
              <IconCheckRegular width={20} height={20} />
            </div>
            <h2 className="font-bold text-[15px]">All caught up</h2>
            <p className="text-[12px] text-[var(--m3-on-surface-variant)] mt-1">
              Every conversation is either assigned or handled by the agent.
            </p>
          </div>
        </section>
      ) : itemsMode && selectedItem ? (
        <ItemDetail item={selectedItem} onReply={() => replyToItem(selectedItem)} />
      ) : (
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 shrink-0 flex items-center gap-1 px-4 border-b border-[var(--m3-outline-variant)]">
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
          {[IconReviewStarRegular, IconMoreHorizRegular].map((I, i) => (
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
                <Bubble key={m.id} m={m} onUndo={m.tool ? () => undoRun(m.id) : undefined} />
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
                className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)]"
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
                className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)]"
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
                      Saved for future conflicts
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
                style={{ borderColor: actionIntent.tool.color }}
                aria-label="Run preview"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2 text-white" style={{ backgroundColor: actionIntent.tool.color }}>
                  <span className="w-5.5 h-5.5 rounded-md bg-white grid place-items-center" style={{ color: actionIntent.tool.color }}>
                    {actionIntent.tool.logo}
                  </span>
                  <span className="font-bold">{actionIntent.title}</span>
                  <span className="text-[11px] opacity-80">{actionIntent.target}</span>
                  <span className="ml-auto text-[10px] opacity-90">
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
                      Nothing sends until you run it
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
            className={`relative rounded-xl border bg-[var(--m3-surface-container-lowest)]  transition-colors ${
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
                ref={composerRef}
                rows={1}
                className="w-full resize-none outline-none text-[13px] leading-6 bg-transparent min-h-[48px] max-h-44 overflow-y-auto"
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
      )}

      {/* ── Col 4: Details / Copilot ─────────────── */}
      {sessionsMode && (
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
                          {s.key === 'wiki' ? (
                            <span className="w-5 h-5 rounded-md bg-[var(--m3-surface-container)] grid place-items-center text-[var(--m3-on-surface-variant)]">
                              <IconBookmarkRegular width={12} height={12} />
                            </span>
                          ) : (
                            <SourceBadge source={s.key} size={20} />
                          )}
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
            {/* Ask a question — 하우스 스타일 (헤어라인 + 블랙 버튼) */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] pl-3 pr-1 py-1 focus-within:border-[var(--m3-outline)] transition-colors">
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
                className="w-7 h-7 rounded-md bg-[var(--seed-color-bg-brand-solid)] text-white grid place-items-center shrink-0"
              >
                <IconChattingSendRegular width={13} height={13} />
              </button>
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
                Only what you can access — nothing else is revealed to exist.
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
      )}
    </div>
  )
}

/* ---------- Item detail (mentions / views) ---------- */

function ItemDetail({ item, onReply }: { item: InboxItem; onReply: () => void }) {
  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <header className="h-12 shrink-0 flex items-center gap-2.5 px-4 border-b border-[var(--m3-outline-variant)]">
        <SourceBadge source={item.source} size={22} />
        <span className="font-bold text-[15px] truncate">{item.title}</span>
        <span className="text-[11px] text-[var(--m3-on-surface-variant)]">{item.time}</span>
        <div className="flex-1" />
        {[IconReviewStarRegular, IconMoreHorizRegular].map((I, i) => (
          <button key={i} className="w-8 h-8 rounded-lg grid place-items-center text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container)]">
            <I width={16} height={16} />
          </button>
        ))}
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-full bg-[var(--m3-surface-container-high)] grid place-items-center text-[12px] font-bold">
                {item.from[0]}
              </span>
              <div className="leading-tight">
                <div className="font-bold">{item.from}</div>
                <div className="text-[11px] text-[var(--m3-on-surface-variant)]">{item.time} ago</div>
              </div>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{item.body}</p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onReply}
              className="h-9 px-4 rounded-lg bg-[var(--seed-color-bg-brand-solid)] text-white text-[12px] font-bold flex items-center gap-1.5"
            >
              <IconWriteRegular width={14} height={14} /> Draft reply in a session
            </button>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)]">Nothing sends without you</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Dashboard ---------- */

function DashboardPanel({ sessions }: { sessions: Session[] }) {
  const bars = [42, 65, 38, 80, 58, 72, 90]
  const stats: [string, string, string][] = [
    ['Runs today', '12', 'all after approval'],
    ['Open sessions', String(sessions.length), 'across the team'],
    ['Avg. prep time', '0.8s', 'intent → ready draft'],
    ['Items synced', '128', 'overnight, 4 sources'],
  ]
  return (
    <section className="flex-1 min-w-0 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-bold text-[17px] mb-4">Dashboard</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map(([label, value, sub]) => (
            <div key={label} className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-3.5">
              <div className="text-[11px] text-[var(--m3-on-surface-variant)]">{label}</div>
              <div className="text-[22px] font-bold tabular-nums mt-0.5">{value}</div>
              <div className="text-[10px] text-[var(--m3-on-surface-variant)] mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-semibold">Agent runs this week</span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)]">Mon – Sun</span>
          </div>
          <div className="flex items-end gap-2 h-28">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-[var(--m3-primary)]" style={{ height: `${h}%`, opacity: i === 6 ? 1 : 0.45 }} />
            ))}
          </div>
          <div className="flex gap-2 mt-1.5 text-[10px] text-[var(--m3-on-surface-variant)]">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Onflow AI Agent panel ---------- */

function AgentPanel() {
  return (
    <section className="flex-1 min-w-0 overflow-y-auto p-6">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <span className="w-11 h-11 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] grid place-items-center">
            <IconCheckFlowerRegular width={22} height={22} />
          </span>
          <div>
            <h2 className="font-bold text-[17px]">Onflow AI Agent</h2>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)] flex items-center gap-1.5">
              <span className="agent-dot w-2 h-2" /> Active · watching 5 connected sources
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4">
            <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2">MODEL</div>
            <div className="font-semibold">Gemini 2.5 Pro · Vertex AI</div>
            <div className="text-[11px] text-[var(--m3-on-surface-variant)] mt-0.5">Lightweight intent model runs on every keystroke</div>
          </div>
          <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4">
            <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2.5">CONNECTED TOOLS</div>
            <div className="flex items-center gap-2">
              {(['slack', 'notion', 'gmail', 'calendar', 'erp'] as const).map(k => (
                <SourceBadge key={k} source={k} size={30} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4">
            <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-2">GUARDRAILS</div>
            <ul className="space-y-1.5">
              {[
                'Every outbound action is previewed and approved by a human',
                'Mirrors each member’s permissions — no access, no answer',
                'Documents outside your scope are never revealed to exist',
              ].map(g => (
                <li key={g} className="flex items-start gap-2">
                  <IconCheckRegular width={13} height={13} className="mt-0.5 shrink-0 text-[var(--m3-primary)]" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] p-4 flex items-center">
            <div>
              <div className="text-[11px] font-bold text-[var(--m3-on-surface-variant)] mb-1">COMPANY MEMORY</div>
              <div className="font-semibold">204 docs · 38 entities · compiled 5 min ago</div>
            </div>
            <span className="ml-auto text-[11px] text-[var(--m3-on-surface-variant)]">See Memory tab →</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Inbox nav row ---------- */

function NavRow({
  Icon,
  label,
  count,
  active,
  chevron,
  onClick,
}: {
  Icon: typeof IconHomeRegular
  label: string
  count?: number
  active?: boolean
  chevron?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
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
          Connected to company data · previewed before it runs
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
            <span className="w-4 h-4 rounded bg-[var(--m3-surface-container-high)] grid place-items-center" aria-hidden>
              <IconBookmarkRegular width={10} height={10} />
            </span>
          ) : (
            <SourceBadge source={s.key} size={16} />
          )}
          {s.label}
        </span>
      ))}
    </div>
  )
}

function Bubble({ m, onUndo }: { m: ThreadMessage; onUndo?: () => void }) {
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
            {onUndo && (
              <button onClick={onUndo} className="ml-1 underline underline-offset-2 hover:text-[var(--m3-on-surface)]">
                Undo
              </button>
            )}
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
