import {describe, expect, it} from 'vitest'
import {
  alternateName,
  alternateNameSuggestions,
  expandSearchLinks,
  externalSearchVariants,
  givenNameVariants,
  mergeSearchHits,
  placeNameVariants,
  treeSearchQueries,
} from '../../src/nameVariants.js'

describe('given name variants', () => {
  it('returns the Finnish and Swedish spellings of a given name', () => {
    expect(givenNameVariants('Juho')).toEqual([
      'Juho',
      'Johan',
      'Juhana',
      'Johannes',
      'Janne',
    ])
  })

  it('replaces one token of a compound given name at a time', () => {
    const variants = givenNameVariants('Juho Kustaa')
    expect(variants).toContain('Juho Kustaa')
    expect(variants).toContain('Johan Kustaa')
    expect(variants).toContain('Juho Gustav')
    expect(variants).not.toContain('Johan Gustav')
  })

  it('matches a spelling without regard to case', () => {
    expect(givenNameVariants('maria')).toContain('Maija')
    expect(givenNameVariants('maria')).toContain('maria')
  })

  it('leaves an unknown name unchanged', () => {
    expect(givenNameVariants('Hilma')).toEqual(['Hilma'])
  })
})

describe('place name variants', () => {
  it('pairs a Finnish place with its Swedish name', () => {
    expect(placeNameVariants('Turku')).toEqual(['Turku', 'Åbo'])
  })

  it('replaces the first part of a longer place name', () => {
    expect(placeNameVariants('Helsinki, Uusimaa')).toEqual([
      'Helsinki, Uusimaa',
      'Helsingfors, Uusimaa',
    ])
  })
})

describe('external search links', () => {
  const site = {
    key: 'familySearch',
    value: 'FamilySearch',
    baseUrl: 'https://familysearch.org/search',
    params: '?given={{name_given}}&place={{place_name}}',
  }
  const interpolate = (template, data) =>
    template.replace(/\{\{(\w+)\}\}/g, (_match, key) => data[key] || '')

  it('adds one link per given-name and place variant', () => {
    const links = expandSearchLinks(
      [site],
      {name_given: 'Juho', place_name: 'Turku'},
      interpolate,
      6
    )
    expect(links.map(link => link.value)).toEqual([
      'FamilySearch',
      'FamilySearch · Johan',
      'FamilySearch · Juhana',
      'FamilySearch · Johannes',
      'FamilySearch · Janne',
      'FamilySearch · Åbo',
    ])
    expect(links[1].params).toContain('given=Johan')
    expect(links[1].params).toContain('place=Turku')
    expect(links.at(-1).params).toContain('place=Åbo')
    expect(links.at(-1).params).toContain('given=Juho')
    expect(links.every(link => link.visibilityKey === 'familySearch')).toBe(
      true
    )
  })

  it('caps the extra links', () => {
    expect(
      externalSearchVariants(
        {name_given: 'Juho Kustaa', place_name: 'Turku'},
        2
      )
    ).toHaveLength(2)
  })
})

describe('alternate names', () => {
  const person = {
    primary_name: {
      first_name: 'Juho',
      surname_list: [{_class: 'Surname', surname: 'Virtanen'}],
    },
    alternate_names: [{first_name: 'Johan'}],
  }

  it('skips spellings already stored on the person', () => {
    expect(alternateNameSuggestions(person)).toEqual([
      'Juhana',
      'Johannes',
      'Janne',
    ])
  })

  it('builds an also-known-as name with the primary surname', () => {
    expect(alternateName(person.primary_name, 'Juhana')).toEqual({
      _class: 'Name',
      type: 'Also Known As',
      first_name: 'Juhana',
      surname_list: [{_class: 'Surname', surname: 'Virtanen'}],
    })
  })
})

describe('tree search', () => {
  it('searches each given-name spelling and each other place name', () => {
    expect(
      treeSearchQueries({
        given: 'Maija',
        surname: 'Korhonen',
        place: 'Turku',
      })
    ).toEqual([
      'Maija Korhonen',
      'Maria Korhonen',
      'Maja Korhonen',
      'Maaria Korhonen',
      'Maija Korhonen Åbo',
    ])
  })

  it('drops the person themselves and a birth year that is far away', () => {
    const self = {object: {handle: 'self', profile: {birth: {date: '1811'}}}}
    const close = {
      object: {
        handle: 'near',
        gramps_id: 'I2',
        profile: {birth: {date: '1812'}},
      },
    }
    const far = {object: {handle: 'far', profile: {birth: {date: '1900'}}}}
    const undated = {object: {handle: 'open', profile: {}}}
    const hits = mergeSearchHits([[self, close, far, undated, close]], {
      excludeHandle: 'self',
      year: 1811,
    })
    expect(hits.map(hit => hit.object.handle)).toEqual(['near', 'open'])
  })
})
