import {describe, expect, it} from 'vitest'
import {continuationDirections} from '../../src/charts/continuation.js'
import {
  tabAnchor,
  tabDepth,
  tabExtent,
} from '../../src/charts/continuationTab.js'
import {FamilyGraph} from '../../src/charts/model/FamilyGraph.js'

const childRef = ref => ({ref, frel: 'Birth', mrel: 'Birth'})

const family = (handle, father, mother, children = []) => ({
  handle,
  father_handle: father,
  mother_handle: mother,
  child_ref_list: children.map(childRef),
})

const person = (handle, extended = {}) => ({
  handle,
  gramps_id: `I_${handle}`,
  extended: {families: [], ...extended},
})

describe('continuationDirections', () => {
  it('marks a child who was not fetched', () => {
    const parents = family('parents', 'P', 'Q', ['C', 'Hidden'])
    const graph = new FamilyGraph([
      person('P', {families: [parents]}),
      person('Q', {families: [parents]}),
      person('C', {primary_parent_family: parents}),
    ])
    expect(continuationDirections(graph, 'P')).toEqual(['descendants'])
    expect(continuationDirections(graph, 'Q')).toEqual(['descendants'])
    expect(continuationDirections(graph, 'C')).toEqual([])
  })

  it('marks a parent who was not fetched', () => {
    const parents = family('parents', 'P', 'Gone', ['C'])
    const graph = new FamilyGraph([
      person('P', {families: [parents]}),
      person('C', {primary_parent_family: parents}),
    ])
    expect(continuationDirections(graph, 'C')).toEqual(['ancestors'])
    expect(continuationDirections(graph, 'P')).toEqual([])
  })

  it('ignores an unknown parent', () => {
    const parents = family('parents', 'P', '', ['C'])
    const graph = new FamilyGraph([
      person('P', {families: [parents]}),
      person('C', {primary_parent_family: parents}),
    ])
    expect(continuationDirections(graph, 'C')).toEqual([])
    expect(continuationDirections(graph, 'P')).toEqual([])
  })

  it('ignores a partner who was not fetched', () => {
    const couple = family('couple', 'A', 'Spouse')
    const graph = new FamilyGraph([person('A', {families: [couple]})])
    expect(continuationDirections(graph, 'A')).toEqual([])
  })

  it('marks both directions', () => {
    const parents = family('parents', 'Gone', 'AlsoGone', ['A'])
    const children = family('children', 'A', 'B', ['Hidden'])
    const graph = new FamilyGraph([
      person('A', {
        primary_parent_family: parents,
        families: [children],
      }),
      person('B', {families: [children]}),
    ])
    expect(continuationDirections(graph, 'A')).toEqual([
      'ancestors',
      'descendants',
    ])
    expect(continuationDirections(graph, 'B')).toEqual(['descendants'])
  })
})

describe('tab geometry', () => {
  it('anchors the left tab outside the colour stripe', () => {
    expect(tabAnchor('left', 190, 90)).toEqual([-99, 0])
    expect(tabAnchor('right', 190, 90)).toEqual([95, 0])
    expect(tabAnchor('up', 190, 90)).toEqual([0, -45])
    expect(tabAnchor('down', 190, 90)).toEqual([0, 45])
  })

  it('extends one tab depth past the anchor', () => {
    expect(tabExtent('down', 190, 90).yMax).toBe(45 + tabDepth)
    expect(tabExtent('left', 190, 90).xMin).toBe(-99 - tabDepth)
  })
})
