import {html, css} from 'lit'

import '@material/web/dialog/dialog.js'
import '@material/web/button/text-button.js'
import '@material/web/button/filled-button.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/iconbutton/icon-button.js'

import {
  mdiAccountMultiplePlus,
  mdiAccountPlus,
  mdiDeleteForever,
  mdiContentCopy,
  mdiDownload,
  mdiEmailArrowRight,
  mdiFilterOff,
  mdiLinkVariant,
  mdiPencil,
} from '@mdi/js'

import {GrampsjsTableBase} from './GrampsjsTableBase.js'
import {userRoles} from './GrampsjsFormUser.js'
import {fireEvent} from '../util.js'
import './GrampsjsFormSelectObjectList.js'

import './GrampsjsTooltip.js'
import './GrampsjsIcon.js'
import './GrampsjsHelpButton.js'

const ALL_ROLES = '__all__'

export class GrampsjsUsers extends GrampsjsTableBase {
  static get styles() {
    return [
      super.styles,
      css`
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          flex-direction: row;
          align-items: center;
          gap: var(--grampsjs-space-2);
          margin-top: 16px;
          margin-bottom: 4px;
        }

        .toolbar {
          display: flex;
          align-items: center;
        }

        .invite-url {
          display: flex;
          align-items: center;
          gap: var(--grampsjs-space-2);
        }

        .invite-url md-filled-text-field {
          flex: 1;
        }

        .invite .hint {
          color: var(--grampsjs-text-secondary-color);
          font-size: var(--grampsjs-font-size-sm);
        }

        .unlinked {
          color: var(--grampsjs-text-secondary-color);
          font-style: italic;
        }

        md-filled-text-field {
          flex: 1 1 200px;
          min-width: 140px;
        }

        md-filled-select {
          flex: 0 1 160px;
          min-width: 130px;
        }

        .clear-filters {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px 0;
          color: var(--mdc-theme-secondary);
        }

        .clear-filters:hover {
          text-decoration: underline;
        }
      `,
    ]
  }

  static get properties() {
    return {
      dialogContent: {type: String},
      ismulti: {type: Boolean},
      // user name -> handle of the person the account belongs to
      links: {type: Object},
      // person handle -> {name, grampsId}, or null if no longer in the tree
      people: {type: Object},
      // administrators may add users without a person and change links
      isAdmin: {type: Boolean},
      // false when password sign-in is off: invitation links set a password
      canInvite: {type: Boolean},
      _linkHandle: {type: String},
      _downloadUrl: {type: String},
      _userData: {type: Array},
      _filterText: {type: String},
      _filterRole: {type: String},
    }
  }

  constructor() {
    super()
    this.dialogContent = ''
    this.ismulti = false
    this.links = {}
    this.people = {}
    this.isAdmin = false
    this.canInvite = true
    this._linkHandle = ''
    this._downloadUrl = ''
    this._userData = []
    this._filterText = ''
    this._filterRole = ALL_ROLES
  }

  get _filteredData() {
    const text = this._filterText.toLowerCase()
    return this.data.filter(obj => {
      const matchesText =
        !text ||
        (obj.name || '').toLowerCase().includes(text) ||
        (obj.full_name || '').toLowerCase().includes(text) ||
        (obj.email || '').toLowerCase().includes(text)
      const matchesRole =
        this._filterRole === ALL_ROLES || String(obj.role) === this._filterRole
      return matchesText && matchesRole
    })
  }

