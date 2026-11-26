import {describe, expect, it} from 'vitest'
import {emptyDate} from '../../src/util.js'
import {
  acceptedCitation,
  acceptancePlan,
  buildCitation,
  buildEvent,
  catalogueHasRule,
  eventFill,
  eventOfType,
  exactPlace,
  exactTitle,
  fieldDecision,
  gregorianSdn,
  formatStoredDate,
  parseDateText,
  peopleFromBacklinks,
  personAfterAccept,
  proposalsFromCitations,
  readProposal,
  splitRecord,
  unfinishedAcceptEvent,
} from '../../src/researchProposal.js'

const filledDate = {
  ...emptyDate,
  dateval: [23, 4, 1811, false],
  sortval: 1,
}

describe('proposal citation', () => {
  it('stores the suggestion as attributes and a low confidence', () => {
    const citation = buildCitation({
      handle: 'c1',
      sourceHandle: 's1',
      page: '12',
      url: '',
      eventType: 'Birth',
      dateText: '23.4.1811',
      placeText: 'Kerimäki',
    })
    expect(citation.confidence).toBe(1)
    expect(readProposal(citation)).toMatchObject({
      handle: 'c1',
      sourceHandle: 's1',
      page: '12',
      eventType: 'Birth',
      dateText: '23.4.1811',
      placeText: 'Kerimäki',
    })
  })

  it('treats a web address as both the page and the record URL', () => {
    expect(splitRecord(' https://hiski.genealogia.fi/hiski/abc ')).toEqual({
      page: 'https://hiski.genealogia.fi/hiski/abc',
      url: 'https://hiski.genealogia.fi/hiski/abc',
    })
    expect(splitRecord('s. 12')).toEqual({page: 's. 12', url: ''})
  })

  it('ignores a citation that is not an open proposal', () => {
    expect(proposalsFromCitations([{attribute_list: []}])).toEqual([])
  })

  it('reuses a source or place only on an exact title', () => {
    expect(
      exactTitle([{title: 'HisKi extra'}, {title: 'HisKi'}], 'hiski')?.title
    ).toBe('HisKi')
    expect(
      exactPlace([{name: {value: 'Turku'}}, {name: 'Åbo'}], 'åbo')?.name
    ).toBe('Åbo')
  })
})

describe('date text', () => {
  it('reads a Finnish date, a year and an ISO date', () => {
    expect(parseDateText('23.4.1811').dateval).toEqual([23, 4, 1811, false])
    expect(parseDateText('1811').dateval).toEqual([0, 0, 1811, false])
    expect(parseDateText('1811-04-23').dateval).toEqual([23, 4, 1811, false])
    expect(parseDateText('1811-04-23').sortval).toBe(gregorianSdn(1811, 4, 23))
  })

  it('keeps an unparsed phrase as a text-only date', () => {
    expect(parseDateText('kevät 1811').modifier).toBe(6)
    expect(parseDateText('kevät 1811').text).toBe('kevät 1811')
  })

  it('uses the Gregorian serial day of 1 January 2000', () => {
    expect(gregorianSdn(2000, 1, 1)).toBe(2451545)
  })

  it('prints a stored date and skips an empty one', () => {
    expect(formatStoredDate(parseDateText('23.4.1811'))).toBe('23.4.1811')
    expect(formatStoredDate(emptyDate)).toBe('')
  })
})

