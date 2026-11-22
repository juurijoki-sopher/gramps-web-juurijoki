import {describe, it, expect, afterEach, vi} from 'vitest'
import {emptyDate} from '../../src/util.js'
import '../../src/components/GrampsjsResearchProposals.js'

const mounted = []

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
})

const proposalCitation = {
  handle: 'c1',
  source_handle: 's1',
  page: '12',
  confidence: 1,
  attribute_list: [
    {_class: 'Attribute', type: 'Research status', value: 'proposed'},
    {_class: 'Attribute', type: 'Proposed event', value: 'Birth'},
    {_class: 'Attribute', type: 'Proposed date', value: '23.4.1811'},
    {_class: 'Attribute', type: 'Proposed place', value: 'Kerimäki'},
  ],
}

function person(date) {
  return {
    handle: 'self',
    gramps_id: 'I1',
    primary_name: {
      first_name: 'Juho',
      surname_list: [{surname: 'Virtanen'}],
    },
    alternate_names: [],
    profile: {
      name_given: 'Juho',
      name_surname: 'Virtanen',
      birth: {date: '1811', place: 'Turku'},
    },
    citation_list: ['c1'],
    extended: {
      citations: [proposalCitation],
      events: [{handle: 'e1', type: 'Birth', date, place: ''}],
    },
  }
}

async function mount(date) {
  const el = document.createElement('grampsjs-research-proposals')
  const actions = []
  el.appState = {
    i18n: {lang: 'en', strings: {}},
    permissions: {canEdit: true},
    apiGet: vi.fn(async endpoint => {
      if (String(endpoint).startsWith('/api/filters/')) {
        return {data: {rules: [{rule: 'HasSourceOf'}]}}
      }
      if (String(endpoint).startsWith('/api/sources/')) {
        return {data: {handle: 's1', gramps_id: 'S0001', title: 'HisKi'}}
      }
      if (String(endpoint).startsWith('/api/people/')) {
        return {
          data: [
            {
              handle: 'other',
              gramps_id: 'I2',
              profile: {name_given: 'Maija', name_surname: 'Virtanen'},
            },
          ],
        }
      }
      if (String(endpoint).startsWith('/api/search/')) {
        return {
          data: [
            {
              object: {
                handle: 'near',
                gramps_id: 'I3',
                profile: {
                  name_given: 'Johan',
                  name_surname: 'Virtanen',
                  birth: {date: '1812'},
                },
              },
            },
          ],
        }
      }
      return {data: []}
    }),
  }
  el.addEventListener('edit:action', e => actions.push(e.detail))
  el.actions = actions
  el.person = person(date)
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  await vi.waitFor(() => {
    expect(el.shadowRoot.textContent).toContain('Maija')
  })
  return el
}

describe('research panel', () => {
  it('offers a missing name spelling and stores it as an alternate name', async () => {
    const el = await mount({...emptyDate})
    const button = [...el.shadowRoot.querySelectorAll('md-text-button')].find(
      item => item.textContent.includes('Johan')
    )
    button.click()
    expect(el.actions).toEqual([
      {
        action: 'updateProp',
        data: {
          alternate_names: [
            {
              _class: 'Name',
              type: 'Also Known As',
              first_name: 'Johan',
              surname_list: [{surname: 'Virtanen'}],
            },
          ],
        },
      },
    ])
  })

  it('shows same-source people and close name matches from this tree', async () => {
    const el = await mount({...emptyDate})
    const text = el.shadowRoot.textContent
    expect(text).toContain('Other people with this source')
    expect(text).toContain('Maija Virtanen')
    expect(text).toContain('Possible matches in this tree')
    expect(text).toContain('Johan Virtanen')
  })

  it('keeps a filled date and still allows a new event', async () => {
    const el = await mount({
      ...emptyDate,
      dateval: [1, 1, 1800, false],
      sortval: 1,
    })
    expect(el.shadowRoot.textContent).toContain('The existing date stays.')
    const boxes = [...el.shadowRoot.querySelectorAll('md-checkbox')]
    const dateBox = boxes[1]
    expect(dateBox.disabled).toBe(true)
    boxes[0].dispatchEvent(new Event('change'))
    boxes[0].checked = true
    boxes[0].dispatchEvent(new Event('change'))
    await el.updateComplete
    const enabled = [...el.shadowRoot.querySelectorAll('md-checkbox')][1]
    expect(enabled.disabled).toBe(false)
  })
})
