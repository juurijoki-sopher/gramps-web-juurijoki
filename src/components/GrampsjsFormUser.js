/*
Element for selecting a Gramps type
*/

import {html, css, LitElement} from 'lit'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsFormString.js'
import './GrampsjsFormSelectObjectList.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'

export const userRoles = {
  '-2': 'unconfirmed',
  '-1': 'disabled',
  0: 'Guest',
  1: 'Member',
  2: 'Contributor',
  3: 'Editor',
  4: 'Owner',
  5: 'Administrator',
}

const defaultRole = 0

class GrampsjsFormUser extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        .hide {
          display: none;
        }

        .person-hint {
          color: var(--grampsjs-text-secondary-color);
          font-size: var(--grampsjs-font-size-sm);
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
      ismulti: {type: Boolean},
      isFormValid: {type: Boolean},
      newUser: {type: Boolean},
      // the tree's users are its people: a new user must be linked to one,
      // except for administrators adding test or technical accounts
      requirePerson: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.data = {role: defaultRole}
    this.ismulti = false
    this.isFormValid = false
    this.newUser = false
    this.requirePerson = true
  }

  render() {
    return html`
      ${this.newUser ? this._renderPerson() : ''}
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="name"
          ?hidden="${!this.newUser}"
          label="${this._('Username: ').replace(':', '')}"
          value="${this.data.name || ''}"
        ></grampsjs-form-string>
      </p>
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="full_name"
          label="${this._('Full Name')}"
          value="${this.data.full_name || ''}"
        ></grampsjs-form-string>
      </p>
      <p>
        <grampsjs-form-string
          required
          @formdata:changed="${this._handleFormData}"
          fullwidth
          id="email"
          label="${this._('E-mail')}"
          type="email"
          value="${this.data.email || ''}"
        ></grampsjs-form-string>
      </p>
      <p>
        <md-filled-select
          @change="${this._handleRoleChange}"
          id="role"
          style="width: 100%;"
        >
          ${Object.keys(userRoles)
            .map(Number)
            .sort((a, b) => a - b)
            .filter(x => x <= 4 || this.ismulti)
            .map(
              role => html`
                <md-select-option
                  value="${role}"
                  ?selected="${role === (this.data.role ?? defaultRole)}"
                >
                  <div slot="headline">${this._(userRoles[role])}</div>
                </md-select-option>
              `
            )}
        </md-filled-select>
      </p>
    `
  }

  _renderPerson() {
    return html`
      <p class="person-hint">
        ${this.requirePerson
          ? this._(
              'A user must be a person in the tree. Select the person first.'
            )
          : this._(
              'As an administrator, you can also add a user without a person, such as a test or technical account.'
            )}
      </p>
      <grampsjs-form-select-object-list
        fixedMenuPosition
        objectType="person"
        .appState="${this.appState}"
        id="person-select"
        label="${this._('Person in the tree')}"
        @formdata:changed="${this._handlePersonChanged}"
      ></grampsjs-form-select-object-list>
      <p class="person-hint">
        ${this._(
          'The user sets their own password with an invitation link, which you get after saving.'
        )}
      </p>
    `
  }

  async _handlePersonChanged(e) {
    e.stopPropagation()
    if (e.composedPath()[0].id !== 'person-select-list') return
    const [handle] = e.detail.data
    this.data = {...this.data, person_handle: handle || ''}
    this._checkFormValid()
    if (!handle || this.data.full_name) return
    // the user's name defaults to the person's
    const res = await this.appState.apiGet(
      `/api/people/${handle}?keys=profile&profile=self&locale=${
        this.appState.i18n.lang || 'en'
      }`
    )
    const profile = res?.data?.profile
    const name = [profile?.name_given, profile?.name_surname]
      .filter(Boolean)
      .join(' ')
    if (name && !this.data.full_name && this.data.person_handle === handle) {
      this.data = {...this.data, full_name: name}
      this._checkFormValid()
    }
  }

  get hasRequiredPerson() {
    return !this.newUser || !this.requirePerson || !!this.data.person_handle
  }

  reset() {
    this.shadowRoot
      .querySelectorAll('grampsjs-form-string')
      .forEach(element => element.reset())
  }

  _handleFormData(e) {
    const originalTarget = e.composedPath()[0]
    this.data = {...this.data, [originalTarget.id]: e.detail.data}
    e.stopPropagation()
    this._checkFormValid()
  }

  _handleRoleChange(e) {
    const role = parseInt(e.target.value, 10)
    this.data = {...this.data, role}
    this._checkFormValid()
  }

  _checkFormValid() {
    const fields = Array.from(
      this.shadowRoot.querySelectorAll('grampsjs-form-string')
    )
    this.isFormValid =
      fields.every(el => el.isValid()) && this.hasRequiredPerson
  }
}

window.customElements.define('grampsjs-form-user', GrampsjsFormUser)
