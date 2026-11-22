import {describe, it, expect} from 'vitest'
import {
  passwordProblem,
  setPasswordError,
} from '../../src/components/GrampsjsSetPassword.js'

describe('passwordProblem', () => {
  it('accepts a password of 8 characters typed twice', () => {
    expect(passwordProblem('abcdefgh', 'abcdefgh')).toBe('')
  })

  it('refuses a short password', () => {
    expect(passwordProblem('abc', 'abc')).toBe(
      'The password must be at least 8 characters long.'
    )
  })

  it('refuses passwords that differ', () => {
    expect(passwordProblem('abcdefgh', 'abcdefgi')).toBe(
      'The passwords do not match.'
    )
  })
})

describe('setPasswordError', () => {
  it('names a link that was used already', () => {
    expect(setPasswordError(409)).toBe('This link has already been used.')
  })

  it('names an expired link', () => {
    expect(setPasswordError(401, 'Token has expired')).toBe(
      'This link has expired. Ask for a new link.'
    )
  })

  it('names a link that is not valid', () => {
    expect(setPasswordError(422, 'Signature verification failed')).toBe(
      'This link is not valid. Ask for a new link.'
    )
    expect(setPasswordError(403)).toBe(
      'This link is not valid. Ask for a new link.'
    )
  })

  it('tells a lost connection from a server error', () => {
    expect(setPasswordError(0)).toBe('No connection to the server. Try again.')
    expect(setPasswordError(500)).toBe(
      'Something went wrong on the server. Try again later.'
    )
  })
})
