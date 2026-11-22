import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  TonalPalette,
  Variant,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities'

// The colour chart of this site (see also global.css):
// petrol blue as the main colour, copper as its warm complementary accent
export const DEFAULT_PRIMARY = '#0E6170'
export const DEFAULT_SECONDARY = '#A9502C'
// Light-mode page canvas. Views, the app bar and other page surfaces use
// this too, so the layout is one colour.
export const LIGHT_BACKGROUND = '#F3F3F3'

export function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function getCurrentTheme(theme) {
  // the site is light unless the user picks another theme
  if (theme === undefined) return 'light'
  return theme === 'system' ? getSystemTheme() : theme
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

export function applyColors(
  primaryHex = DEFAULT_PRIMARY,
  secondaryHex = DEFAULT_SECONDARY,
  isDark = false
) {
  const primaryHct = Hct.fromInt(argbFromHex(primaryHex))
  const secondaryHct = Hct.fromInt(argbFromHex(secondaryHex))
  const secondaryPalette = TonalPalette.fromHueAndChroma(
    secondaryHct.hue,
    secondaryHct.chroma
  )

  const primaryPalette = TonalPalette.fromHueAndChroma(
    primaryHct.hue,
    primaryHct.chroma
  )

  const scheme = new DynamicScheme({
    sourceColorHct: primaryHct,
    variant: Variant.TONAL_SPOT,
    isDark,
    contrastLevel: 0,
    // Preserve the seed's own hue+chroma rather than TONAL_SPOT's fixed values.
    primaryPalette,
    secondaryPalette,
    // Chroma 0 → pure neutral grays; no hue tint bleeds into surfaces.
    neutralPalette: TonalPalette.fromHueAndChroma(primaryHct.hue, 0),
    neutralVariantPalette: TonalPalette.fromHueAndChroma(primaryHct.hue, 0),
  })

  const root = document.documentElement
  for (const [name, color] of Object.entries(MaterialDynamicColors)) {
    if (typeof color?.getArgb !== 'function') continue
    root.style.setProperty(
      `--md-sys-color-${toKebabCase(name)}`,
      hexFromArgb(color.getArgb(scheme))
    )
  }

  // Primary: use seed's own tone clamped to [30, 50] so users see their chosen
  // colour on primary buttons. Tone 30-50 always reads white on-primary text.
  const primaryTone = isDark
    ? Math.min(80, Math.max(60, Math.round(primaryHct.tone)))
    : Math.min(50, Math.max(30, Math.round(primaryHct.tone)))
  root.style.setProperty(
    '--md-sys-color-primary',
    hexFromArgb(primaryPalette.tone(primaryTone))
  )

  // M3 achromatic tones 90-98 are darker than expected for a web app.
  // Light-mode page, views and app bar share the off-white canvas. Dialogs
  // stay white so they still lift off it.
  if (!isDark) {
    root.style.setProperty('--md-sys-color-background', LIGHT_BACKGROUND)
    root.style.setProperty('--md-sys-color-surface', LIGHT_BACKGROUND)
    root.style.setProperty(
      '--md-sys-color-surface-container-lowest',
      LIGHT_BACKGROUND
    )
    root.style.setProperty(
      '--md-sys-color-surface-container-low',
      LIGHT_BACKGROUND
    )
    root.style.setProperty('--md-sys-color-surface-container', LIGHT_BACKGROUND)
    // high → dialogs, raised surfaces: white (md-dialog uses this token)
    root.style.setProperty('--md-sys-color-surface-container-high', '#ffffff')
    // highest → filled text-field/select backgrounds: light gray
    root.style.setProperty(
      '--md-sys-color-surface-container-highest',
      'rgb(235, 235, 235)'
    )
  }

  // Action color for edit/add/delete buttons: clamp tone to a readable range
  // so very light or very dark seeds still contrast against their background.
  const actionTone = isDark
    ? Math.min(80, Math.max(60, Math.round(secondaryHct.tone)))
    : Math.min(55, Math.max(30, Math.round(secondaryHct.tone)))
  root.style.setProperty(
    '--mdc-theme-secondary',
    hexFromArgb(secondaryPalette.tone(actionTone))
  )
  root.style.setProperty(
    '--mdc-theme-on-secondary',
    actionTone < 60 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)'
  )

  // The browser bar on mobile matches the app bar, which uses the surface colour.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      root.style.getPropertyValue('--md-sys-color-surface')
    )
}

export function applyScheme(
  primaryHex = DEFAULT_PRIMARY,
  secondaryHex = DEFAULT_SECONDARY,
  theme
) {
  const isDark = getCurrentTheme(theme) === 'dark'
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  applyColors(primaryHex, secondaryHex, isDark)
}
