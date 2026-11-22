/*
The page an invitation link opens (/set-password?jwt=...): a new user sets
their own password. The link carries a one-time password reset token.
*/
import {html, css, LitElement} from 'lit'

import '@material/web/button/filled-button'
import '@material/web/textfield/filled-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {apiSetPasswordWithToken} from '../api.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export const MIN_PASSWORD_LENGTH = 8

// What went wrong with a link, from the API's answer
export function setPasswordError(status, message = '') {
  if (status === 409) return 'This link has already been used.'
  if (status === 401 && /expired/i.test(message)) {
    return 'This link has expired. Ask for a new link.'
  }
  if ([401, 403, 422].includes(status)) {
    return 'This link is not valid. Ask for a new link.'
  }
  if (!status) return 'no connection to the server'
  return 'server error'
}

// Why a password cannot be used, or '' if it can
export function passwordProblem(password, repeated) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return 'The password must be at least 8 characters long.'
  }
  if (password !== repeated) return 'The passwords do not match.'
  return ''
}

class GrampsjsSetPassword extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        #container {
          margin: auto;
          width: 100%;
          max-width: 25em;
        }

        form {
          margin: auto;
          max-width: 90vw;
          position: relative;
          top: 15vh;
        }

        md-filled-text-field {
          width: 100%;
          margin-bottom: 0.7em;
        }

        md-filled-button {
          width: 100%;
          margin-top: 0.5em;
        }

        .error {
          color: var(--grampsjs-alert-error-font-color);
        }

        .hint {
          color: var(--grampsjs-text-secondary-color);
          font-size: var(--grampsjs-font-size-sm);
        }
      `,
    ]
  }

  static get properties() {
    return {
      _password: {type: String},
      _repeated: {type: String},
      _error: {type: String},
      _done: {type: Boolean},
      _busy: {type: Boolean},
    }
  }

  constructor() {
    super()
    this._password = ''
    this._repeated = ''
    this._error = ''
    this._done = false
    this._busy = false
  }

  get _token() {
    return new URLSearchParams(window.location.search).get('jwt') || ''
  }

  render() {
    if (this._done) {
      return html`<div id="container">
        <form>
          <h2>${this._('Set your password')}</h2>
          <p>${this._('Your password has been set. You can now log in.')}</p>
          <md-filled-button href="/login">${this._('login')}</md-filled-button>
        </form>
      </div>`
    }
    if (!this._token) {
      return html`<div id="container">
        <form>
          <h2>${this._('Set your password')}</h2>
          <p class="error">
            ${this._('This link is not valid. Ask for a new link.')}
          </p>
        </form>
      </div>`
    }
    return html`
      <div id="container">
        <form @submit="${this._submit}" novalidate>
          <h2>${this._('Set your password')}</h2>
          <p class="hint">
            ${this._('Choose a password of at least 8 characters.')}
          </p>
          <md-filled-text-field
            id="password"
            type="password"
            autocomplete="new-password"
            label="${this._('New password')}"
            .value="${this._password}"
            @input="${e => {
              this._password = e.target.value
            }}"
          ></md-filled-text-field>
          <md-filled-text-field
            id="password2"
            type="password"
            autocomplete="new-password"
            label="${this._('Repeat the password')}"
            .value="${this._repeated}"
            @input="${e => {
              this._repeated = e.target.value
            }}"
          ></md-filled-text-field>
          ${this._error
            ? html`<p class="error" role="alert">${this._(this._error)}</p>`
            : ''}
          <md-filled-button type="submit" ?disabled="${this._busy}">
            ${this._('Set password')}
          </md-filled-button>
        </form>
      </div>
    `
  }

  async _submit(e) {
    e.preventDefault()
    const problem = passwordProblem(this._password, this._repeated)
    if (problem) {
      this._error = problem
      return
    }
    this._busy = true
    this._error = ''
    const {status, message} = await apiSetPasswordWithToken(
      this._token,
      this._password
    )
    if (status === 201 || status === 200) {
      this._done = true
      // the token is spent; keep it out of the address bar and history
      window.history.replaceState({}, '', '/set-password')
    } else {
      this._error = setPasswordError(status, message)
    }
    this._busy = false
  }
}

window.customElements.define('grampsjs-set-password', GrampsjsSetPassword)
