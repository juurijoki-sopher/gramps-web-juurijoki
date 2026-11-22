import {css, html} from 'lit'

import '@material/web/select/filled-select'
import '@material/web/select/select-option'

import {GrampsjsView} from './GrampsjsView.js'

import {GrampsjsStaleDataMixin} from '../mixins/GrampsjsStaleDataMixin.js'
import '../components/GrampsjsUsers.js'
import '../components/GrampsjsShareUrl.js'
import '../components/GrampsjsChatPermissions.js'

// a random password of 32 bytes, as base64
export function randomPassword() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export class GrampsjsViewUserManagement extends GrampsjsStaleDataMixin(
  GrampsjsView
) {
  static get styles() {
    return [
      super.styles,
      css`
        grampsjs-share-url {
          --md-icon-button-icon-size: 18px;
          --md-icon-button-state-layer-width: 32px;
          --md-icon-button-state-layer-height: 32px;
          position: relative;
          top: -5px;
          color: var(--grampsjs-body-font-color-40);
        }

        span.url {
          border-radius: var(--grampsjs-radius-xs);
          border: 1px solid var(--grampsjs-body-font-color-15);
          font-size: var(--grampsjs-font-size-xs);
          padding: 6px 6px;
          color: var(--grampsjs-text-secondary-color);
        }
      `,
    ]
  }

  static get properties() {
    return {
      userData: {type: Array},
      dbInfo: {type: Object},
      _links: {type: Object},
      _people: {type: Object},
    }
  }

  constructor() {
    super()
    this.userData = []
    this.dbInfo = {}
    this._links = {}
    this._people = {}
  }

  // eslint-disable-next-line class-methods-use-this
  get _registerUrl() {
    const url = new URL(document.URL)
    const {tree} = this.appState.auth.claims
    return `${url.origin}/register/${tree}`
  }

  renderContent() {
    return html`
      ${this.dbInfo?.server?.chat
        ? html`<grampsjs-chat-permissions
            .appState="${this.appState}"
          ></grampsjs-chat-permissions>`
        : ''}
      ${this.dbInfo?.server?.multi_tree
        ? html` <p>
            ${this._('Registration link')}:
            <span class="url">${this._registerUrl}</span>
            <grampsjs-share-url
              href="${this._registerUrl}"
              .appState="${this.appState}"
            ></grampsjs-share-url>
          </p>`
        : ''}

      <grampsjs-users
        .appState="${this.appState}"
        .data="${this.userData}"
        ?ismulti="${!!this.dbInfo?.server?.multi_tree}"
        .links="${this._links}"
        .people="${this._people}"
        ?isAdmin="${!!this.appState.permissions?.canViewOtherTree}"
        @user:linked="${this._handleUserLinked}"
        @user:invited="${this._handleUserInvited}"
        @user:updated="${this._handleUserChanged}"
        @user:added="${this._handleUserAdded}"
        @user:deleted="${this._handleUserDeleted}"
        @user:added-multiple="${this._handleUsersAdded}"
      >
      </grampsjs-users>
    `
  }

  firstUpdated() {
    this._fetchUserData()
  }

  // users can be added elsewhere, e.g. by restoring a backup
  handleUpdateStaleData() {
    this._fetchUserData()
  }

  _handleUserChanged(e) {
    const data = e.detail
    this._updateUser(e.detail.name, {
      role: data.role,
      email: data.email,
      full_name: data.full_name,
    })
  }

  _handleUserAdded(e) {
    const data = e.detail
    this._addUser(
      e.detail.name,
      {
        role: data.role,
        email: data.email,
        full_name: data.full_name,
        // nobody sees this password: the user sets their own with the
        // invitation link
        password: randomPassword(),
      },
      data.person_handle
    )
  }

  async _handleUserLinked(e) {
    const {name, person_handle: personHandle} = e.detail
    const data = await this.appState.apiPut(
      `/api/juurijoki/user-links/${encodeURIComponent(name)}/`,
      {person_handle: personHandle}
    )
    this._handleResult(data)
  }

  _handleResult(data) {
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
    } else {
      this.error = false
      this._fetchUserData()
    }
  }

  _handleUserDeleted(e) {
    this._deleteUser(e.detail)
  }

  async _handleUsersAdded(e) {
    const res = await this.appState.apiPost('/api/users/', e.detail)
    if ('error' in res) {
      this.error = true
      this._errorMessage = res.error
    } else {
      this.error = false
      this._fetchUserData()
    }
  }

  _updateUser(username, payload) {
    this.appState.apiPut(`/api/users/${username}/`, payload).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  // the person goes in the query, as the API checks the body's fields
  async _addUser(username, payload, personHandle) {
    const query = personHandle
      ? `?person_handle=${encodeURIComponent(personHandle)}`
      : ''
    const data = await this.appState.apiPost(
      `/api/users/${username}/${query}`,
      payload
    )
    this._handleResult(data)
    if (!('error' in data)) {
      await this._invite(username)
    }
  }

  async _handleUserInvited(e) {
    await this._invite(e.detail)
  }

  // an invitation link for the user to set their own password, also sent
  // by e-mail when the server can send e-mail
  async _invite(username) {
    const data = await this.appState.apiPost(
      `/api/juurijoki/invites/${encodeURIComponent(username)}/`,
      {}
    )
    if ('error' in data) {
      this.error = true
      this._errorMessage = data.error
      return
    }
    this.renderRoot
      .querySelector('grampsjs-users')
      ?.showInvite(username, data.data)
  }

  _deleteUser(username) {
    this.appState.apiDelete(`/api/users/${username}/`).then(data => {
      if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      } else {
        this.error = false
        this._fetchUserData()
      }
    })
  }

  // which person each account belongs to, and those people's names
  async _fetchLinks() {
    const res = await this.appState.apiGet('/api/juurijoki/user-links/')
    if (!Array.isArray(res?.data)) return
    const links = Object.fromEntries(
      res.data.map(link => [link.name, link.person_handle])
    )
    this._links = links
    const lang = this.appState.i18n.lang || 'en'
    const handles = [...new Set(Object.values(links))].filter(
      handle => !(handle in this._people)
    )
    const people = await Promise.all(
      handles.map(async handle => {
        const person = await this.appState.apiGet(
          `/api/people/${handle}?keys=gramps_id,profile&profile=self&locale=${lang}`
        )
        if (!person?.data) return [handle, null]
        const {profile} = person.data
        const name = [profile?.name_given, profile?.name_surname]
          .filter(Boolean)
          .join(' ')
        return [
          handle,
          {
            name: name || person.data.gramps_id,
            href: `/person/${person.data.gramps_id}`,
          },
        ]
      })
    )
    this._people = {...this._people, ...Object.fromEntries(people)}
  }

  _fetchUserData() {
    this._fetchLinks()
    this.loading = true
    this.appState.apiGet('/api/users/').then(data => {
      if ('data' in data) {
        this.error = false
        this.userData = data.data
      } else if ('error' in data) {
        this.error = true
        this._errorMessage = data.error
      }
      this.loading = false
    })
  }
}

window.customElements.define(
  'grampsjs-view-user-management',
  GrampsjsViewUserManagement
)
