import {describe, it, expect} from 'vitest'

import {
  coordinatePair,
  parseCoordinate,
  recoverPlaceCoordinates,
} from '../../src/placeCoordinates.js'

describe('parseCoordinate', () => {
  it('reads a decimal number', () => {
    expect(parseCoordinate(61.4978, 'lat')).to.equal(61.4978)
    expect(parseCoordinate('23.761', 'long')).to.equal(23.761)
  })

  it('reads a decimal comma', () => {
    expect(parseCoordinate('61,4978', 'lat')).to.equal(61.4978)
    expect(parseCoordinate('23,7610', 'long')).to.equal(23.761)
  })

  it('reads a direction letter and a degree sign', () => {
    expect(parseCoordinate('61,4978° N', 'lat')).to.equal(61.4978)
    expect(parseCoordinate('W23.5', 'long')).to.equal(-23.5)
    expect(parseCoordinate('S 12', 'lat')).to.equal(-12)
  })

  it('rejects an empty value and a direction for the other axis', () => {
    expect(parseCoordinate('', 'lat')).to.equal(null)
    expect(parseCoordinate(null, 'long')).to.equal(null)
    expect(parseCoordinate('23 E', 'lat')).to.equal(null)
    expect(parseCoordinate('noin 61', 'lat')).to.equal(null)
  })
})

describe('coordinatePair', () => {
  it('rejects the unset pair and a value out of range', () => {
    expect(coordinatePair(0, 0)).to.equal(null)
    expect(coordinatePair('0', '0')).to.equal(null)
    expect(coordinatePair(91, 24)).to.equal(null)
    expect(coordinatePair(61, 181)).to.equal(null)
  })

  it('keeps both ends of the longitude range', () => {
    expect(coordinatePair(-16.5, 180)).to.deep.equal({lat: -16.5, long: 180})
    expect(coordinatePair(-16.5, -180)).to.deep.equal({lat: -16.5, long: -180})
  })
})

describe('recoverPlaceCoordinates', () => {
  const tampere = {
    handle: 'P1',
    lat: '61,4978',
    long: '23,7610',
    profile: {name: 'Tampere', lat: null, long: null},
    placeref_list: [],
  }

  it('reads stored text when the parsed coordinates are null', () => {
    expect(recoverPlaceCoordinates([tampere])).to.deep.equal([
      {
        handle: 'P1',
        profile: {name: 'Tampere', lat: 61.4978, long: 23.761},
      },
    ])
  })

  it('keeps coordinates the endpoint already parsed', () => {
    const place = {
      ...tampere,
      lat: '',
      long: '',
      profile: {name: 'Tampere', lat: 61.5, long: 23.7},
    }
    expect(recoverPlaceCoordinates([place])[0].profile).to.deep.equal({
      name: 'Tampere',
      lat: 61.5,
      long: 23.7,
    })
  })

  it('uses the enclosing place when a place has no coordinates', () => {
    const village = {
      handle: 'P2',
      lat: '',
      long: '',
      name: {value: 'Messukylä'},
      placeref_list: [{ref: 'P1'}],
    }
    const [parent, child] = recoverPlaceCoordinates([tampere, village])
    expect(parent.profile.lat).to.equal(61.4978)
    expect(child).to.deep.equal({
      handle: 'P2',
      profile: {name: 'Messukylä', lat: 61.4978, long: 23.761},
    })
  })

  it('does not loop on a place that encloses itself', () => {
    const loop = {
      handle: 'P9',
      lat: '',
      long: '',
      profile: {name: 'Loop'},
      placeref_list: [{ref: 'P9'}],
    }
    expect(recoverPlaceCoordinates([loop])[0].profile.lat).to.equal(null)
  })
})
