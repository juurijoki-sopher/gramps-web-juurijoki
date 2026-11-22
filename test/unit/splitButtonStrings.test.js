import {describe, expect, it} from 'vitest'
import en from '../../lang/en.json'
import fi from '../../lang/fi.json'

const splitButtonKeys = [
  'More actions',
  'Create new',
  'Select existing',
  'Download SVG',
  'Download PNG',
  'Copy Gramps ID',
  'Copied',
  'Share',
]

describe('split-button frontend strings', () => {
  it('has a Finnish translation for each new English string', () => {
    for (const key of splitButtonKeys) {
      expect(en[key], key).toBe(key)
      expect(fi[key], key).toBeTruthy()
      expect(fi[key], key).not.toBe(key)
    }
  })
})
