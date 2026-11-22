/*
A research proposal is an ordinary Gramps citation. Until it is accepted,
the suggested event, date and place live in citation attributes. Accepting
fills an empty event field or creates a new event. A filled date or place
is left as it is.
*/

import {makeHandle, dateIsEmpty, emptyDate, typeString} from './util.js'
import {normalizeName} from './nameVariants.js'

export const ATTR_STATUS = 'Research status'
export const ATTR_EVENT = 'Proposed event'
export const ATTR_DATE = 'Proposed date'
export const ATTR_PLACE = 'Proposed place'
export const ATTR_URL = 'Record URL'
export const STATUS_PROPOSED = 'proposed'

const PROPOSAL_FIELDS = new Set([
  ATTR_STATUS,
  ATTR_EVENT,
  ATTR_DATE,
  ATTR_PLACE,
])

export const COLLECTIONS = [
  {id: 'hiski', title: 'HisKi'},
  {id: 'arkisto', title: 'Kansallisarkisto'},
  {id: 'kirjasto', title: 'Kansalliskirjasto'},
]

export const PROPOSAL_EVENT_TYPES = [
  'Birth',
  'Baptism',
  'Christening',
  'Death',
  'Burial',
  'Marriage',
  'Residence',
  'Census',
]

export const SOURCE_PERSON_RULE = 'HasSourceOf'

function attribute(type, value) {
  return {_class: 'Attribute', type, value}
}

export function attributeValue(list, type) {
  return (list || []).find(item => item?.type === type)?.value ?? ''
}

export function isProposal(citation) {
  return (
    attributeValue(citation?.attribute_list, ATTR_STATUS) === STATUS_PROPOSED
  )
}

export function readProposal(citation) {
  if (!isProposal(citation)) return null
  return {
    handle: citation.handle,
    sourceHandle: citation.source_handle,
    page: citation.page || '',
    eventType: attributeValue(citation.attribute_list, ATTR_EVENT),
    dateText: attributeValue(citation.attribute_list, ATTR_DATE),
    placeText: attributeValue(citation.attribute_list, ATTR_PLACE),
    url: attributeValue(citation.attribute_list, ATTR_URL),
  }
}

export function proposalsFromCitations(citations) {
  return (citations || []).map(readProposal).filter(Boolean)
}

