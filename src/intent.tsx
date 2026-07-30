import type { ReactElement } from 'react'

export type ToolKey = 'slack' | 'notion' | 'gmail' | 'calendar'

export interface ToolMeta {
  key: ToolKey
  name: string
  color: string
  colorSoft: string
  actionLabel: string
  logo: ReactElement
}

const logoProps = { width: 16, height: 16, 'aria-hidden': true as const }

export const TOOLS: Record<ToolKey, ToolMeta> = {
  slack: {
    key: 'slack',
    name: 'Slack',
    color: '#4A154B',
    colorSoft: 'rgba(74,21,75,.08)',
    actionLabel: 'Send message',
    logo: (
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <path d="M9 3a2 2 0 1 0 0 4h2V5a2 2 0 0 0-2-2Zm0 5H5a2 2 0 1 0 0 4h4a2 2 0 1 0 0-4Z" fill="#36C5F0" />
        <path d="M21 9a2 2 0 1 0-4 0v2h2a2 2 0 0 0 2-2Zm-5 0V5a2 2 0 1 0-4 0v4a2 2 0 1 0 4 0Z" fill="#2EB67D" />
        <path d="M15 21a2 2 0 1 0 0-4h-2v2a2 2 0 0 0 2 2Zm0-5h4a2 2 0 1 0 0-4h-4a2 2 0 1 0 0 4Z" fill="#ECB22E" />
        <path d="M3 15a2 2 0 1 0 4 0v-2H5a2 2 0 0 0-2 2Zm5 0v4a2 2 0 1 0 4 0v-4a2 2 0 1 0-4 0Z" fill="#E01E5A" />
      </svg>
    ),
  },
  notion: {
    key: 'notion',
    name: 'Notion',
    color: '#191919',
    colorSoft: 'rgba(25,25,25,.07)',
    actionLabel: 'Create page',
    logo: (
      /* 실제 Notion 로고 — 페이지 + 세리프 N */
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <path
          d="M4.2 4.4 14.9 3.6c1.3-.1 1.7 0 2.5.6l3.3 2.3c.6.4.8.6.8 1.1v12.6c0 .9-.3 1.4-1.5 1.5l-12.4.7c-.9 0-1.3-.1-1.8-.7L3.3 18.4c-.5-.7-.7-1.2-.7-1.8V5.8c0-.7.3-1.3 1.6-1.4Z"
          fill="#fff"
          stroke="#191919"
          strokeWidth="1.1"
        />
        <path
          d="M8.4 8.7v-.2c0-.5.1-.7.6-.8l1.3-.1 4.4 6.7V8.4l-1.1-.1v-.1c0-.4.2-.6.7-.6l2.9-.2v.3c0 .3-.1.5-.5.5l-.7.1v9.4l-1.4.4c-.7.2-1 .1-1.5-.5l-4.2-6.5v6.2l1.2.3s0 .5-.7.5l-2.1.1c-.1-.3.1-.6.4-.7l.6-.1V9.3l-1-.1c-.1-.3.1-.5.5-.5h.6Z"
          fill="#191919"
        />
      </svg>
    ),
  },
  gmail: {
    key: 'gmail',
    name: 'Gmail',
    color: '#C5221F',
    colorSoft: 'rgba(197,34,31,.08)',
    actionLabel: 'Draft email',
    logo: (
      /* 실제 Gmail 로고 — 4색 M 봉투 */
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <path d="M2.5 19h3.2v-8.1L2.5 8.5V17.6c0 .8.6 1.4 1.4 1.4h-1.4Z" fill="#34A853" />
        <path d="M18.3 19h3.2V8.5l-3.2 2.4V19Z" fill="#4285F4" />
        <path d="M18.3 6.7v4.2l3.2-2.4V7.4c0-1.8-2-2.8-3.4-1.7l.2 1Z" fill="#FBBC04" />
        <path d="M5.7 10.9V6.7l6.3 4.7 6.3-4.7v4.2L12 15.6l-6.3-4.7Z" fill="#EA4335" />
        <path d="M2.5 7.4v1.1l3.2 2.4V6.7l-.2-1C4 4.6 2.5 5.6 2.5 7.4Z" fill="#C5221F" />
      </svg>
    ),
  },
  calendar: {
    key: 'calendar',
    name: 'Google Calendar',
    color: '#1A73E8',
    colorSoft: 'rgba(26,115,232,.09)',
    actionLabel: 'Update event',
    logo: (
      /* 실제 Google Calendar 로고 — 색상 프레임 + 31 */
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <path d="M17.5 6.5h-11v11h11v-11Z" fill="#fff" />
        <path d="M17.5 21 21 17.5h-3.5V21Z" fill="#1A73E8" />
        <path d="M21 6.5h-3.5v11H21v-11Z" fill="#4285F4" />
        <path d="M17.5 17.5h-11V21h11v-3.5Z" fill="#34A853" />
        <path d="M3 17.5c0 1.9 1.6 3.5 3.5 3.5v-3.5H3Z" fill="#188038" />
        <path d="M6.5 3C4.6 3 3 4.6 3 6.5h3.5V3Z" fill="#1967D2" />
        <path d="M3 6.5h3.5v11H3v-11Z" fill="#FBBC04" />
        <path d="M21 6.5C21 4.6 19.4 3 17.5 3v3.5H21Z" fill="#1A73E8" />
        <path d="M6.5 3h11v3.5h-11V3Z" fill="#1A73E8" />
        <path
          d="M9 12.2c0-1.5 1.1-2.4 2.5-2.4 1.3 0 2.3.8 2.3 2 0 .8-.5 1.3-1 1.6.7.3 1.2.9 1.2 1.8 0 1.3-1.1 2.2-2.6 2.2-1.4 0-2.5-.9-2.6-2.2h1.3c.1.6.6 1 1.3 1 .7 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1h-.6v-1.1h.6c.7 0 1.1-.4 1.1-1 0-.6-.4-1-1-1s-1.1.4-1.1 1.2H9Z"
          fill="#1A73E8"
        />
      </svg>
    ),
  },
}

