import { AnimatePresence, motion } from 'framer-motion'
import { ActionButton } from 'seed-design/ui/action-button'
import { IconLockRegular, IconCheckRegular, IconCloseRegular } from '@seed-design/icon'
import { TOOLS } from '../intent'
import type { Approval } from '../data'
import { Card, PageHeader } from '../components/ui'
import { spatialExpressive } from '../motion'

export default function Approvals({
  approvals,
  onDecide,
}: {
  approvals: Approval[]
  onDecide: (id: number, status: 'approved' | 'rejected') => void
}) {
  const pending = approvals.filter(a => a.status === 'pending')
  const decided = approvals.filter(a => a.status !== 'pending')

  return (
    <div className="max-w-2xl w-full mx-auto">
      <PageHeader
        title="Approvals"
        desc="Drafts shown exactly as they’ll be sent. Nothing goes out before you approve."
        right={
          <span className="flex items-center gap-1.5 text-xs text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-full px-3 py-1.5">
            <IconLockRegular width={13} height={13} /> No auto-send
          </span>
        }
      />

      <div className="space-y-5">
        <AnimatePresence>
          {pending.map(a => (
            <motion.div key={a.id} layout transition={spatialExpressive} exit={{ opacity: 0, height: 0, marginBottom: 0 }}>
              {a.tool === 'gmail' ? <MailPreview a={a} /> : <SlackPreview a={a} />}
              <div className="flex items-center mt-2 px-1">
                <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                  {a.requestedBy} · {a.time} · click the draft to edit inline
                </span>
                <div className="ml-auto flex gap-2">
                  <ActionButton size="small" variant="neutralWeak" onClick={() => onDecide(a.id, 'rejected')}>
                    <IconCloseRegular width={15} height={15} /> Reject
                  </ActionButton>
                  <ActionButton size="small" variant="brandSolid" onClick={() => onDecide(a.id, 'approved')}>
                    <IconCheckRegular width={15} height={15} /> Approve & send
                  </ActionButton>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pending.length === 0 && (
          <Card className="p-10 text-center text-sm text-[var(--m3-on-surface-variant)]">
            Nothing waiting. New agent drafts will queue up here.
          </Card>
        )}

        {decided.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-[var(--m3-on-surface-variant)] pt-2">Processed</h2>
            {decided.map(a => {
              const tool = TOOLS[a.tool]
              const ok = a.status === 'approved'
              return (
                <Card key={a.id} className="px-4 py-3 flex items-center gap-3 opacity-80">
                  <span className="w-6 h-6 grid place-items-center" style={{ color: tool.color }}>
                    {tool.logo}
                  </span>
                  <span className="text-sm flex-1 truncate">{a.title}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      ok
                        ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                        : 'bg-[var(--m3-error-container)] text-[var(--m3-on-error-container)]'
                    }`}
                  >
                    {ok ? 'Approved · sent' : 'Rejected'}
                  </span>
                </Card>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

/** Gmail 초안 — 실제 메일 화면처럼 */
function MailPreview({ a }: { a: Approval }) {
  const tool = TOOLS.gmail
  return (
    <div className="rounded-2xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,.05)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-low)]">
        <span style={{ color: tool.color }}>{tool.logo}</span>
        <span className="text-[13px] font-semibold">New email draft</span>
        <span className="ml-auto text-[11px] text-[var(--m3-on-surface-variant)]">Not sent</span>
      </div>
      <div className="px-4 py-3 text-[13px] space-y-1.5 border-b border-[var(--m3-outline-variant)]">
        <div className="flex gap-2">
          <span className="w-14 text-[var(--m3-on-surface-variant)] shrink-0">To</span>
          <span className="font-medium">{a.target}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 text-[var(--m3-on-surface-variant)] shrink-0">Subject</span>
          <span className="font-medium">{a.title}</span>
        </div>
      </div>
      <div
        className="px-4 py-4 text-sm leading-relaxed whitespace-pre-line outline-none"
        contentEditable
        suppressContentEditableWarning
      >
        {a.draft}
      </div>
    </div>
  )
}

/** Slack 초안 — 실제 슬랙 메시지처럼 */
function SlackPreview({ a }: { a: Approval }) {
  const tool = TOOLS.slack
  const channel = a.target.split('·')[0].trim()
  return (
    <div className="rounded-2xl border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,.05)]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-low)]">
        <span style={{ color: tool.color }}>{tool.logo}</span>
        <span className="text-[13px] font-semibold">{channel}</span>
        <span className="text-[11px] text-[var(--m3-on-surface-variant)]">{a.target.split('·')[1]}</span>
        <span className="ml-auto text-[11px] text-[var(--m3-on-surface-variant)]">Not sent</span>
      </div>
      <div className="px-4 py-3.5 flex gap-2.5">
        <span className="w-9 h-9 shrink-0 rounded-lg bg-[var(--m3-primary)] text-[var(--m3-on-primary)] grid place-items-center font-bold" aria-hidden>
          O
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-bold">Onflow</span>
            <span className="text-[9px] font-bold px-1 py-px rounded bg-[var(--m3-surface-container-high)] text-[var(--m3-on-surface-variant)]">
              APP
            </span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)]">5:12 PM</span>
          </div>
          <div
            className="text-sm leading-relaxed whitespace-pre-line mt-0.5 outline-none"
            contentEditable
            suppressContentEditableWarning
          >
            {a.draft}
          </div>
        </div>
      </div>
    </div>
  )
}
