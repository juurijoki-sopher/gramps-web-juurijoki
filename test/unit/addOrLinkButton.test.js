import {afterEach, describe, expect, it} from 'vitest'
import '../../src/components/GrampsjsAddOrLinkButton.js'

const mounted = []

async function mount() {
  const el = document.createElement('grampsjs-add-or-link-button')
  el.appState = {
    i18n: {
      lang: 'en',
      strings: {
        'Create new': 'Create new',
        'Select existing': 'Select existing',
        'More actions': 'More actions',
      },
    },
  }
  el.addLabel = 'Add a new person'
  el.linkLabel = 'Select an existing person'
  const events = []
  el.addEventListener('add-or-link:add', () => events.push('add'))
  el.addEventListener('add-or-link:link', () => events.push('link'))
  el.events = events
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

describe('GrampsjsAddOrLinkButton', () => {
  it('creates from the leading half', async () => {
    const el = await mount()
    const split = el.shadowRoot.querySelector('grampsjs-split-button')
    split.shadowRoot.querySelector('#btn-primary').click()
    expect(el.events).toEqual(['add'])
  })

  it('lists create and link in the menu', async () => {
    const el = await mount()
    const items = [...el.shadowRoot.querySelectorAll('md-menu-item')]
    expect(items.map(item => item.textContent.trim())).toEqual([
      'Add a new person',
      'Select an existing person',
    ])
    items[1].click()
    expect(el.events).toEqual(['link'])
  })
})