  render() {
    if (this.data.length === 0) {
      return html``
    }
    const filtered = this._filteredData
    return html`
      ${this._renderButtons()} ${this._renderFilterBar()}
      <table>
        <thead>
          <tr>
            <th>${this._('Username: ').replace(':', '')}</th>
            <th>${this._('Full Name')}</th>
            <th>${this._('E-mail')}</th>
            <th>${this._('Person')}</th>
            <th>${this._('Role')}</th>
            <th>${this._('Account Source')}</th>
            <th></th>
          </tr>
        </thead>
        ${filtered.map(
          (obj, index) => html`
            <tr>
              <td>${obj.name}</td>
              <td>${obj.full_name}</td>
              <td>${obj.email}</td>
              <td>${this._renderPerson(obj.name, index)}</td>
              <td>${this._(userRoles[obj.role])}</td>
              <td>${obj.account_source || this._('Password')}</td>
              <td>
                ${this.canInvite
                  ? html`
                      <md-icon-button
                        class="edit"
                        aria-label="${this._('Invitation link')}"
                        @click="${() =>
                          fireEvent(this, 'user:invited', obj.name)}"
                        id="button-invite-${index}"
                      >
                        <grampsjs-icon
                          path="${mdiEmailArrowRight}"
                          height="20"
                          width="20"
                          color="var(--mdc-theme-secondary)"
                        ></grampsjs-icon>
                      </md-icon-button>
                      <grampsjs-tooltip for="button-invite-${index}">
                        ${this._('Invitation link')}
                      </grampsjs-tooltip>
                    `
                  : ''}
                <md-icon-button
                  class="edit"
                  aria-label="${this._('Edit user')}"
                  @click="${e => this._handleEditClick(e, obj.name)}"
                  id="button-edit-${index}"
                >
                  <grampsjs-icon
                    path="${mdiPencil}"
                    height="20"
                    width="20"
                    color="var(--mdc-theme-secondary)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="button-edit-${index}">
                  ${this._('Edit user')}
                </grampsjs-tooltip>
                <md-icon-button
                  class="error"
                  aria-label="${this._('Delete user')}"
                  @click="${e => this._handleDeleteClick(e, obj.name)}"
                  id="button-del-${index}"
                >
                  <grampsjs-icon
                    path="${mdiDeleteForever}"
                    height="20"
                    width="20"
                    color="var(--grampsjs-alert-error-font-color)"
                  ></grampsjs-icon>
                </md-icon-button>
                <grampsjs-tooltip for="button-del-${index}">
                  ${this._('Delete user')}
                </grampsjs-tooltip>
              </td>
            </tr>
          `
        )}
      </table>
      ${this.dialogContent}
    `
  }

  _renderFilterBar() {
    return html`
      <div class="filter-bar">
        <md-filled-text-field
          type="search"
          label="${this._('Search')}"
          .value="${this._filterText}"
          @input="${e => {
            this._filterText = e.target.value
          }}"
        ></md-filled-text-field>
        <md-filled-select
          label="${this._('Role')}"
          .value="${this._filterRole}"
          @change="${e => {
            this._filterRole = e.target.value
          }}"
        >
          <md-select-option value="${ALL_ROLES}">
            <div slot="headline">${this._('All')}</div>
          </md-select-option>
          ${Object.keys(userRoles)
            .map(Number)
            .sort((a, b) => a - b)
            .map(
              role => html`
                <md-select-option value="${role}">
                  <div slot="headline">${this._(userRoles[role])}</div>
                </md-select-option>
              `
            )}
        </md-filled-select>
        ${this._filterText || this._filterRole !== ALL_ROLES
          ? html`
              <button
                class="clear-filters"
                id="btn-clear-filters"
                @click="${this._clearFilters}"
              >
                <grampsjs-icon
                  path="${mdiFilterOff}"
                  height="24"
                  width="24"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </button>
              <grampsjs-tooltip for="btn-clear-filters">
                ${this._('Clear all filters')}
              </grampsjs-tooltip>
            `
          : ''}
      </div>
    `
  }

  _clearFilters() {
    this._filterText = ''
    this._filterRole = ALL_ROLES
  }

  _renderPerson(username, index) {
    const handle = this.links[username]
    let label = html`<span class="unlinked">${this._('Not linked')}</span>`
    if (handle) {
      const person = this.people[handle]
      if (person === null) {
        label = html`<span class="unlinked"
          >${this._('Person deleted from the tree')}</span
        >`
      } else if (person) {
        label = html`<a href="${person.href}">${person.name}</a>`
      } else {
        label = html`<span>…</span>`
      }
    }
    // owners link accounts that have no person; changing a link is for
    // administrators
    const canLink = !handle || this.isAdmin
    const action = handle ? 'Change the linked person' : 'Link to a person'
    return html`
      ${label}
      ${canLink
        ? html`
            <md-icon-button
              class="edit"
              aria-label="${this._(action)}"
              id="button-link-${index}"
              @click="${() => this._handleLinkClick(username)}"
            >
              <grampsjs-icon
                path="${mdiLinkVariant}"
                height="20"
                width="20"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
            <grampsjs-tooltip for="button-link-${index}">
              ${this._(action)}
            </grampsjs-tooltip>
          `
        : ''}
    `
  }

  // the invitation link for a new or existing user, from the API
  showInvite(username, invite) {
    this.dialogContent = this._inviteDialog(username, invite)
  }

