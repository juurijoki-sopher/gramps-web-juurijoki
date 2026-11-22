/*
Finnish and Swedish name and place variants for research search.

The lists are a curated starter set stored in the app. They are not fetched
from a name authority. A variant is offered one change at a time: a given
name with several parts keeps every part except the one being replaced.
*/

export const GIVEN_NAME_GROUPS = [
  ['Juho', 'Johan', 'Juhana', 'Johannes', 'Janne'],
  ['Matti', 'Matias', 'Matts', 'Mats', 'Mattias'],
  ['Maija', 'Maria', 'Maja', 'Maaria'],
  ['Liisa', 'Lisa', 'Elisabet', 'Elisabeth'],
  ['Kalle', 'Kaarle', 'Karl', 'Carl'],
  ['Antti', 'Anders', 'Andreas', 'Antero'],
  ['Heikki', 'Henrik', 'Henrikki'],
  ['Pekka', 'Petter', 'Peter', 'Pietari'],
  ['Mikko', 'Mikael', 'Michael'],
  ['Jaakko', 'Jakob', 'Jacob'],
  ['Erkki', 'Erik', 'Eerik'],
  ['Olli', 'Olof', 'Olavi'],
  ['Tuomas', 'Thomas', 'Tuomo'],
  ['Paavo', 'Paul', 'Paavali'],
  ['Yrjö', 'Georg', 'Göran', 'Yrjänä'],
  ['Kustaa', 'Gustav', 'Gustaf'],
  ['Vilho', 'Vilhelm', 'Wilhelm'],
  ['Eeva', 'Eva'],
  ['Katariina', 'Katarina', 'Kaisa', 'Karin', 'Kaarina'],
  ['Kristiina', 'Kristina', 'Kerstin', 'Stina'],
  ['Margareeta', 'Margareta', 'Marketta', 'Greta'],
  ['Helena', 'Lena'],
  ['Aleksanteri', 'Alexander'],
  ['Tapani', 'Stefan', 'Staffan'],
  ['Risto', 'Kristoffer', 'Christer'],
  ['Niilo', 'Nils'],
  ['Lauri', 'Lars'],
  ['Martti', 'Martin'],
  ['Sakari', 'Zacharias', 'Sakarias'],
  ['Samuel', 'Samuli'],
  ['Iisakki', 'Isak'],
  ['Aatami', 'Adam'],
  ['Briitta', 'Brita', 'Riitta'],
  ['Fredrik', 'Fredrikki'],
  ['Esko', 'Eskil'],
  ['Juuso', 'Josef', 'Jooseppi'],
]

export const PLACE_NAME_GROUPS = [
  ['Turku', 'Åbo'],
  ['Helsinki', 'Helsingfors'],
  ['Pori', 'Björneborg'],
  ['Tampere', 'Tammerfors'],
  ['Viipuri', 'Viborg'],
  ['Oulu', 'Uleåborg'],
  ['Vaasa', 'Vasa'],
  ['Pietarsaari', 'Jakobstad'],
  ['Kokkola', 'Karleby'],
  ['Rauma', 'Raumo'],
  ['Uusikaupunki', 'Nystad'],
  ['Porvoo', 'Borgå'],
  ['Loviisa', 'Lovisa'],
  ['Hamina', 'Fredrikshamn'],
  ['Savonlinna', 'Nyslott'],
  ['Hämeenlinna', 'Tavastehus'],
  ['Tammisaari', 'Ekenäs'],
  ['Raasepori', 'Raseborg'],
  ['Maarianhamina', 'Mariehamn'],
  ['Ahvenanmaa', 'Åland'],
  ['Uusimaa', 'Nyland'],
  ['Pohjanmaa', 'Österbotten'],
]

export function normalizeName(value) {
  return (value || '').trim().toLocaleLowerCase('fi')
}

function uniqueNames(names) {
  const seen = new Set()
  const out = []
  names.forEach(name => {
    const key = normalizeName(name)
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(name.trim())
  })
  return out
}

function groupFor(token, groups) {
  const key = normalizeName(token)
  if (!key) return null
  return (
    groups.find(group => group.some(name => normalizeName(name) === key)) ||
    null
  )
}

// The stored spelling first, then the other spellings of each token.
export function givenNameVariants(given) {
  const original = (given || '').trim()
  if (!original) return []
  const tokens = original.split(/\s+/)
  const variants = [original]
  tokens.forEach((token, index) => {
    const group = groupFor(token, GIVEN_NAME_GROUPS)
    if (!group) return
    group.forEach(name => {
      if (normalizeName(name) === normalizeName(token)) return
      const next = [...tokens]
      next[index] = name
      variants.push(next.join(' '))
    })
  })
  return uniqueNames(variants)
}

