import { argbFromHex, hexFromArgb, themeFromSourceColor } from '@material/material-color-utilities'

// Onflow 브랜드 시드 컬러 — M3 스킴 전체가 여기서 파생된다
const SOURCE = '#4E5FD9'

const theme = themeFromSourceColor(argbFromHex(SOURCE))

type Mode = 'light' | 'dark'

function buildVars(mode: Mode): Record<string, string> {
  const s = theme.schemes[mode]
  const n = theme.palettes.neutral
  const hex = (argb: number) => hexFromArgb(argb)
  const tone = (t: number) => hexFromArgb(n.tone(t))
  const light = mode === 'light'

  return {
    '--m3-primary': hex(s.primary),
    '--m3-on-primary': hex(s.onPrimary),
    '--m3-primary-container': hex(s.primaryContainer),
    '--m3-on-primary-container': hex(s.onPrimaryContainer),
    '--m3-secondary': hex(s.secondary),
    '--m3-secondary-container': hex(s.secondaryContainer),
    '--m3-on-secondary-container': hex(s.onSecondaryContainer),
    '--m3-tertiary': hex(s.tertiary),
    '--m3-tertiary-container': hex(s.tertiaryContainer),
    '--m3-on-tertiary-container': hex(s.onTertiaryContainer),
    '--m3-error': hex(s.error),
    '--m3-error-container': hex(s.errorContainer),
    '--m3-on-error-container': hex(s.onErrorContainer),
    // 라이트 표면은 하늘빛 에어리 톤 (Aside 레퍼런스) — 다크는 M3 뉴트럴 유지
    '--m3-surface': light ? '#eef4fa' : tone(6),
    '--m3-surface-dim': light ? '#dde8f2' : tone(6),
    '--m3-surface-container-lowest': light ? '#ffffff' : tone(4),
    '--m3-surface-container-low': light ? '#f6fafd' : tone(10),
    '--m3-surface-container': light ? '#e4edf6' : tone(12),
    '--m3-surface-container-high': light ? '#d9e5f1' : tone(17),
    '--m3-surface-container-highest': light ? '#cedded' : tone(22),
    '--m3-on-surface': tone(light ? 10 : 90),
    '--m3-on-surface-variant': hex(s.onSurfaceVariant),
    '--m3-outline': hex(s.outline),
    '--m3-outline-variant': hex(s.outlineVariant),
    '--m3-inverse-surface': hex(s.inverseSurface),
    '--m3-inverse-on-surface': hex(s.inverseOnSurface),

    // SEED 브랜드 토큰을 M3 primary로 오버라이드 (당근 오렌지 제거)
    '--seed-color-bg-brand-solid': hex(s.primary),
    '--seed-color-bg-brand-solid-pressed': hexFromArgb(theme.palettes.primary.tone(light ? 35 : 85)),
    '--seed-color-bg-brand-weak': hex(s.primaryContainer),
    '--seed-color-bg-brand-weak-pressed': hexFromArgb(theme.palettes.primary.tone(light ? 85 : 25)),
    '--seed-color-fg-brand': light ? hex(s.primary) : hexFromArgb(theme.palettes.primary.tone(80)),
    '--seed-color-fg-brand-contrast': hex(s.onPrimary),
  }
}

export function applyTheme(mode: Mode) {
  const root = document.documentElement
  const vars = buildVars(mode)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.setAttribute('data-seed-color-mode', mode === 'dark' ? 'dark-only' : 'light-only')
  root.style.colorScheme = mode
}
