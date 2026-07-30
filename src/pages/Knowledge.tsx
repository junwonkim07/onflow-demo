import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ActionButton } from 'seed-design/ui/action-button'
import { IconSearchRegular, IconArrowRegular } from '@seed-design/icon'
import { docs, type Doc } from '../data'
import { Card, PageHeader, SourceBadge, sourceName } from '../components/ui'
import { spatialExpressive } from '../motion'

/* ---------- 그래프 데이터: 메모리 노드(문서) + 엔티티 노드 ---------- */

type GNode = {
  id: string
  kind: 'memory' | 'entity'
  label: string
  doc?: Doc
}

const ENTITIES = [
  { id: 'e-aqara', label: 'Aqara Life' },
  { id: 'e-hanbit', label: 'Hanbit Trading' },
  { id: 'e-order', label: 'Ordering' },
  { id: 'e-stock', label: 'Inventory' },
  { id: 'e-review', label: 'Design review' },
]

const EDGES: [string, string][] = [
  ['d-1', 'e-order'],
  ['d-1', 'e-stock'],
  ['d-2', 'e-hanbit'],
  ['d-2', 'e-order'],
  ['d-3', 'e-stock'],
  ['d-4', 'e-hanbit'],
  ['d-4', 'e-aqara'],
  ['d-5', 'e-stock'],
  ['d-5', 'e-order'],
  ['d-6', 'e-review'],
  ['d-6', 'e-aqara'],
]

const SOURCE_COLOR: Record<Doc['source'], string> = {
  slack: '#4A154B',
  notion: '#8a8577',
  gmail: '#C5221F',
  calendar: '#1A73E8',
  erp: '#9a6a00',
  drive: '#3b7a57',
}

/** 결정적 포스 레이아웃 — 원형 초기 배치 후 스프링·반발 이터레이션 */
function computeLayout(nodes: GNode[], edges: [string, string][], W: number, H: number) {
  const pos = new Map<string, { x: number; y: number }>()
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2
    const r = n.kind === 'entity' ? 90 : 170
    pos.set(n.id, { x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r })
  })
  for (let it = 0; it < 280; it++) {
    // 반발
    for (const a of nodes)
      for (const b of nodes) {
        if (a.id >= b.id) continue
        const pa = pos.get(a.id)!, pb = pos.get(b.id)!
        let dx = pa.x - pb.x, dy = pa.y - pb.y
        const d2 = Math.max(dx * dx + dy * dy, 40)
        const f = 2600 / d2
        const d = Math.sqrt(d2)
        dx /= d; dy /= d
        pa.x += dx * f; pa.y += dy * f
        pb.x -= dx * f; pb.y -= dy * f
      }
    // 스프링
    for (const [s, t] of edges) {
      const ps = pos.get(s)!, pt = pos.get(t)!
      const dx = pt.x - ps.x, dy = pt.y - ps.y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const f = (d - 105) * 0.028
      ps.x += (dx / d) * f; ps.y += (dy / d) * f
      pt.x -= (dx / d) * f; pt.y -= (dy / d) * f
    }
    // 중심 인력 + 경계
    for (const n of nodes) {
      const p = pos.get(n.id)!
      p.x += (W / 2 - p.x) * 0.012
      p.y += (H / 2 - p.y) * 0.012
      p.x = Math.min(W - 60, Math.max(60, p.x))
      p.y = Math.min(H - 42, Math.max(34, p.y))
    }
  }
  return pos
}

