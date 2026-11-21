import {describe, it, expect, afterEach} from 'vitest'
import {rollingParts} from '../../src/components/GrampsjsRollingNumber.js'

const mounted = []
afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

async function mount(props) {
  const el = document.createElement('grampsjs-rolling-number')
  Object.assign(el, props)
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  return el
}

describe('rollingParts', () => {
  it('splits digits from separators', () => {
    expect(rollingParts('2 157')).toEqual([
      ['2', 2],
      [' ', null],
      ['1', 1],
      ['5', 5],
      ['7', 7],
    ])
  })
})

describe('grampsjs-rolling-number', () => {
  it('gives screen readers the whole formatted number', async () => {
    const el = await mount({value: 2157, lang: 'en'})
    expect(el.shadowRoot.querySelector('.visually-hidden').textContent).toBe(
      '2,157'
    )
    expect(
      el.shadowRoot.querySelector('.digits').getAttribute('aria-hidden')
    ).toBe('true')
  })

  it('renders one rolling column per digit, starting at 0', async () => {
    const el = await mount({value: 529, lang: 'en'})
    const strips = [...el.shadowRoot.querySelectorAll('.strip')]
    expect(strips).toHaveLength(3)
    expect(strips.map(s => s.style.getPropertyValue('--digit').trim())).toEqual(
      ['0', '0', '0']
    )
    expect(strips.map(s => s.style.getPropertyValue('--index').trim())).toEqual(
      ['0', '1', '2']
    )
  })

  it('rolls to the value once rendered', async () => {
    const el = await mount({value: 529, lang: 'en'})
    el._rolled = true
    await el.updateComplete
    const strips = [...el.shadowRoot.querySelectorAll('.strip')]
    expect(strips.map(s => s.style.getPropertyValue('--digit').trim())).toEqual(
      ['5', '2', '9']
    )
  })
})
