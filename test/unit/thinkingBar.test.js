import {describe, it, expect, afterEach} from 'vitest'
import {
  THINKING_BAR_COLORS,
  GrampsjsThinkingBar,
} from '../../src/components/GrampsjsThinkingBar.js'

describe('thinking bar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('loops the same colour at both ends of a 300% gradient', () => {
    const css = GrampsjsThinkingBar.styles.cssText
    expect(THINKING_BAR_COLORS).toEqual([
      '#4285f4',
      '#9b72cb',
      '#d96570',
      '#f9ab00',
    ])
    expect(css).toContain('background-size: 300% 100%')
    expect(css).toContain('background-position: -300% 0')
    expect(css).toContain('#4285f4')
    expect(css).toContain('mask-image')
    expect(css).toContain('transparent')
  })

  it('is a progressbar with an optional label', async () => {
    const bar = document.createElement('grampsjs-thinking-bar')
    bar.label = 'Loading...'
    document.body.append(bar)
    await bar.updateComplete
    expect(bar.getAttribute('role')).toBe('progressbar')
    expect(bar.getAttribute('aria-label')).toBe('Loading...')
  })
})
