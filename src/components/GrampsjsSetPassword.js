/*
The page an invitation or reset link opens (/set-password?token=...): a new user sets
their own password. The link carries a one-time password reset token.
*/
import {html, css, LitElement} from 'lit'

import '@material/web/button/filled-button'
import '@material/web/textfield/filled-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {apiSetPasswordWithToken} from '../api.js'
import {passwordPageLang, pwText} from '../passwordPages.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export const MIN_PASSWORD_LENGTH = 8

// What went wrong with a link, from the API's answer
export function setPasswordError(status, message = '') {
  if (status === 409) return 'This link has already been used.'
  if (status === 405) return 'Password sign-in is turned off on this site.'
  if (status === 401 && /expired/i.test(message)) {
    return 'This link has expired. Ask for a new link.'
  }
  if ([401, 403, 422].includes(status)) {
    return 'This link is not valid. Ask for a new link.'
  }
  if (!status) return 'No connection to the server. Try again.'
  return 'Something went wrong on the server. Try again later.'
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
    this._lang = passwordPageLang()
    this._reset =
      new URLSearchParams(window.location.search).get('reason') === 'reset'
  }

  // Finnish or English, by the browser (see passwordPages.js)
  _t(text, ...args) {
    return pwText(this._lang, text, ...args)
  }

  get _title() {
    const reason = new URLSearchParams(window.location.search).get('reason')
    return this._t(
      reason === 'reset' || this._reset
        ? 'Set a new password'
        : 'Set your password'
    )
  }

  // "token", not "jwt": the API checks a "jwt" parameter on every request,
  // so an expired one would fail the page itself before it could explain
  get _token() {
    const params = new URLSearchParams(window.location.search)
    return params.get('token') || params.get('jwt') || ''
  }

  render() {
    if (this._done) {
      return html`<div id="container" lang="${this._lang}">
        <form>
          <h2>${this._title}</h2>
          <p>${this._t('Your password has been set. You can now log in.')}</p>
          <md-filled-button href="/login"
            >${this._t('Log in')}</md-filled-button
          >
        </form>
      </div>`
    }
    if (!this._token) {
      return html`<div id="container" lang="${this._lang}">
        <form>
          <h2>${this._title}</h2>
          <p class="error">
            ${this._t('This link is not valid. Ask for a new link.')}
          </p>
        </form>
      </div>`
    }
    return html`
      <div id="container" lang="${this._lang}">
        <form @submit="${this._submit}" novalidate>
          <h2>${this._title}</h2>
          <p class="hint">
            ${this._t('Choose a password of at least 8 characters.')}
          </p>
          <md-filled-text-field
            id="password"
            type="password"
            autocomplete="new-password"
            label="${this._t('New password')}"
            .value="${this._password}"
            @input="${e => {
              this._password = e.target.value
            }}"
          ></md-filled-text-field>
          <md-filled-text-field
            id="password2"
            type="password"
            autocomplete="new-password"
            label="${this._t('Repeat the password')}"
            .value="${this._repeated}"
            @input="${e => {
              this._repeated = e.target.value
            }}"
          ></md-filled-text-field>
          ${this._error
            ? html`<p class="error" role="alert">${this._t(this._error)}</p>`
            : ''}
          <md-filled-button type="submit" ?disabled="${this._busy}">
            ${this._t('Set password')}
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
