import { useState } from 'react'
import { motion } from 'framer-motion'
import { ActionButton } from 'seed-design/ui/action-button'
import { IconCheckRegular } from '@seed-design/icon'
import { integrations as initial, type Integration } from '../data'
import { Card, PageHeader, SourceBadge } from '../components/ui'

export default function Integrations() {
  const [items, setItems] = useState<Integration[]>(initial)
  const connectedCount = items.filter(i => i.connected).length

  const connect = (key: Integration['key']) =>
    setItems(xs => xs.map(x => (x.key === key ? { ...x, connected: true, lastSync: 'just now' } : x)))

  return (
    <div className="max-w-4xl w-full mx-auto">
      <PageHeader
        title="Integrations"
        desc={`${connectedCount} connected · 1,240 synced today`}
      />

      <div className="grid grid-cols-2 gap-3">
        {items.map((it, i) => (
          <motion.div key={it.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-4 flex items-start gap-3.5 h-full">
              <SourceBadge source={it.key} size={52} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{it.name}</div>
                <p className="text-[13px] text-[var(--m3-on-surface-variant)] mt-0.5 leading-relaxed">{it.desc}</p>
                {it.connected && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[var(--m3-primary)] mt-2">
                    <IconCheckRegular width={12} height={12} /> Connected · last sync {it.lastSync}
                  </span>
                )}
              </div>
              {it.connected ? (
                <ActionButton size="xsmall" variant="neutralWeak">Settings</ActionButton>
              ) : (
                <ActionButton size="xsmall" variant="brandSolid" onClick={() => connect(it.key)}>
                  Connect
                </ActionButton>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="mt-6 p-4 text-[13px] text-[var(--m3-on-surface-variant)] leading-relaxed">
        <b className="text-[var(--m3-on-surface)]">Permission model</b> — Onflow mirrors each member’s existing access.
        Channels and documents you can’t see, the agent can’t see either — their existence is never revealed.
      </Card>
    </div>
  )
}
