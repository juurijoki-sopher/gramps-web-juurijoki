import {LitElement, html, css} from 'lit'

import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu-item.js'

import {mdiCheck, mdiContentCopy, mdiIdentifier, mdiShareVariant} from '@mdi/js'

import {sharedStyles, iconButtonColorStyles} from '../SharedStyles.js'
import {clickKeyHandler} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsTooltip.js'
import './GrampsjsIcon.js'
import './GrampsjsSplitButton.js'

export class GrampsjsShareUrl extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      iconButtonColorStyles,
      css`
        :host {
          font-size: var(--grampsjs-font-size-sm);
          font-weight: 450;
          color: var(--grampsjs-text-secondary-color);
        }

        md-icon-button {
          --grampsjs-icon-button-color: currentColor;
          --md-icon-button-state-layer-width: 28px;
          --md-icon-button-state-layer-height: 28px;
          position: relative;
        }
      `,
    ]
  }

  static get properties() {
    return {
      href: {type: String},
      grampsId: {type: String},
      _copied: {type: Boolean, state: true},
    }
  }

  constructor() {
    super()
    this.href = ''
    this.grampsId = ''
    this._copied = false
  }

  _canShare() {
    return typeof navigator.share === 'function'
  }

  _hasExtraActions() {
    return this._canShare() || Boolean(this.grampsId)
  }

  render() {
    if (this._hasExtraActions()) {
      return this._renderSplit()
    }
    return this._renderCopyButton()
  }

  _renderCopyButton() {
    const label = this._copied ? this._('Copied') : this._('Copy URL')
    return html`
      <md-icon-button
        id="share-icon"
        aria-label="${label}"
        @click="${this._copyUrl}"
        @keydown="${clickKeyHandler}"
      >
        <grampsjs-icon
          path="${this._copied ? mdiCheck : mdiShareVariant}"
          color="currentColor"
        ></grampsjs-icon>
      </md-icon-button>
      <grampsjs-tooltip for="share-icon">${label}</grampsjs-tooltip>
    `
  }

  _primaryLabel() {
    if (this._canShare()) {
      return this._('Share')
    }
    if (this._copied) {
      return this._('Copied')
    }
    return this._('Copy URL')
  }

  _renderSplit() {
    const primaryLabel = this._primaryLabel()
    return html`
      <grampsjs-split-button
        variant="icon"
        icon="${this._copied ? mdiCheck : mdiShareVariant}"
        label="${primaryLabel}"
        iconColor="currentColor"
        .appState="${this.appState}"
        @split-button:primary="${this._handlePrimary}"
      >
        ${this._canShare()
          ? html`<md-menu-item @click="${this._copyUrl}">
              <span slot="headline">${this._('Copy URL')}</span>
              <grampsjs-icon
                slot="start"
                path="${mdiContentCopy}"
                color="var(--grampsjs-body-font-color-35)"
              ></grampsjs-icon>
            </md-menu-item>`
          : ''}
        ${this.grampsId
          ? html`<md-menu-item @click="${this._copyGrampsId}">
              <span slot="headline">${this._('Copy Gramps ID')}</span>
              <grampsjs-icon
                slot="start"
                path="${mdiIdentifier}"
                color="var(--grampsjs-body-font-color-35)"
              ></grampsjs-icon>
            </md-menu-item>`
          : ''}
      </grampsjs-split-button>
    `
  }

  _handlePrimary() {
    if (this._canShare()) {
      this._share()
    } else {
      this._copyUrl()
    }
  }

  _share() {
    const url = this.href
    if (url) {
      navigator.share({url})
    }
  }

  _copyUrl() {
    this._copyText(this.href)
  }

  _copyGrampsId() {
    this._copyText(this.grampsId)
  }

  _copyText(value) {
    if (!value) {
      return
    }
    const write = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(value)
      : Promise.reject(new Error('clipboard unavailable'))
    write
      .catch(() => {
        const input = document.createElement('input')
        input.value = value
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      })
      .finally(() => {
        this._copied = true
        setTimeout(() => {
          this._copied = false
        }, 1000)
      })
  }
}

window.customElements.define('grampsjs-share-url', GrampsjsShareUrl)
