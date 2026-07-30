import type { ToolKey } from './intent'

/* ---------- Workspace thread ---------- */

export type SourceKey = ToolKey | 'erp' | 'drive' | 'wiki'

export type ThreadMessage = {
  id: number
  from: 'me' | 'agent'
  text: string
  time: string
  /** Tool badge for executed-result messages */
  tool?: ToolKey
  toolNote?: string
  /** Evidence chips — company-data citations */
  sources?: { key: SourceKey; label: string }[]
}

export const initialThread: ThreadMessage[] = [
  { id: 1, from: 'me', text: 'Did tomorrow’s design review get moved to 3 PM?', time: '4:52 PM' },
  {
    id: 2,
    from: 'agent',
    text: 'Yes — per the calendar, tomorrow (Fri) design review moved from 2 PM → 3 PM. 2 of the 6 attendees haven’t accepted the updated invite yet.',
    time: '4:52 PM',
  },
]

export const teammates = [
  { name: 'Sihoon', color: '#6750A4' },
  { name: 'Jinho', color: '#00696D' },
  { name: 'Jihoon', color: '#8B5000' },
]

/** Tomorrow 10:00–18:00 team calendars (hours as decimals; the answer card computes the intersection) */
export const memberSchedules: { name: string; color: string; busy: [number, number][] }[] = [
  { name: 'Junwon', color: '#4E5FD9', busy: [[10, 12], [13, 15], [16.5, 18]] },
  { name: 'Sihoon', color: '#6750A4', busy: [[10.5, 11.5], [13, 14.5], [16, 17]] },
  { name: 'Jinho', color: '#00696D', busy: [[10, 11], [12, 15], [17, 18]] },
  { name: 'Jihoon', color: '#8B5000', busy: [[11, 12.5], [13.5, 15], [16, 16.5]] },
]

/** Scripted demo reply — grounded in the real Aqara Life history from Notion/QA corpus */
export const aqaraBriefing: { text: string; sources: { key: SourceKey; label: string }[] } = {
  text: 'Here’s where Aqara Life stands.\n\n1. Proposal & quote delivered — includes annual maintenance + monthly operations subscription (Jul 22)\n2. Scheduling the walkthrough — proposed Mon 2 PM, Episode Gangnam 262. Owner: Sanghyun Lee\n3. Next: contract meeting → lock the MVP/PoC timeline\n\nThe calendar shows 3 related events (intro · contract · contract review).',
  sources: [
    { key: 'gmail', label: '9 quote & scheduling emails · Jul 22' },
    { key: 'calendar', label: '3 Aqara Life events' },
    { key: 'notion', label: 'PoC roadmap · meeting notes' },
  ],
}

/* ---------- Briefing ---------- */

export type BriefItem = {
  id: number
  tool: ToolKey | 'erp'
  title: string
  detail: string
  time: string
  /** Seeded into the workspace composer on click */
  prompt: string
}

export const briefing: BriefItem[] = [
  { id: 1, tool: 'calendar', title: '9:30 AM logistics partner sync', detail: '4 attendees · Room A · the agenda is ready for you', time: 'today', prompt: 'Draft an agenda doc for the 9:30 logistics meeting' },
  { id: 2, tool: 'slack', title: '3 unread mentions in #logistics-ops', detail: 'Questions about the summer order deadline — a reply draft is ready', time: '1h ago', prompt: 'Reply in #logistics-ops about the order deadline questions' },
  { id: 3, tool: 'gmail', title: 'Vendor price reply arrived', detail: 'Hanbit Trading — +3.2% vs June. A comparison sheet is ready', time: '2h ago', prompt: 'Email Hanbit a reply about the price increase' },
  { id: 4, tool: 'erp', title: 'ERP alert: 12 SKUs below safety stock', detail: 'Reorder quantities are computed · approve to generate the PO', time: 'overnight', prompt: 'Notify logistics about SKUs below safety stock' },
]

