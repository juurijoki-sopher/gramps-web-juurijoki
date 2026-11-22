import {afterEach, describe, expect, it, vi} from 'vitest'
import '../../src/components/GrampsjsDownloadButton.js'

vi.mock('../../src/charts/svgExport.js', async () => {
  const actual = await vi.importActual('../../src/charts/svgExport.js')
  return {
    ...actual,
    downloadFile: vi.fn(),
    svgDocumentToPngBlob: vi.fn(
      async () => new Blob(['png'], {type: 'image/png'})
    ),
  }
})

const {downloadFile, svgDocumentToPngBlob} = await import(
  '../../src/charts/svgExport.js'
)

const mounted = []

async function mount(props) {
  const el = document.createElement('grampsjs-download-button')
  Object.assign(el, {
    appState: {i18n: {lang: 'en', strings: {}}},
    ...props,
  })
  document.body.appendChild(el)
  mounted.push(el)
  await el.updateComplete
  await el.updateComplete
  return el
}

afterEach(() => {
  mounted.splice(0).forEach(el => el.remove())
  downloadFile.mockClear()
  svgDocumentToPngBlob.mockClear()
})

describe('GrampsjsDownloadButton', () => {
  it('is a single icon for a non-SVG file', async () => {
    const el = await mount({
      filename: 'notes.txt',
      mimeType: 'text/plain',
      content: () => 'hello',
    })
    expect(el.shadowRoot.querySelector('grampsjs-split-button')).toBeNull()
    expect(el.shadowRoot.querySelector('md-icon-button')).not.toBeNull()
  })

  it('offers SVG and PNG for a chart', async () => {
    const el = await mount({
      filename: 'I0001-fan.svg',
      mimeType: 'image/svg+xml',
      content: () => '<svg></svg>',
    })
    const split = el.shadowRoot.querySelector('grampsjs-split-button')
    expect(split).not.toBeNull()
    const items = [...el.shadowRoot.querySelectorAll('md-menu-item')]
    expect(items.map(item => item.textContent.trim())).toEqual([
      'Download SVG',
      'Download PNG',
    ])
  })

  it('saves a PNG from the SVG document', async () => {
    const el = await mount({
      filename: 'I0001-fan.svg',
      mimeType: 'image/svg+xml',
      content: () => '<svg></svg>',
    })
    await el._downloadPng()
    expect(svgDocumentToPngBlob).toHaveBeenCalledWith('<svg></svg>')
    expect(downloadFile).toHaveBeenCalledWith(
      expect.any(Blob),
      'I0001-fan.png',
      'image/png'
    )
  })
})
