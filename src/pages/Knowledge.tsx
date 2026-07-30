import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { drag } from 'd3-drag'
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { ActionButton } from 'seed-design/ui/action-button'
import { IconSearchRegular, IconArrowRegular } from '@seed-design/icon'
import { docs, type Doc } from '../data'
import { Card, PageHeader, SourceBadge, sourceName } from '../components/ui'
import { spatialExpressive } from '../motion'

/* ---------- 그래프 데이터: 메모리 노드(문서) + 엔티티 노드 ---------- */

type GNode = SimulationNodeDatum & {
  id: string
  kind: 'memory' | 'entity'
  label: string
  doc?: Doc
}

type GLink = SimulationLinkDatum<GNode>

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

const W = 860
const H = 460

export default function Knowledge({ onAsk }: { onAsk: (prompt: string) => void }) {
  const [q, setQ] = useState('')
  const [showEntities, setShowEntities] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>('d-1')
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<GNode, GLink> | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

  const neighborMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const [s, t] of EDGES) {
      if (!m.has(s)) m.set(s, new Set())
      if (!m.has(t)) m.set(t, new Set())
      m.get(s)!.add(t)
      m.get(t)!.add(s)
    }
    return m
  }, [])

  /* d3-force + d3-zoom + d3-drag — 실시간 시뮬레이션 그래프 */
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svg = select(svgEl)
    svg.selectAll('*').remove()

    const nodes: GNode[] = [
      ...docs.map(d => ({ id: `d-${d.id}`, kind: 'memory' as const, label: d.title, doc: d })),
      ...(showEntities ? ENTITIES.map(e => ({ id: e.id, kind: 'entity' as const, label: e.label })) : []),
    ]
    const nodeIds = new Set(nodes.map(n => n.id))
    const links: GLink[] = EDGES.filter(([s, t]) => nodeIds.has(s) && nodeIds.has(t)).map(([s, t]) => ({ source: s, target: t }))

    const g = svg.append('g')

    const zb = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 3])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    svg.call(zb).on('dblclick.zoom', null)
    zoomRef.current = zb

    const sim = forceSimulation<GNode>(nodes)
      .force('charge', forceManyBody().strength(-260))
      .force('link', forceLink<GNode, GLink>(links).id(d => d.id).distance(l => ((l.source as GNode).kind === 'entity' || (l.target as GNode).kind === 'entity' ? 85 : 120)))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide<GNode>(d => (d.kind === 'memory' ? 34 : 26)))
    simRef.current = sim

    const link = g
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'var(--m3-outline-variant)')
      .attr('stroke-width', 1.2)

    const node = g
      .selectAll<SVGGElement, GNode>('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        drag<SVGGElement, GNode>()
          .on('start', (e, d) => {
            if (!e.active) sim.alphaTarget(0.25).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (e, d) => {
            d.fx = e.x
            d.fy = e.y
          })
          .on('end', (e, d) => {
            if (!e.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )
      .on('click', (_, d) => setSelectedId(d.id))
      .on('mouseenter', (_, d) => highlight(d.id))
      .on('mouseleave', () => highlight(selectedRef.current))

    node
      .append('circle')
      .attr('class', 'ring')
      .attr('r', d => (d.kind === 'memory' ? 15 : 12))
      .attr('fill', 'none')
      .attr('stroke', 'var(--m3-primary)')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0)

    node
      .filter(d => d.kind === 'memory')
      .append('circle')
      .attr('r', 10)
      .attr('fill', 'var(--m3-surface-container-high)')
      .attr('stroke', d => SOURCE_COLOR[d.doc!.source])
      .attr('stroke-width', 2.2)

    node
      .filter(d => d.kind === 'entity')
      .append('circle')
      .attr('r', 7)
      .attr('fill', 'var(--m3-tertiary)')

    node
      .append('text')
      .attr('y', d => (d.kind === 'memory' ? 24 : 20))
      .attr('text-anchor', 'middle')
      .attr('font-size', 10.5)
      .attr('fill', 'var(--m3-on-surface-variant)')
      .text(d => (d.label.length > 15 ? d.label.slice(0, 14) + '…' : d.label))

    const highlight = (focus: string | null) => {
      const set = focus ? new Set([focus, ...(neighborMap.get(focus) ?? [])]) : null
      node.attr('opacity', d => (set && !set.has(d.id) ? 0.25 : 1))
      link
        .attr('stroke', l => {
          const s = (l.source as GNode).id
          const t = (l.target as GNode).id
          return set && set.has(s) && set.has(t) ? 'var(--m3-primary)' : 'var(--m3-outline-variant)'
        })
        .attr('stroke-opacity', l => {
          const s = (l.source as GNode).id
          const t = (l.target as GNode).id
          return set ? (set.has(s) && set.has(t) ? 0.7 : 0.25) : 0.6
        })
      node.select<SVGCircleElement>('circle.ring').attr('stroke-opacity', d => (d.id === selectedRef.current ? 0.6 : 0))
    }

    sim.on('tick', () => {
      link
        .attr('x1', l => (l.source as GNode).x!)
        .attr('y1', l => (l.source as GNode).y!)
        .attr('x2', l => (l.target as GNode).x!)
        .attr('y2', l => (l.target as GNode).y!)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    highlight(selectedRef.current)
    ;(svgEl as unknown as { __highlight?: (f: string | null) => void }).__highlight = highlight

    return () => {
      sim.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEntities])

  // 선택 변경 시 하이라이트 갱신 (재시뮬레이션 없이)
  useEffect(() => {
    const fn = (svgRef.current as unknown as { __highlight?: (f: string | null) => void } | null)?.__highlight
    fn?.(selectedId)
  }, [selectedId])

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)
  }

  const nodes = useMemo(
    () => [
      ...docs.map(d => ({ id: `d-${d.id}`, kind: 'memory' as const, label: d.title, doc: d })),
      ...ENTITIES.map(e => ({ id: e.id, kind: 'entity' as const, label: e.label })),
    ],
    [],
  )
  const selected = nodes.find(n => n.id === selectedId) ?? null
  const selectedEntityDocs =
    selected?.kind === 'entity'
      ? nodes.filter(n => n.kind === 'memory' && neighborMap.get(selected.id)?.has(n.id))
      : []

  const filteredDocs = docs.filter(
    d => !q.trim() || (d.title + d.snippet + d.owner + sourceName(d.source)).toLowerCase().includes(q.toLowerCase()),
  )

  return (
    <div className="max-w-6xl w-full mx-auto">
      <PageHeader
        title="Company Memory"
        right={
          <span className="text-xs text-[var(--m3-on-surface-variant)] bg-[var(--m3-surface-container)] rounded-lg px-3 py-1.5">
            204 docs · 38 entities · 122 links · compiled 5 min ago
          </span>
        }
      />

      <div className="flex gap-5 mb-6">
        {/* 그래프 캔버스 — 휠 줌 · 배경 드래그 팬 · 노드 드래그 */}
        <Card className="flex-1 min-w-0 overflow-hidden relative">
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              onClick={resetZoom}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)] hover:bg-[var(--m3-surface-container-high)] transition-colors"
            >
              Reset view
            </button>
            <button
              onClick={() => setShowEntities(v => !v)}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${
                showEntities
                  ? 'bg-[var(--m3-secondary-container)] text-[var(--m3-on-secondary-container)]'
                  : 'bg-[var(--m3-surface-container)] text-[var(--m3-on-surface-variant)]'
              }`}
            >
              Entities
            </button>
          </div>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full select-none touch-none" />
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
                      className="w-full text-left text-[13px] px-3 py-2 rounded-lg bg-[var(--m3-surface-container)] hover:bg-[var(--m3-surface-container-high)] transition-colors truncate"
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
          className="w-full h-11 pl-11 pr-4 rounded-lg bg-[var(--m3-surface-container)] outline-none text-[14px] focus:ring-2 focus:ring-[var(--m3-primary)]"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 pb-6">
        {filteredDocs.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spatialExpressive, delay: i * 0.03 }}>
            <button className="w-full h-full text-left" onClick={() => setSelectedId(`d-${d.id}`)}>
              <Card className={`p-4 h-full transition-shadow ${selectedId === `d-${d.id}` ? 'ring-1 ring-[var(--m3-primary)]' : 'hover:bg-[var(--m3-surface-container-low)]'}`}>
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
    </div>
  )
}