export const homeStats = [
  { label: 'Today’s schedule', value: '3', sub: 'Next: 9:30 logistics sync' },
  { label: 'Unread mentions', value: '3', sub: 'Slack #logistics-ops' },
  { label: 'Ran yesterday', value: '12', sub: 'All after approval' },
]

/* ---------- Approval queue ---------- */

export type Approval = {
  id: number
  tool: ToolKey
  title: string
  target: string
  draft: string
  requestedBy: string
  time: string
  status: 'pending' | 'approved' | 'rejected'
}

export const initialApprovals: Approval[] = [
  {
    id: 1,
    tool: 'gmail',
    title: 'Purchase order — Hanbit Trading',
    target: 'purchase@hanbit.co',
    draft: 'Hello Hanbit purchasing team,\n\nPlease find our August #1 purchase order attached — 24 SKUs, total ₩8,420,000.\nDelivery requested by Fri Aug 8.\n\nBest,\nOnword Lab',
    requestedBy: 'Onflow agent',
    time: '10 min ago',
    status: 'pending',
  },
  {
    id: 2,
    tool: 'slack',
    title: 'Order deadline reminder — #logistics-ops',
    target: '#logistics-ops · 12 members',
    draft: '[Reminder] Summer-season order entry closes tomorrow at 6 PM. If you still have SKUs to enter, please finish today.',
    requestedBy: 'Onflow agent',
    time: '32 min ago',
    status: 'pending',
  },
]

/* ---------- Company Memory ---------- */

export type Doc = {
  id: number
  source: ToolKey | 'drive' | 'erp'
  title: string
  snippet: string
  owner: string
  updated: string
}

export const docs: Doc[] = [
  { id: 1, source: 'notion', title: '2026 Summer Ordering Guide', snippet: 'Season orders target 1.4× safety stock. Post-deadline orders need logistics approval…', owner: 'Logistics', updated: '2d ago' },
  { id: 2, source: 'drive', title: 'Vendor Price Sheet v3 (July)', snippet: 'Hanbit · Daesung · Korea Trading price comparison, July increases applied…', owner: 'Purchasing', updated: 'yesterday' },
  { id: 3, source: 'notion', title: 'Returns Handling Manual', snippet: 'Customer-fault returns deduct round-trip shipping. Damaged items: photo check → instant refund…', owner: 'CS team', updated: 'last week' },
  { id: 4, source: 'gmail', title: 'Thread: August promo volumes', snippet: 'Negotiating 2× promo volume with Daesung for August. Price terms are…', owner: 'Sales', updated: '3h ago' },
  { id: 5, source: 'erp', title: 'SKU Master (live)', snippet: '1,204 SKUs · 12 below safety stock · 218 tagged seasonal', owner: 'ERP sync', updated: '5 min ago' },
  { id: 6, source: 'slack', title: '#sales weekly highlights', snippet: '2 new accounts signed this week. Sample shipments being scheduled…', owner: 'Sales', updated: 'yesterday' },
]

/* ---------- Integrations ---------- */

export type Integration = {
  key: ToolKey | 'drive' | 'erp'
  name: string
  desc: string
  connected: boolean
  lastSync?: string
}

export const integrations: Integration[] = [
  { key: 'slack', name: 'Slack', desc: 'Read channels & DMs, send approved messages', connected: true, lastSync: 'just now' },
  { key: 'notion', name: 'Notion', desc: 'Search & create docs, auto-organize meeting notes', connected: true, lastSync: '3 min ago' },
  { key: 'gmail', name: 'Gmail', desc: 'Search threads, draft emails (send only after approval)', connected: true, lastSync: '1 min ago' },
  { key: 'calendar', name: 'Google Calendar', desc: 'Read & create events, invite attendees', connected: true, lastSync: 'just now' },
  { key: 'erp', name: 'Sabangnet ERP', desc: 'Live sync of inventory, orders and purchase data', connected: true, lastSync: '5 min ago' },
  { key: 'drive', name: 'Google Drive', desc: 'Search and reference sheets & documents', connected: false },
]
