import {afterEach, describe, expect, it, vi} from 'vitest'
import '../../src/components/GrampsjsShareUrl.js'

const mounted = []

async function mount(props) {
  const el = document.createElement('grampsjs-share-url')
  Object.assign(el, {
    appState: {i18n: {lang: 'en', strings: {}}},
    href: 'https://example.test/person/I0001',
    ...props,
  })
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
  vi.unstubAllGlobals()
})

describe('GrampsjsShareUrl', () => {
  it('is a single copy button without share or a Gramps ID', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: {writeText: vi.fn(async () => {})},
    })
    const el = await mount({grampsId: ''})
    expect(el.shadowRoot.querySelector('grampsjs-split-button')).toBeNull()
    expect(el.shadowRoot.querySelector('md-icon-button')).not.toBeNull()
  })

  it('splits share from copy when the Web Share API is available', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      share: vi.fn(async () => {}),
      clipboard: {writeText: vi.fn(async () => {})},
    })
    const el = await mount({grampsId: 'I0001'})
    expect(el.shadowRoot.querySelector('grampsjs-split-button')).not.toBeNull()
    const items = [...el.shadowRoot.querySelectorAll('md-menu-item')]
    expect(items.map(item => item.textContent.trim())).toEqual([
      'Copy URL',
      'Copy Gramps ID',
    ])
    el.shadowRoot
      .querySelector('grampsjs-split-button')
      .dispatchEvent(
        new CustomEvent('split-button:primary', {bubbles: true, composed: true})
      )
    expect(navigator.share).toHaveBeenCalledWith({
      url: 'https://example.test/person/I0001',
    })
  })
})
