import {afterEach, describe, expect, it} from 'vitest'
import {html, render} from 'lit'
import '@material/web/menu/menu-item.js'
import '../../src/components/GrampsjsSplitButton.js'
import {
  primaryAddItem,
  labelledAddAction,
  ADD_MENU_ITEMS,
} from '../../src/components/GrampsjsAddMenu.js'

const mounted = []

const appState = {i18n: {lang: 'en', strings: {'More actions': 'More actions'}}}

async function mountSplit(props = {}, items = []) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(host)
  render(
    html`<grampsjs-split-button
      .appState="${appState}"
      label="${props.label ?? 'Save'}"
      variant="${props.variant ?? 'filled'}"
      ?compact="${props.compact ?? false}"
      href="${props.href ?? ''}"
    >
      ${items.map(
        item => html`<md-menu-item
          ><span slot="headline">${item}</span></md-menu-item
        >`
      )}
    </grampsjs-split-button>`,
    host
  )
  const el = host.querySelector('grampsjs-split-button')
  await el.updateComplete
  // slotchange runs after the first render
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const $ = (el, selector) => el.shadowRoot.querySelector(selector)

describe('GrampsjsSplitButton', () => {
  it('runs the primary action from the leading half', async () => {
    const el = await mountSplit({label: 'Save'}, ['Save as'])
    const events = []
    el.addEventListener('split-button:primary', () => events.push('primary'))
    $(el, '#btn-primary').click()
    expect(events).toEqual(['primary'])
  })

  it('opens the menu from the chevron', async () => {
    const el = await mountSplit({label: 'Save'}, ['Save as', 'Export'])
    const menuBtn = $(el, '#btn-menu')
    expect(menuBtn.getAttribute('aria-label')).toBe('More actions')
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false')
    menuBtn.click()
    await el.updateComplete
    expect($(el, 'md-menu').open).toBe(true)
    expect(menuBtn.getAttribute('aria-expanded')).toBe('true')
  })

  it('uses an icon button for the compact chevron', async () => {
    const el = await mountSplit({label: 'Save', compact: true}, ['Save as'])
    expect($(el, 'md-filled-icon-button.primary')).not.toBeNull()
    expect($(el, 'md-filled-icon-button.menu-btn')).not.toBeNull()
  })
})

describe('Add menu last-used type', () => {
  it('defaults to Person', () => {
    expect(primaryAddItem(ADD_MENU_ITEMS, undefined)[0]).toBe('Person')
  })

  it('uses the last chosen type as the primary action', () => {
    expect(primaryAddItem(ADD_MENU_ITEMS, 'Event')[1]).toBe('/new_event')
  })

  it('falls back to Person for an unknown last type', () => {
    expect(primaryAddItem(ADD_MENU_ITEMS, 'Not a type')[0]).toBe('Person')
  })

  it('keeps Add and the object type in one language', () => {
    const strings = {Add: 'Lisää', Person: 'Henkilö'}
    const _ = s => strings[s] ?? s
    expect(labelledAddAction(_, 'Person')).toBe('Lisää Henkilö')
  })
})
