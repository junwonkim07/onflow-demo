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
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 16.5v-9l7.5 9v-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="#C5221F" strokeWidth="1.8" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" stroke="#C5221F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
      <svg viewBox="0 0 24 24" fill="none" {...logoProps}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="#1A73E8" strokeWidth="1.8" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="#1A73E8" strokeWidth="1.8" strokeLinecap="round" />
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