export function splitRecord(record) {
  const value = (record || '').trim()
  if (/^https?:\/\//i.test(value)) return {page: value, url: value}
  return {page: value, url: ''}
}

export function buildSource(title) {
  return {
    _class: 'Source',
    handle: makeHandle(),
    title: title.trim(),
    reporef_list: [],
  }
}

export function buildCitation({
  handle = makeHandle(),
  sourceHandle,
  page,
  url,
  eventType,
  dateText,
  placeText,
}) {
  const attributeList = [
    attribute(ATTR_STATUS, STATUS_PROPOSED),
    attribute(ATTR_EVENT, eventType),
  ]
  if (dateText?.trim())
    attributeList.push(attribute(ATTR_DATE, dateText.trim()))
  if (placeText?.trim()) {
    attributeList.push(attribute(ATTR_PLACE, placeText.trim()))
  }
  if (url?.trim()) attributeList.push(attribute(ATTR_URL, url.trim()))
  return {
    _class: 'Citation',
    handle,
    source_handle: sourceHandle,
    page: page || '',
    confidence: 1,
    date: {...emptyDate, dateval: [...emptyDate.dateval]},
    attribute_list: attributeList,
  }
}

export function sourceTitleQuery(title) {
  return {rules: [{name: 'MatchesTitleSubstringOf', values: [title]}]}
}

export function exactTitle(sources, title) {
  const want = normalizeName(title)
  return (
    (sources || []).find(source => normalizeName(source?.title) === want) ||
    null
  )
}

export function placeNameQuery(name) {
  return {rules: [{name: 'HasData', values: [name, '', '']}]}
}

export function exactPlace(places, name) {
  const want = normalizeName(name)
  return (
    (places || []).find(place => {
      const value = place?.name?.value || place?.name || ''
      return normalizeName(value) === want
    }) || null
  )
}

export function buildPlace(name) {
  return {
    _class: 'Place',
    handle: makeHandle(),
    name: {_class: 'PlaceName', value: name.trim()},
    place_type: 'Unknown',
  }
}

// Gregorian serial day number, the same count Gramps stores as date.sortval.
export function gregorianSdn(year, month, day) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

function textOnlyDate(text) {
  return {
    _class: 'Date',
    calendar: 0,
    modifier: 6,
    quality: 0,
    dateval: [0, 0, 0, false],
    text,
    sortval: 0,
  }
}

// Finnish d.m.yyyy and m.yyyy, ISO yyyy-mm-dd, or a bare year.
// Anything else is kept as a text-only Gramps date.
export function parseDateText(text) {
  const raw = (text || '').trim()
  if (!raw) return null
  let day = 0
  let month = 0
  let year = 0
  let match = raw.match(/^(\d{4})$/)
  if (match) {
    year = Number(match[1])
  } else if ((match = raw.match(/^(\d{1,2})\.(\d{4})$/))) {
    month = Number(match[1])
    year = Number(match[2])
  } else if ((match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    day = Number(match[1])
    month = Number(match[2])
    year = Number(match[3])
  } else if ((match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    year = Number(match[1])
    month = Number(match[2])
    day = Number(match[3])
  } else {
    return textOnlyDate(raw)
  }
  if (month > 12 || day > 31 || year < 1 || year > 9999) {
    return textOnlyDate(raw)
  }
  return {
    _class: 'Date',
    calendar: 0,
    modifier: 0,
    quality: 0,
    dateval: [day, month, year, false],
    sortval: gregorianSdn(year, month || 1, day || 1),
  }
}

export function formatStoredDate(date) {
  if (!date || dateIsEmpty(date)) return ''
  if (date.modifier === 6) return date.text || ''
  const [day, month, year] = date.dateval || []
  if (day && month && year) return `${day}.${month}.${year}`
  if (month && year) return `${month}.${year}`
  if (year) return String(year)
  return ''
}

export function eventOfType(person, eventType) {
  const events = person?.extended?.events || []
  return events.find(event => typeString(event?.type) === eventType) || null
}

export function fieldDecision(event, proposal) {
  const dateFilled = Boolean(event) && !dateIsEmpty(event.date)
  const placeFilled = Boolean(event?.place)
  return {
    hasEvent: Boolean(event),
    date: {
      proposed: proposal?.dateText || '',
      canFill: !dateFilled && Boolean(proposal?.dateText),
      blocked: dateFilled && Boolean(proposal?.dateText),
    },
    place: {
      proposed: proposal?.placeText || '',
      canFill: !placeFilled && Boolean(proposal?.placeText),
      blocked: placeFilled && Boolean(proposal?.placeText),
    },
  }
}

// choices: {useDate, usePlace, newEvent}
export function acceptancePlan(event, proposal, choices) {
  const decision = fieldDecision(event, proposal)
  const create = Boolean(choices.newEvent) || !decision.hasEvent
  if (!create && choices.useDate && decision.date.blocked) {
    return {ok: false, reason: 'date-filled'}
  }
  if (!create && choices.usePlace && decision.place.blocked) {
    return {ok: false, reason: 'place-filled'}
  }
  return {
    ok: true,
    create,
    applyDate: Boolean(
      choices.useDate && proposal?.dateText && (create || decision.date.canFill)
    ),
    applyPlace: Boolean(
      choices.usePlace &&
        proposal?.placeText &&
        (create || decision.place.canFill)
    ),
  }
}

export function buildEvent({
  handle = makeHandle(),
  type,
  dateText,
  placeHandle,
  citationHandle,
}) {
  const event = {
    _class: 'Event',
    handle,
    type,
    citation_list: citationHandle ? [citationHandle] : [],
  }
  const date = parseDateText(dateText)
  if (date) event.date = date
  if (placeHandle) event.place = placeHandle
  return event
}

export function eventFill(event, proposal, plan, placeHandle) {
  const patch = {}
  if (plan.applyDate) {
    const date = parseDateText(proposal.dateText)
    if (date) patch.date = date
  }
  if (plan.applyPlace && placeHandle) patch.place = placeHandle
  const citations = new Set(event?.citation_list || [])
  if (proposal?.handle) citations.add(proposal.handle)
  patch.citation_list = [...citations]
  return patch
}

// Proposal fields go away. The record URL stays on the citation.
export function acceptedCitation(citation) {
  return {
    ...citation,
    confidence: 2,
    attribute_list: (citation?.attribute_list || []).filter(
      item => !PROPOSAL_FIELDS.has(item?.type)
    ),
  }
}

export function personAfterAccept(person, {citationHandle, addEventHandle}) {
  const patch = {
    citation_list: (person?.citation_list || []).filter(
      handle => handle !== citationHandle
    ),
  }
  if (addEventHandle) {
    const refs = person?.event_ref_list || []
    const already = refs.some(ref => ref?.ref === addEventHandle)
    patch.event_ref_list = already
      ? refs
      : [...refs, {_class: 'EventRef', ref: addEventHandle, role: 'Primary'}]
  }
  return patch
}

export function peopleWithSourceRule(sourceGrampsId) {
  return {rules: [{name: SOURCE_PERSON_RULE, values: [sourceGrampsId]}]}
}

export function catalogueHasRule(catalogue, rule) {
  const rules = catalogue?.rules || []
  return rules.some(entry => entry?.rule === rule)
}

export function peopleFromBacklinks(backlinks, selfHandle) {
  return (backlinks?.person || [])
    .map(person =>
      typeof person === 'string'
        ? {handle: person}
        : {
            handle: person?.handle,
            grampsId: person?.gramps_id,
            profile: person?.profile,
          }
    )
    .filter(person => person.handle && person.handle !== selfHandle)
}