describe('acceptance', () => {
  const proposal = {
    handle: 'c1',
    eventType: 'Birth',
    dateText: '23.4.1811',
    placeText: 'Kerimäki',
  }
  const person = {
    extended: {
      events: [
        {handle: 'e1', type: 'Birth', date: emptyDate, place: ''},
        {handle: 'e2', type: 'Death', date: filledDate},
      ],
    },
  }

  it('fills an empty date and leaves a filled date in place', () => {
    const birth = eventOfType(person, 'Birth')
    const death = eventOfType(person, 'Death')
    expect(fieldDecision(birth, proposal).date.canFill).toBe(true)
    expect(fieldDecision(death, proposal).date.blocked).toBe(true)
    expect(
      acceptancePlan(birth, proposal, {
        useDate: true,
        usePlace: true,
        newEvent: false,
      })
    ).toMatchObject({
      ok: true,
      create: false,
      applyDate: true,
      applyPlace: true,
    })
    expect(
      acceptancePlan(death, proposal, {
        useDate: true,
        usePlace: false,
        newEvent: false,
      })
    ).toEqual({ok: false, reason: 'date-filled'})
  })

  it('puts the date on a new event when the existing date stays', () => {
    const death = eventOfType(person, 'Death')
    expect(
      acceptancePlan(death, proposal, {
        useDate: true,
        usePlace: false,
        newEvent: true,
      })
    ).toMatchObject({ok: true, create: true, applyDate: true})
  })

  it('writes the parsed date onto the existing event without replacing it blindly', () => {
    const birth = eventOfType(person, 'Birth')
    const plan = acceptancePlan(birth, proposal, {
      useDate: true,
      usePlace: false,
      newEvent: false,
    })
    expect(eventFill(birth, proposal, plan, null).date.dateval).toEqual([
      23,
      4,
      1811,
      false,
    ])
    const blocked = acceptancePlan(eventOfType(person, 'Death'), proposal, {
      useDate: true,
      usePlace: false,
      newEvent: false,
    })
    expect(blocked.ok).toBe(false)
  })

  it('creates an event with the citation attached', () => {
    const event = buildEvent({
      handle: 'e9',
      type: 'Birth',
      dateText: '1811',
      placeHandle: 'p1',
      citationHandle: 'c1',
    })
    expect(event.date.dateval).toEqual([0, 0, 1811, false])
    expect(event.place).toBe('p1')
    expect(event.citation_list).toEqual(['c1'])
  })

  it('clears the proposal and raises confidence when the record is accepted', () => {
    const citation = buildCitation({
      handle: 'c1',
      sourceHandle: 's1',
      page: 'https://example.test/1',
      url: 'https://example.test/1',
      eventType: 'Birth',
      dateText: '1811',
      placeText: 'Turku',
    })
    const accepted = acceptedCitation(citation)
    expect(accepted.confidence).toBe(2)
    expect(accepted.attribute_list.map(item => item.type)).toEqual([
      'Record URL',
    ])
    expect(readProposal(accepted)).toBeNull()
  })

  it('moves the citation onto the person event list', () => {
    expect(
      personAfterAccept(
        {
          citation_list: ['c1', 'c2'],
          event_ref_list: [{_class: 'EventRef', ref: 'e0', role: 'Primary'}],
        },
        {citationHandle: 'c1', addEventHandle: 'e9'}
      )
    ).toEqual({
      citation_list: ['c2'],
      event_ref_list: [
        {_class: 'EventRef', ref: 'e0', role: 'Primary'},
        {_class: 'EventRef', ref: 'e9', role: 'Primary'},
      ],
    })
  })
})

describe('same-source people', () => {
  it('detects the person source rule in the filter catalogue', () => {
    expect(
      catalogueHasRule({rules: [{rule: 'HasSourceOf'}]}, 'HasSourceOf')
    ).toBe(true)
    expect(catalogueHasRule({rules: [{rule: 'HasNote'}]}, 'HasSourceOf')).toBe(
      false
    )
  })

  it('lists other people linked from a citation', () => {
    expect(
      peopleFromBacklinks(
        {
          person: [
            {handle: 'self', gramps_id: 'I1'},
            'other',
            {handle: 'named', gramps_id: 'I3', profile: {name_given: 'Maija'}},
          ],
        },
        'self'
      )
    ).toEqual([
      {handle: 'other'},
      {handle: 'named', grampsId: 'I3', profile: {name_given: 'Maija'}},
    ])
  })
})

describe('unfinished acceptance', () => {
  const person = {event_ref_list: [{ref: 'E1'}]}

  it('finds the event an earlier acceptance created but did not link', () => {
    const events = [
      {handle: 'E1', type: 'Birth'},
      {handle: 'E2', type: 'Death'},
      {handle: 'E3', type: 'Birth'},
    ]
    expect(unfinishedAcceptEvent(events, person, 'Birth')?.handle).toBe('E3')
  })

  it('ignores events the person already has', () => {
    expect(
      unfinishedAcceptEvent([{handle: 'E1', type: 'Birth'}], person, 'Birth')
    ).toBeNull()
  })

  it('reads typed event types and skips missing events', () => {
    const events = [null, {handle: 'E4', type: {string: 'Burial'}}]
    expect(unfinishedAcceptEvent(events, person, 'Burial')?.handle).toBe('E4')
    expect(unfinishedAcceptEvent([], person, 'Burial')).toBeNull()
  })
})