  _inviteDialog(username, invite) {
    const expires = new Date(invite.expires).toLocaleString(
      this.appState?.i18n?.lang || undefined,
      {dateStyle: 'medium', timeStyle: 'short'}
    )
    let emailNote = this._(
      'The server cannot send e-mail, so send the link to the user yourself.'
    )
    if (invite.email_sent) {
      emailNote = this._('The link was also sent to the user by e-mail.')
    } else if (invite.email_error) {
      emailNote = `${this._(invite.email_error)} ${this._(
        'Send the link to the user yourself.'
      )}`
    }
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline"
          >${this._('Invitation link')} &ndash; ${username}</span
        >
        <div slot="content" class="invite">
          <p>
            ${this._(
              'With this link, the user sets their own password. It works once and is valid until %s.',
              expires
            )}
          </p>
          <p>${this._('Username: ')} <strong>${username}</strong></p>
          <div class="invite-url">
            <md-filled-text-field
              readonly
              id="invite-url"
              label="${this._('Invitation link')}"
              .value="${invite.url}"
              @focus="${e => e.target.select()}"
            ></md-filled-text-field>
            <md-icon-button
              aria-label="${this._('Copy')}"
              @click="${() => this._copyInvite(invite.url)}"
            >
              <grampsjs-icon
                path="${mdiContentCopy}"
                color="var(--mdc-theme-secondary)"
              ></grampsjs-icon>
            </md-icon-button>
          </div>
          <p class="hint">${emailNote}</p>
          <p class="hint">
            ${this._(
              'Share the link only with this user: whoever opens it can set the password.'
            )}
          </p>
        </div>
        <div slot="actions">
          <md-filled-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Close')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  async _copyInvite(url) {
    try {
      await navigator.clipboard.writeText(url)
      fireEvent(this, 'grampsjs:notification', {message: this._('Copied')})
    } catch (e) {
      // no clipboard access: the field is selected for copying by hand
      const field = this.renderRoot.querySelector('#invite-url')
      field?.focus()
      field?.select()
    }
  }

  _handleLinkClick(username) {
    this._linkHandle = ''
    this.dialogContent = this._linkDialog(username)
  }

  _linkDialog(username) {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline"
          >${this._('Link to a person')} &ndash; ${username}</span
        >
        <div slot="content">
          <grampsjs-form-select-object-list
            fixedMenuPosition
            style="min-height: 300px;"
            objectType="person"
            .appState="${this.appState}"
            id="link-person"
            label="${this._('Person in the tree')}"
            @formdata:changed="${this._handleLinkPersonChanged}"
          ></grampsjs-form-select-object-list>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${() => this._handleLinkSave(username)}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handleLinkPersonChanged(e) {
    e.stopPropagation()
    if (e.composedPath()[0].id !== 'link-person-list') return
    this._linkHandle = e.detail.data[0] || ''
  }

  _handleLinkSave(username) {
    if (!this._linkHandle) return
    fireEvent(this, 'user:linked', {
      name: username,
      person_handle: this._linkHandle,
    })
    this.dialogContent = ''
  }

  _renderButtons() {
    return html`
      <p class="toolbar">
        <md-icon-button
          class="edit"
          aria-label="${this._('Add a new user')}"
          @click="${this._handleAddClick}"
          id="button-add"
        >
          <grampsjs-icon
            path="${mdiAccountPlus}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button-add">
          ${this._('Add a new user')}
        </grampsjs-tooltip>

        ${this.isAdmin
          ? html`
              <md-icon-button
                class="edit"
                aria-label="${this._('Import user accounts')}"
                id="button-import"
                @click="${this._handleImportClick}"
              >
                <grampsjs-icon
                  path="${mdiAccountMultiplePlus}"
                  color="var(--mdc-theme-secondary)"
                ></grampsjs-icon>
              </md-icon-button>
              <grampsjs-tooltip for="button-import">
                ${this._('Import user accounts')}
              </grampsjs-tooltip>
            `
          : ''}

        <md-icon-button
          class="edit"
          aria-label="${this._('Export user details')}"
          id="button-export"
          @click="${this._handleExportClick}"
        >
          <grampsjs-icon
            path="${mdiDownload}"
            color="var(--mdc-theme-secondary)"
          ></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button-export">
          ${this._('Export user details')}
        </grampsjs-tooltip>
        <grampsjs-help-button
          path="administration/users/"
          .appState="${this.appState}"
        ></grampsjs-help-button>
        <a
          download="grampsweb-export-users.json"
          href="${this._downloadUrl}"
          id="downloadanchor"
          >&nbsp;</a
        >
      </p>
    `
  }

  _handleEditClick(e, username) {
    this.dialogContent = this._editUserDialog(username)
    this._openDialog()
  }

  _handleDeleteClick(e, username) {
    this.dialogContent = this._deleteUserDialog(username)
    this._openDialog()
  }

  _handleAddClick() {
    this.dialogContent = this._addUserDialog()
    this._openDialog()
  }

  _openDialog() {
    const dialog = this.shadowRoot.querySelector('md-dialog')
    if (dialog !== null) {
      dialog.show()
    }
  }

  _handleImportClick() {
    this._userData = []
    this.dialogContent = this._importUsersDialog()
    this._openDialog()
  }

  async _handleExportClick() {
    this._downloadUrl = ''
    const blob = new Blob([JSON.stringify(this.data)], {
      type: 'application/json',
    })
    this._downloadUrl = URL.createObjectURL(blob)
  }

  _importUsersDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Import user accounts')}</span>
        <div slot="content">
          <grampsjs-form-upload
            accept=".json"
            filename
            @formdata:changed="${this._handleUploadChanged}"
          ></grampsjs-form-upload>
        </div>
        <div slot="actions">
          <md-text-button @click="${this._handleDialogCancel}">
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button
            ?disabled="${this._userData.length === 0}"
            @click="${this._handleUpload}"
          >
            ${this._('Import')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  async _handleUploadChanged() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    try {
      const data = await uploadForm.readAsJson()
      this._processUserData(data)
    } catch {
      uploadForm.reset()
      fireEvent(this, 'grampsjs:error', {
        message: this._('Error parsing JSON file'),
      })
      return
    }
    this.dialogContent = this._importUsersDialog()
  }

  _processUserData(data) {
    const processedData = data
      .map(user => ({
        name: user.name,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      }))
      .filter(user => !!user.name)
    this._userData = processedData
  }

  async _handleUpload() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    fireEvent(this, 'user:added-multiple', this._userData)
    uploadForm.reset()
    this.dialogContent = ''
  }

