import {describe, it, expect} from 'vitest'
import {encryptionForPort} from '../../src/components/GrampsjsEmailSettings.js'

describe('encryptionForPort', () => {
  it('names the encryption the server uses on the usual ports', () => {
    expect(encryptionForPort('465')).toBe('SSL/TLS')
    expect(encryptionForPort('587')).toBe('STARTTLS')
    expect(encryptionForPort(25)).toBe('no encryption')
  })

  it('names none for an empty port', () => {
    expect(encryptionForPort('')).toBe('')
  })
})
