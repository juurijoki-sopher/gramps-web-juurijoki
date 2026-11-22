import {describe, it, expect, beforeEach} from 'vitest'
import {
  describeApiError,
  rememberApiError,
  recentApiError,
  clearApiErrors,
} from '../../src/apiErrors.js'

const fi = {
  People: 'Henkilöt',
  Media: 'Mediat',
  'filtering failed': 'suodatus epäonnistui',
  'loading failed': 'haku epäonnistui',
  'saving failed': 'tallennus epäonnistui',
  'updating failed': 'päivitys epäonnistui',
  'not found': 'ei löytynyt',
  'server error': 'palvelinvirhe',
  'no connection to the server': 'ei yhteyttä palvelimeen',
  Users: 'Käyttäjät',
  'conflict with another change': 'ristiriita toisen muutoksen kanssa',
  'The person is already linked to another user.':
    'Henkilö on jo liitetty toiseen käyttäjään.',
}
const _ = s => fi[s] ?? s

describe('describeApiError', () => {
  it("translates the server's own message when it is a known string", () => {
    const detail = {
      method: 'PUT',
      endpoint: '/api/juurijoki/user-links/anna/',
      status: 409,
    }
    expect(
      describeApiError(
        'The person is already linked to another user.',
        detail,
        _
      )
    ).toBe(
      'Käyttäjät: päivitys epäonnistui – ristiriita toisen muutoksen kanssa: Henkilö on jo liitetty toiseen käyttäjään. (409)'
    )
  })

  it('names a filtered people request that the server did not find', () => {
    const detail = {
      method: 'GET',
      endpoint: '/api/people/?rules=%7B%7D&locale=fi',
      status: 404,
    }
    expect(describeApiError('Not Found', detail, _)).toBe(
      'Henkilöt: suodatus epäonnistui – ei löytynyt (404)'
    )
  })

  it('names a lost connection', () => {
    const detail = {method: 'GET', endpoint: '/api/media/abc/thumbnail/100'}
    expect(describeApiError('Network error', detail, _)).toBe(
      'Mediat: haku epäonnistui – ei yhteyttä palvelimeen'
    )
  })

  it("keeps the server's own message when it says more", () => {
    const detail = {method: 'POST', endpoint: '/api/people/', status: 400}
    expect(describeApiError('Gramps ID already in use', detail, _)).toBe(
      'Henkilöt: tallennus epäonnistui – invalid request: Gramps ID already in use (400)'
    )
  })

  it('calls any 5xx a server error', () => {
    const detail = {method: 'GET', endpoint: '/api/people/I1', status: 502}
    expect(describeApiError('Bad Gateway', detail, _)).toBe(
      'Henkilöt: haku epäonnistui – palvelinvirhe (502)'
    )
  })
})

describe('recentApiError', () => {
  beforeEach(() => clearApiErrors())

  it('finds the request that just failed with the message', () => {
    const detail = {method: 'GET', endpoint: '/api/people/', status: 404}
    rememberApiError('Not Found', detail)
    expect(recentApiError('Not Found')).toEqual(detail)
    expect(recentApiError('Other')).toBeNull()
  })

  it('forgets requests after a few seconds', () => {
    rememberApiError('Not Found', {endpoint: '/api/people/', status: 404})
    expect(recentApiError('Not Found', Date.now() + 60000)).toBeNull()
  })
})