export interface Intent {
  tool: ToolMeta
  target: string
  title: string
  draft: string
}

/* ---------- Instant answer card: team availability ---------- */

export interface Slot {
  start: number
  end: number
  free: number
  total: number
}

export interface AvailabilityAnswer {
  kind: 'availability'
  members: { name: string; color: string; busy: [number, number][] }[]
  best: Slot | null
  alt: Slot | null
  dayStart: number
  dayEnd: number
}

/* ---------- Conflict card: source-of-truth disagreement ---------- */

export interface ConflictAnswer {
  kind: 'conflict'
  item: string
  question: string
  options: { source: 'erp' | 'drive'; label: string; value: string; asOf: string; recommended?: boolean }[]
}

export type Detected = { kind: 'action'; intent: Intent } | AvailabilityAnswer | ConflictAnswer

export function fmtHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm === 0 ? `${hh}:00` : `${hh}:${mm}`
}

function isFree(busy: [number, number][], s: number, e: number): boolean {
  return busy.every(([bs, be]) => e <= bs || s >= be)
}

/** Scan 30-min steps for an all-free slot (≥1h) and a next-best slot (≥30m) */
export function computeAvailability(
  members: AvailabilityAnswer['members'],
  dayStart = 10,
  dayEnd = 18,
): AvailabilityAnswer {
  const step = 0.5
  const counts: { t: number; free: number }[] = []
  for (let t = dayStart; t < dayEnd; t += step) {
    counts.push({ t, free: members.filter(m => isFree(m.busy, t, t + step)).length })
  }
  const total = members.length

  const windows = (need: number, minLen: number, exclude?: Slot | null): Slot | null => {
    let runStart: number | null = null
    let bestSlot: Slot | null = null
    const flush = (end: number) => {
      if (runStart !== null && end - runStart >= minLen) {
        const cand: Slot = { start: runStart, end, free: need, total }
        if (!bestSlot || cand.end - cand.start > bestSlot.end - bestSlot.start) bestSlot = cand
      }
      runStart = null
    }
    for (const c of counts) {
      const excluded = exclude ? c.t >= exclude.start && c.t < exclude.end : false
      if (c.free >= need && !excluded) {
        if (runStart === null) runStart = c.t
      } else flush(c.t)
    }
    flush(dayEnd)
    return bestSlot
  }

  const best = windows(total, 1)
  const alt = windows(total - 1, 0.5, best)
  return { kind: 'availability', members, best, alt, dayStart, dayEnd }
}

