import {describe, it, expect} from 'vitest'
import {passwordPageLang, pwText} from '../../src/passwordPages.js'
import {resetErrorText} from '../../src/components/GrampsjsLogin.js'

describe('passwordPageLang', () => {
  it('is Finnish for a Finnish browser', () => {
    expect(passwordPageLang(['fi-FI', 'en'])).toBe('fi')
    expect(passwordPageLang(['fi'])).toBe('fi')
  })

  it('is English for any other language', () => {
    expect(passwordPageLang(['en-US'])).toBe('en')
    expect(passwordPageLang(['sv-FI', 'fi'])).toBe('en')
    expect(passwordPageLang(['de'])).toBe('en')
  })
})

describe('pwText', () => {
  it('translates into Finnish and keeps English as it is', () => {
    expect(pwText('fi', 'Lost your password?')).toBe('Unohtuiko salasana?')
    expect(pwText('en', 'Lost your password?')).toBe('Lost your password?')
  })

  it('has every text of the pages in Finnish', () => {
    for (const text of [
      'Set a new password',
      'Set your password',
      'The passwords do not match.',
      resetErrorText(500),
      resetErrorText(429),
      resetErrorText(0),
    ]) {
      expect(pwText('fi', text)).not.toBe(text)
    }
  })
})
