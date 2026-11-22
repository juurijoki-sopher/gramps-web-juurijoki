import {afterEach, describe, expect, it} from 'vitest'
import {
  applyColors,
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  LIGHT_BACKGROUND,
} from '../../src/theme.js'

function token(name) {
  return document.documentElement.style.getPropertyValue(name)
}

afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('applyColors light canvas', () => {
  it('uses off-white for the page and views, white for dialogs', () => {
    applyColors(DEFAULT_PRIMARY, DEFAULT_SECONDARY, false)
    expect(token('--md-sys-color-background')).toBe(LIGHT_BACKGROUND)
    expect(token('--md-sys-color-surface')).toBe(LIGHT_BACKGROUND)
    expect(token('--md-sys-color-surface-container-low')).toBe(LIGHT_BACKGROUND)
    expect(token('--md-sys-color-surface-container-high')).toBe('#ffffff')
  })

  it('does not apply the light canvas in dark mode', () => {
    applyColors(DEFAULT_PRIMARY, DEFAULT_SECONDARY, true)
    expect(token('--md-sys-color-background')).not.toBe(LIGHT_BACKGROUND)
    expect(token('--md-sys-color-background')).not.toBe('')
  })
})
