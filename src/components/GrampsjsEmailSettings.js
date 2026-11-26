/*
The server's e-mail (SMTP) account, for administrators: invitation links and
password reset messages are sent with it. The stored password is never
shown; the server only tells whether one is set.
*/
import {html, css, LitElement} from 'lit'

import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/textfield/filled-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'

const ENDPOINT = '/api/juurijoki/email-settings/'

// the usual ports and the encryption the server uses on them
export function encryptionForPort(port) {
  const number = parseInt(port, 10)
  if (number === 465) return 'SSL/TLS'
  if (number === 25) return 'no encryption'
  if (number > 0) return 'STARTTLS'
  return ''
}

class GrampsjsEmailSettings extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .fields {
          display: grid;
          grid-template-columns: 1fr 9em;
          gap: var(--grampsjs-space-3);
          max-width: 40em;
        }

        .wide {
          grid-column: 1 / -1;
        }

        md-filled-text-field {
          width: 100%;
        }

        .hint {
          color: var(--grampsjs-text-secondary-color);
          font-size: var(--grampsjs-font-size-sm);
        }

        .buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--grampsjs-space-2);
          margin-top: var(--grampsjs-space-4);
        }

        @media (max-width: 600px) {
          .fields {
            grid-template-columns: 1fr;
          }
        }
      `,
    ]
  }

  static get properties() {
    return {
      _data: {type: Object},
      _password: {type: String},
      _clearPassword: {type: Boolean},
      _busy: {type: Boolean},
      _loaded: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._data = {host: '', port: '', user: '', from_email: ''}
    this._password = ''
    this._clearPassword = false
    this._busy = false
    this._loaded = false
  }

  firstUpdated() {
    this._fetch()
  }

  async _fetch() {
    const res = await this.appState.apiGet(ENDPOINT)
    if (res?.data) {
      this._data = res.data
      this._loaded = true
    } else if (res?.error) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
    }
  }

  _field(id, label, {type = 'text', autocomplete = 'off', wide = false} = {}) {
    return html`<md-filled-text-field
      id="${id}"
      class="${wide ? 'wide' : ''}"
      type="${type}"
      autocomplete="${autocomplete}"
      label="${label}"
      .value="${this._data[id] ?? ''}"
      @input="${e => {
        this._data = {...this._data, [id]: e.target.value}
      }}"
    ></md-filled-text-field>`
  }

  render() {
    const encryption = encryptionForPort(this._data.port)
    let passwordLabel = this._('Password')
    if (this._data.password_set && !this._clearPassword) {
      passwordLabel = this._('Password (set; leave empty to keep it)')
    }
    return html`
      <p class="hint">
        ${this._(
          'Invitation links and password reset messages are sent from this account. Ask your e-mail provider for the outgoing mail (SMTP) server.'
        )}
      </p>
      <div class="fields">
        ${this._field('host', this._('SMTP server, e.g. smtp.example.com'))}
        ${this._field('port', this._('Port'), {type: 'number'})}
        ${this._field('user', this._('Username'), {wide: true})}
        <md-filled-text-field
          id="password"
          class="wide"
          type="password"
          autocomplete="new-password"
          label="${passwordLabel}"
          .value="${this._password}"
          @input="${e => {
            this._password = e.target.value
          }}"
        ></md-filled-text-field>
        ${this._field('from_email', this._('Sender address'), {
          type: 'email',
          wide: true,
        })}
      </div>
      <p class="hint">
        ${encryption
          ? this._('Encryption on this port: %s', this._(encryption))
          : this._('Usually port 587 (STARTTLS) or 465 (SSL/TLS).')}
      </p>
      ${this._data.password_set
        ? html`<p class="hint">
            <label>
              <input
                type="checkbox"
                .checked="${this._clearPassword}"
                @change="${e => {
                  this._clearPassword = e.target.checked
                }}"
              />
              ${this._('Remove the stored password')}
            </label>
          </p>`
        : ''}
      <div class="buttons">
        <md-filled-button
          ?disabled="${this._busy || !this._loaded}"
          @click="${this._save}"
          >${this._('_Save')}</md-filled-button
        >
        <md-outlined-button
          ?disabled="${this._busy || !this._loaded || !this._data.host}"
          @click="${this._sendTest}"
          >${this._('Send a test message')}</md-outlined-button
        >
      </div>
    `
  }

  async _save() {
    this._busy = true
    const payload = {
      host: this._data.host,
      port: this._data.port,
      user: this._data.user,
      from_email: this._data.from_email,
      clear_password: this._clearPassword,
    }
    if (this._password) payload.password = this._password
    const res = await this.appState.apiPut(ENDPOINT, payload, {
      dbChanged: false,
    })
    this._busy = false
    if (res?.error) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
      return
    }
    this._data = res.data
    this._password = ''
    this._clearPassword = false
    fireEvent(this, 'grampsjs:notification', {
      message: this._('E-mail settings saved'),
    })
  }

  async _sendTest() {
    this._busy = true
    const res = await this.appState.apiPost(
      `${ENDPOINT}test/`,
      {},
      {dbChanged: false, saving: false}
    )
    this._busy = false
    if (res?.error) {
      fireEvent(this, 'grampsjs:error', {message: res.error})
      return
    }
    fireEvent(this, 'grampsjs:notification', {
      message: this._('Test message sent to %s', res.data.sent_to),
    })
  }
}

window.customElements.define('grampsjs-email-settings', GrampsjsEmailSettings)