/** Conflict card → confirmed basis → Slack notice */
export function conflictToAction(c: ConflictAnswer, chosen: 'erp' | 'drive'): Intent {
  const opt = c.options.find(o => o.source === chosen)!
  const other = c.options.find(o => o.source !== chosen)!
  return {
    tool: TOOLS.slack,
    target: '#logistics-ops · 12 members',
    title: 'Send Slack message',
    draft: `[Inventory] ${c.item.split('·')[0].trim()}: ${opt.value} on hand — below safety stock (15). Please review reorders today.\nBasis: ${opt.label}, ${opt.asOf} · conflicts with ${other.label} (${other.value}) → confirmed this as the source of truth.`,
  }
}

/** Answer card → action card chaining */
export function slotToAction(tool: 'calendar' | 'slack', slot: Slot, memberNames: string[]): Intent {
  const range = `${fmtHour(slot.start)}–${fmtHour(slot.end)}`
  if (tool === 'calendar') {
    return {
      tool: TOOLS.calendar,
      target: `${memberNames.length} attendees · tomorrow ${range}`,
      title: 'Create meeting',
      draft: `Weekly sync\nTomorrow (Fri) ${range}\nAttendees: ${memberNames.join(', ')}\nRoom B · invites will be sent`,
    }
  }
  return {
    tool: TOOLS.slack,
    target: '#design-team · 8 members',
    title: 'Send Slack message',
    draft: `[Meeting] Weekly sync tomorrow (Fri) ${range} — picked the slot everyone is free. Please accept the calendar invite!`,
  }
}

/**
 * Live intent detection while typing (rule-based demo).
 * In the real product a lightweight model does this on a stream.
 * Question-type answers take priority over action-type.
 */
export function detect(raw: string, members: AvailabilityAnswer['members']): Detected | null {
  const text = raw.trim()
  if (text.length < 6) return null
  const has = (re: RegExp) => re.test(text)

  // Question: "when is everyone free?" → instant availability answer
  if (has(/meeting|sync|call|미팅|회의|싱크/i) && has(/when|what time|free|available|몇\s?시|언제|시간\s?되|가능/i)) {
    return computeAvailability(members)
  }

  // Conflict: sources disagree → confirm the basis before anything goes out
  if (has(/stock|sku|inventory|재고|안전재고/i) && has(/notify|announce|post|send|message|tell|공지|알려|보내/i)) {
    return {
      kind: 'conflict',
      item: 'SKU-2381 Summer Cooling Pad · quantity on hand',
      question: 'Two sources disagree. Which one should this notice use?',
      options: [
        { source: 'erp', label: 'Sabangnet ERP (live)', value: '8 units', asOf: 'synced 5 min ago', recommended: true },
        { source: 'drive', label: 'Drive price sheet v3', value: '10 units', asOf: 'edited yesterday' },
      ],
    }
  }

  const intent = detectIntent(text)
  return intent ? { kind: 'action', intent } : null
}

const CHANNELS: Record<string, string> = {
  design: '#design-team · 8 members',
  logistics: '#logistics-ops · 12 members',
  sales: '#sales · 9 members',
}

function guessChannel(text: string): string {
  for (const [k, v] of Object.entries(CHANNELS)) if (text.toLowerCase().includes(k)) return v
  if (/디자인/.test(text)) return CHANNELS.design
  if (/물류/.test(text)) return CHANNELS.logistics
  return '#general · 41 members'
}