  _handleDialogCancel() {
    const uploadForm = this.shadowRoot.querySelector('grampsjs-form-upload')
    uploadForm.reset()
    this.dialogContent = ''
  }

  _startDownload() {
    this.shadowRoot.querySelector('#downloadanchor').click()
    URL.revokeObjectURL(this._downloadUrl)
    this._downloadUrl = ''
  }

  _editUserDialog(username) {
    const [user] = this.data.filter(el => el.name === username)
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Edit user')} &ndash; ${username}</span>
        <div slot="content">
          <grampsjs-form-user
            .data="${user}"
            .appState="${this.appState}"
            ?ismulti="${this.ismulti}"
          ></grampsjs-form-user>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleSave}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _deleteUserDialog(username) {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <div slot="content">
          <div>
            ${this._('Do you really want to delete user "%s"?', username)}
          </div>
          <div>${this._('This action cannot be undone.')}</div>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-text-button @click="${() => this._handleDelete(username)}">
            ${this._('_Delete')}
          </md-text-button>
        </div>
      </md-dialog>
    `
  }

  _addUserDialog() {
    return html`
      <md-dialog open @cancel="${e => e.preventDefault()}">
        <span slot="headline">${this._('Add a new user')}</span>
        <div slot="content">
          <grampsjs-form-user
            newUser
            .requirePerson="${!this.isAdmin}"
            .appState="${this.appState}"
            ?ismulti="${this.ismulti}"
          ></grampsjs-form-user>
        </div>
        <div slot="actions">
          <md-text-button
            @click="${() => {
              this.dialogContent = ''
            }}"
          >
            ${this._('Cancel')}
          </md-text-button>
          <md-filled-button @click="${this._handleSave}">
            ${this._('_Save')}
          </md-filled-button>
        </div>
      </md-dialog>
    `
  }

  _handleSave() {
    const form = this.shadowRoot.querySelector('grampsjs-form-user')
    if (form !== null) {
      if (!form.hasRequiredPerson) {
        fireEvent(this, 'grampsjs:error', {
          message: this._(
            'A user must be a person in the tree. Select the person first.'
          ),
        })
        return
      }
      const existingUser = this.data
        .map(user => user.name)
        .includes(form.data.name)
      fireEvent(this, existingUser ? 'user:updated' : 'user:added', form.data)
      this.dialogContent = ''
    }
  }

  _handleDelete(username) {
    fireEvent(this, 'user:deleted', username)
    this.dialogContent = ''
  }

  updated(changed) {
    if (changed.has('_downloadUrl') && this._downloadUrl) {
      this._startDownload()
    }
  }
}

window.customElements.define('grampsjs-users', GrampsjsUsers)
