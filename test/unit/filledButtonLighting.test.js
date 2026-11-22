import {describe, it, expect, afterEach} from 'vitest'
import {MdFilledButton} from '@material/web/button/filled-button.js'
import {filledButtonLighting} from '../../src/filledButtonLighting.js'

describe('filled button lighting', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('adds the lighting style to md-filled-button', () => {
    expect(MdFilledButton.elementStyles).toContain(filledButtonLighting)
  })

  it('uses four shadow layers, a face gradient, and an inverted press', () => {
    const css = filledButtonLighting.cssText
    expect(css).toMatch(/inset\s+0\s+1px\s+0/)
    expect(css).toMatch(/inset\s+0\s+-2px\s+0/)
    expect(css).toMatch(/0\s+1px\s+2px/)
    expect(css).toMatch(/0\s+8px\s+24px\s+-6px/)
    expect(css).toContain('linear-gradient')
    expect(css).toContain(':host(:active:not([disabled], [soft-disabled]))')
    expect(css).toContain('box-shadow: none')
  })

  it('keeps lighting on a button that overrides the fill colour', async () => {
    const button = document.createElement('md-filled-button')
    button.style.setProperty(
      '--md-filled-button-container-color',
      'var(--md-sys-color-error, #b3261e)'
    )
    button.textContent = 'Save'
    document.body.append(button)
    await button.updateComplete

    const css = [...button.shadowRoot.adoptedStyleSheets]
      .map(sheet => {
        try {
          return [...sheet.cssRules].map(rule => rule.cssText).join('\n')
        } catch {
          return ''
        }
      })
      .join('\n')
    expect(css).toMatch(/inset\s+0\s+1px\s+0/)
    expect(css).toMatch(/0\s+8px\s+24px\s+-6px/)
  })
})