export default function Knowledge({ onAsk }: { onAsk: (prompt: string) => void }) {
  const [q, setQ] = useState('')
  const [showEntities, setShowEntities] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>('d-1')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; sx: number; sy: number } | null>(null)

  const W = 820, H = 440
  const nodes: GNode[] = useMemo(
    () => [
      ...docs.map(d => ({ id: `d-${d.id}`, kind: 'memory' as const, label: d.title, doc: d })),
      ...ENTITIES.map(e => ({ id: e.id, kind: 'entity' as const, label: e.label })),
    ],
    [],
  )
  const baseLayout = useMemo(() => computeLayout(nodes, EDGES, W, H), [nodes])
  const [positions, setPositions] = useState(() => new Map(baseLayout))

  const visibleNodes = nodes.filter(n => showEntities || n.kind === 'memory')
  const visibleEdges = EDGES.filter(([s, t]) =>
    visibleNodes.some(n => n.id === s) && visibleNodes.some(n => n.id === t),
  )

  const neighbors = (id: string) =>
    new Set(EDGES.flatMap(([s, t]) => (s === id ? [t] : t === id ? [s] : [])))

  const focusId = hoverId ?? selectedId
  const focusSet = focusId ? new Set([focusId, ...neighbors(focusId)]) : null

  const selected = nodes.find(n => n.id === selectedId) ?? null
  const selectedEntityDocs =
    selected?.kind === 'entity'
      ? nodes.filter(n => n.kind === 'memory' && neighbors(selected.id).has(n.id))
      : []

  const filteredDocs = docs.filter(
    d => !q.trim() || (d.title + d.snippet + d.owner + sourceName(d.source)).toLowerCase().includes(q.toLowerCase()),
  )

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const y = ((e.clientY - rect.top) / rect.height) * H
    setPositions(p => {
      const next = new Map(p)
      next.set(dragRef.current!.id, { x: Math.min(W - 40, Math.max(40, x)), y: Math.min(H - 30, Math.max(24, y)) })
      return next
    })
  }

  return (
    <div className="max-w-6xl w-full mx-auto">
      <PageHeader
        title="Company Memory"
        desc="Scattered chats, docs and data compile into company memory — and compound through connections"
        right={
          <div className="flex items-center gap-2 text-xs text-[var(--m3-on-surface-variant)]">
            <span className="bg-[var(--m3-surface-container)] rounded-lg px-3 py-1.5">
              204 docs · 38 entities · 122 links · compiled 5 min ago
            </span>
          </div>
        }
      />

      <div className="flex gap-5 mb-6">
        {/* 그래프 캔버스 */}
        <Card className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-4 pb-1">
            <span className="agent-dot w-2.5 h-2.5" aria-hidden />
            <span className="text-sm font-bold">Memory graph</span>
            <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
              Drag nodes to arrange · click one for its evidence
            </span>
            <button
              onClick={() => setShowEntities(v => !v)}
              className={`ml-auto text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                showEntities
                  ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                  : 'bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)]'
              }`}
            >
              Entities {showEntities ? 'shown' : 'hidden'}
            </button>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full select-none touch-none"
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onPointerLeave={() => {
              dragRef.current = null
              setHoverId(null)
            }}
          >
            {visibleEdges.map(([s, t]) => {
              const ps = positions.get(s)!, pt = positions.get(t)!
              const lit = focusSet ? focusSet.has(s) && focusSet.has(t) : true
              return (
                <line
                  key={s + t}
                  x1={ps.x} y1={ps.y} x2={pt.x} y2={pt.y}
                  stroke={lit ? 'var(--m3-primary)' : 'var(--m3-outline-variant)'}
                  strokeOpacity={lit ? 0.55 : 0.35}
                  strokeWidth={lit ? 1.6 : 1}
                />
              )
            })}
            {visibleNodes.map(n => {
              const p = positions.get(n.id)!
              const dim = focusSet ? !focusSet.has(n.id) : false
              const isSel = n.id === selectedId
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x},${p.y})`}
                  opacity={dim ? 0.28 : 1}
                  className="cursor-pointer"
                  onPointerDown={e => {
                    dragRef.current = { id: n.id, sx: e.clientX, sy: e.clientY }
                  }}
                  onPointerUp={e => {
                    const d = dragRef.current
                    dragRef.current = null
                    if (d && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) setSelectedId(n.id)
                  }}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {n.kind === 'memory' ? (
                    <>
                      {isSel && <circle r={15} fill="none" stroke="var(--m3-primary)" strokeOpacity={0.5} strokeWidth={2} />}
                      <circle r={10} fill="var(--m3-surface-container-high)" stroke={SOURCE_COLOR[n.doc!.source]} strokeWidth={2.2} />
                    </>
                  ) : (
                    <>
                      {isSel && <circle r={12} fill="none" stroke="var(--m3-tertiary)" strokeOpacity={0.5} strokeWidth={2} />}
                      <circle r={7} fill="var(--m3-tertiary)" />
                    </>
                  )}
                  <text
                    y={n.kind === 'memory' ? 24 : 20}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill="var(--m3-on-surface-variant)"
                    fontWeight={isSel ? 700 : 400}
                  >
                    {n.label.length > 14 ? n.label.slice(0, 13) + '…' : n.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </Card>

        {/* 인스펙터 */}
        <Card className="w-80 shrink-0 p-5 flex flex-col">
          {selected ? (
            selected.kind === 'memory' && selected.doc ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spatialExpressive} className="flex flex-col h-full">
                <div className="flex items-center gap-2.5 mb-3">
                  <SourceBadge source={selected.doc.source} size={32} />
                  <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                    {sourceName(selected.doc.source)} · {selected.doc.updated}
                  </span>
                </div>
                <h3 className="font-bold text-[15px] leading-snug">{selected.doc.title}</h3>
                <p className="text-[13px] text-[var(--m3-on-surface-variant)] leading-relaxed mt-2">{selected.doc.snippet}</p>
                <div className="text-[11px] text-[var(--m3-on-surface-variant)] mt-3 space-y-1">
                  <div>Owner: {selected.doc.owner}</div>
                  <div className="font-mono opacity-70">md_files/{selected.doc.source}-{String(selected.doc.id).padStart(4, '0')}.md</div>
                </div>
                <div className="flex-1" />
                <ActionButton size="small" variant="brandSolid" onClick={() => onAsk(`Summarize the key points of ${selected.doc!.title}`)}>
                  Ask about this doc <IconArrowRegular width={14} height={14} />
                </ActionButton>
              </motion.div>
            ) : (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spatialExpressive} className="flex flex-col h-full">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-8 h-8 rounded-full bg-[var(--m3-tertiary-container)] text-[var(--m3-on-tertiary-container)] grid place-items-center text-[13px] font-bold" aria-hidden>
                    {selected.label[0]}
                  </span>
                  <div>
                    <div className="font-bold text-[15px]">{selected.label}</div>
                    <div className="text-[11px] text-[var(--m3-on-surface-variant)]">Entity · {selectedEntityDocs.length} links</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {selectedEntityDocs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setSelectedId(n.id)}
                      className="w-full text-left text-[13px] px-3 py-2 rounded-xl bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] transition-colors truncate"
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <ActionButton size="small" variant="brandSolid" onClick={() => onAsk(`Brief me on everything about ${selected.label}`)}>
                  Ask about this topic <IconArrowRegular width={14} height={14} />
                </ActionButton>
              </motion.div>
            )
          ) : (
            <div className="m-auto text-center text-[13px] text-[var(--m3-on-surface-variant)]">
              Select a node to see
              <br />
              its evidence and raw source here
            </div>
          )}
        </Card>
      </div>

      {/* 검색 + 문서 목록 */}
      <div className="relative mb-5 max-w-xl">
        <IconSearchRegular
          width={17}
          height={17}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--m3-on-surface-variant)]"
        />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search memory (e.g. price sheet, returns)"
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[var(--m3-surface-container)] outline-none text-[15px] focus:ring-2 focus:ring-[var(--m3-primary)]"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 pb-4">
        {filteredDocs.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spatialExpressive, delay: i * 0.03 }}>
            <button className="w-full h-full text-left" onClick={() => setSelectedId(`d-${d.id}`)}>
              <Card className={`p-4 h-full transition-shadow ${selectedId === `d-${d.id}` ? 'ring-2 ring-[var(--m3-primary)]' : 'hover:shadow-[0_6px_20px_rgba(0,0,0,.10)]'}`}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <SourceBadge source={d.source} size={28} />
                  <span className="text-[11px] text-[var(--m3-on-surface-variant)]">
                    {sourceName(d.source)} · {d.updated}
                  </span>
                </div>
                <div className="font-semibold text-[14px] leading-snug">{d.title}</div>
                <p className="text-[12px] text-[var(--m3-on-surface-variant)] leading-relaxed mt-1.5 line-clamp-2">{d.snippet}</p>
              </Card>
            </button>
          </motion.div>
        ))}
      </div>

      <p className="text-[11px] text-[var(--m3-on-surface-variant)] text-center pb-4">
        The graph shows only memory you’re allowed to see — an edge is drawn only when both ends are visible to you.
      </p>
    </div>
  )
}
