/*
Coordinates for the map.

The places/coordinates endpoint only returns a number when Gramps can parse
the stored latitude and longitude. A decimal comma, or a value Gramps left
unparsed, comes back as null and the place disappears. These helpers read the
stored text and, failing that, the enclosing place.
*/

const DIRECTION = /[NSEW]/i

// One latitude or longitude. `axis` is 'lat' or 'long', so a direction letter
// for the other axis is rejected instead of silently moving the place.
export function parseCoordinate(value, axis) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  let text = value.trim().replace(/[°º]/g, '')
  if (!text) return null
  const letter = text.match(DIRECTION)?.[0].toUpperCase() ?? ''
  if (axis === 'lat' && (letter === 'E' || letter === 'W')) return null
  if (axis === 'long' && (letter === 'N' || letter === 'S')) return null
  text = text.replace(DIRECTION, '').replace(/\s+/g, '')
  // A comma is the decimal separator when the value has no dot.
  if (text.includes(',') && !text.includes('.')) text = text.replace(',', '.')
  if (!/^[+-]?\d+(\.\d+)?$/.test(text)) return null
  let number = Number(text)
  if (letter === 'S' || letter === 'W') number = -Math.abs(number)
  if (letter === 'N' || letter === 'E') number = Math.abs(number)
  return number
}

// Decimal degrees, or null when either value is missing, out of range, or the
// unset pair 0, 0.
export function coordinatePair(lat, long) {
  const latitude = parseCoordinate(lat, 'lat')
  const longitude = parseCoordinate(long, 'long')
  if (latitude === null || longitude === null) return null
  if (latitude === 0 && longitude === 0) return null
  if (latitude > 90 || latitude < -90) return null
  if (longitude >= 180 || longitude < -180) return null
  return {lat: latitude, long: longitude}
}

function placeName(place) {
  if (typeof place.profile?.name === 'string' && place.profile.name) {
    return place.profile.name
  }
  if (typeof place.name === 'string') return place.name
  return place.name?.value || ''
}

function ownCoordinates(place) {
  return (
    coordinatePair(place.profile?.lat, place.profile?.long) ||
    coordinatePair(place.lat, place.long)
  )
}

// Places in the map's shape, {handle, profile: {name, lat, long}}. A place
// without its own coordinates uses the nearest enclosing place that has them.
export function recoverPlaceCoordinates(places) {
  const byHandle = new Map(
    places.map(place => [
      place.handle,
      {
        handle: place.handle,
        name: placeName(place),
        parent: place.placeref_list?.[0]?.ref || '',
        coords: ownCoordinates(place),
      },
    ])
  )

  const resolved = (handle, seen) => {
    const place = byHandle.get(handle)
    if (!place || seen.has(handle)) return null
    if (place.coords) return place.coords
    seen.add(handle)
    return place.parent ? resolved(place.parent, seen) : null
  }

  return [...byHandle.values()].map(place => {
    const coords = place.coords || resolved(place.handle, new Set())
    return {
      handle: place.handle,
      profile: {
        name: place.name,
        lat: coords ? coords.lat : null,
        long: coords ? coords.long : null,
      },
    }
  })
}