export function detectIntent(raw: string): Intent | null {
  const text = raw.trim()
  if (text.length < 6) return null

  const has = (re: RegExp) => re.test(text)

  if (has(/slack|#[\w-]+|reply in|post in|announce|슬랙|공지/i)) {
    return {
      tool: TOOLS.slack,
      target: guessChannel(text),
      title: 'Send Slack message',
      draft: slackDraft(text),
    }
  }
  if (has(/\bmail\b|email|메일|이메일/i)) {
    const aqara = has(/aqara|sanghyun|아카라|이상현/i)
    return {
      tool: TOOLS.gmail,
      target: aqara ? 'To: Sanghyun Lee <sanghyun@aqara.kr>' : 'To: Hanbit Trading <purchase@hanbit.co>',
      title: 'Draft email',
      draft: aqara
        ? 'Hi Sanghyun,\n\nFollowing up on the quote we sent last week — could we meet to walk through it?\nHow about next Monday 2 PM at Episode Gangnam 262, meeting room B?\n\nBest,\nJunwon Kim, Onword Lab'
        : mailDraft(text),
    }
  }
  if (has(/notion|\bdoc\b|document|agenda|minutes|write.?up|page|노션|문서|회의록|정리해/i)) {
    return {
      tool: TOOLS.notion,
      target: 'Workspace › Ops › Meeting notes',
      title: 'Create Notion page',
      draft: notionDraft(text),
    }
  }
  if (has(/meeting|schedule|calendar|invite|미팅|일정|캘린더|회의/i) && has(/move|change|cancel|book|set|잡|옮|변경|바뀌|취소/i)) {
    return {
      tool: TOOLS.calendar,
      target: '6 attendees · Room B',
      title: 'Update event',
      draft: calendarDraft(text),
    }
  }
  return null
}

/** Extract "2pm to 3pm" / "2시에서 3시" style time changes */
function timeChange(text: string): { from: string; to: string } | null {
  const en = text.match(/(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\s?(?:to|→|->)\s?(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)/i)
  if (en) return { from: en[1].trim(), to: en[2].trim() }
  const ko = text.match(/(\d{1,2}시(?:\s?\d{1,2}분)?)\s?(?:에서|→|->)\s?(\d{1,2}시(?:\s?\d{1,2}분)?)/)
  return ko ? { from: ko[1], to: ko[2] } : null
}

function slackDraft(text: string): string {
  const t = timeChange(text)
  if (t)
    return `[Schedule change] Tomorrow's design review moved from ${t.from} to ${t.to}. Please check your calendar 🙏`
  if (/order|deadline|발주/i.test(text))
    return `[Reminder] Summer-season order entry closes tomorrow at 6 PM. If you still have SKUs to enter, please finish today.`
  return `[Notice] ${text.replace(/slack|announce|post|send|reply/gi, '').replace(/to |in |the /gi, ' ').trim()}`
}

function mailDraft(text: string): string {
  const t = timeChange(text)
  if (t)
    return `Hello,\n\nTomorrow's meeting has moved from ${t.from} to ${t.to}.\nSame room as before (Room B).\n\nBest,\nJunwon Kim, Onword Lab`
  if (/price|increase|quote|단가|인상/i.test(text))
    return `Hello Hanbit purchasing team,\n\nThank you for the July price update (+3.2% vs June).\nWe are reviewing it against our comparison sheet and will reply by Friday.\nIt would be great to also discuss August promo volumes.\n\nBest,\nJunwon Kim, Onword Lab`
  return `Hello,\n\nRegarding: ${text.replace(/\bmail\b|email|send|write/gi, '').trim()}\nHappy to sort out the details over reply.\n\nBest,\nJunwon Kim, Onword Lab`
}

function notionDraft(text: string): string {
  return `# ${/minutes|회의록/i.test(text) ? 'Jul 31 Weekly Ops Minutes' : /agenda/i.test(text) ? 'Sep Logistics Meeting Agenda' : 'New document'}\n\n## Summary\n- ${text.replace(/notion|doc|document|write.?up|create|draft/gi, '').trim()}\n\n## Action items\n- [ ] Assign owner\n- [ ] Confirm deadline`
}

function calendarDraft(text: string): string {
  const t = timeChange(text)
  if (t)
    return `Design review\nTomorrow (Fri) ${t.from} → ${t.to}\nChange notifications go out to all 6 attendees.`
  return `New event: ${text.replace(/calendar|schedule|book|set/gi, '').trim()}\nInvites will be sent to attendees.`
}