// A matching place, or the matching part before the first comma.
export function placeNameVariants(place) {
  const original = (place || '').trim()
  if (!original) return []
  const whole = groupFor(original, PLACE_NAME_GROUPS)
  if (whole) return uniqueNames([original, ...whole])
  const [first, ...rest] = original.split(',').map(part => part.trim())
  const part = groupFor(first, PLACE_NAME_GROUPS)
  if (!part) return [original]
  const tail = rest.length ? `, ${rest.join(', ')}` : ''
  return uniqueNames(part.map(name => `${name}${tail}`))
}

function withGiven(data, given) {
  const parts = given.split(/\s+/)
  return {
    ...data,
    name_given: given,
    name_middle: parts[1] || '',
  }
}

// Extra search parameters, one change from the stored name or place.
export function externalSearchVariants(data, limit = 6) {
  const extras = []
  givenNameVariants(data?.name_given).forEach(name => {
    if (normalizeName(name) === normalizeName(data?.name_given)) return
    extras.push({label: name, data: withGiven(data, name)})
  })
  placeNameVariants(data?.place_name).forEach(place => {
    if (normalizeName(place) === normalizeName(data?.place_name)) return
    extras.push({
      label: place,
      data: {...data, place_name: place},
    })
  })
  return extras.slice(0, limit)
}

// One link for the stored spelling and one for each variant.
export function expandSearchLinks(websites, data, interpolate, limit = 6) {
  const variants = [{label: '', data}, ...externalSearchVariants(data, limit)]
  return websites.flatMap(website =>
    variants.map(variant => ({
      ...website,
      visibilityKey: website.key,
      key: variant.label ? `${website.key}:${variant.label}` : website.key,
      value: variant.label
        ? `${website.value} · ${variant.label}`
        : website.value,
      baseUrl: interpolate(website.baseUrl, variant.data),
      params: interpolate(website.params || '', variant.data),
    }))
  )
}

export function givenNamesOnPerson(person) {
  const names = [person?.primary_name, ...(person?.alternate_names || [])]
  return uniqueNames(names.map(name => name?.first_name || ''))
}

// Given-name spellings that are not already a name on the person.
export function alternateNameSuggestions(person) {
  const given =
    person?.primary_name?.first_name || person?.profile?.name_given || ''
  const present = new Set(givenNamesOnPerson(person).map(normalizeName))
  return givenNameVariants(given).filter(
    name => !present.has(normalizeName(name))
  )
}

export function alternateName(primaryName, given) {
  return {
    _class: 'Name',
    type: 'Also Known As',
    first_name: given,
    surname_list: (primaryName?.surname_list || []).map(surname => ({
      ...surname,
    })),
  }
}

// Queries against the tree's own search. The year is applied afterwards.
export function treeSearchQueries({given, surname, place}) {
  const queries = []
  givenNameVariants(given)
    .slice(0, 6)
    .forEach(name => {
      const query = [name, surname].filter(Boolean).join(' ').trim()
      if (query) queries.push(query)
    })
  const base = [given, surname].filter(Boolean).join(' ').trim()
  if (base) {
    placeNameVariants(place).forEach(name => {
      if (normalizeName(name) === normalizeName(place)) return
      queries.push(`${base} ${name}`)
    })
  }
  return uniqueNames(queries)
}

export function birthYear(profile) {
  const date = profile?.birth?.date || ''
  const match = String(date).match(/\d{4}/)
  return match ? Number(match[0]) : null
}

// A missing year on either side stays a candidate.
export function isCloseYear(year, other, span = 2) {
  if (year == null || other == null) return true
  return Math.abs(year - other) <= span
}

export function hitHandle(hit) {
  return hit?.object?.handle || hit?.handle || ''
}

export function hitProfile(hit) {
  return hit?.object?.profile || hit?.profile || {}
}

export function hitGrampsId(hit) {
  return hit?.object?.gramps_id || hit?.gramps_id || ''
}

export function mergeSearchHits(lists, {excludeHandle, year, span = 2} = {}) {
  const seen = new Set()
  const out = []
  ;(lists || []).forEach(list => {
    ;(list || []).forEach(hit => {
      const handle = hitHandle(hit)
      if (!handle || handle === excludeHandle || seen.has(handle)) return
      const otherYear = birthYear(hitProfile(hit))
      if (!isCloseYear(year, otherYear, span)) return
      seen.add(handle)
      out.push(hit)
    })
  })
  return out
}

export function personQueryParts(person) {
  const profile = person?.profile || {}
  const surname =
    profile.name_surname ||
    person?.primary_name?.surname_list?.[0]?.surname ||
    ''
  return {
    given: profile.name_given || person?.primary_name?.first_name || '',
    surname,
    place: profile.birth?.place || profile.birth?.place_name || '',
    year: birthYear(profile),
  }
}
