/*
Split control for the create-new vs link-existing pair used on object
editors. The leading half creates; the chevron lists both actions.
*/

import {html, LitElement} from 'lit'
import {mdiLinkPlus, mdiPlus} from '@mdi/js'
import '@material/web/menu/menu-item.js'

import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsSplitButton.js'
import './GrampsjsIcon.js'

export class GrampsjsAddOrLinkButton extends GrampsjsAppStateMixin(LitElement) {
  static get properties() {
    return {
      addLabel: {type: String},
      linkLabel: {type: String},
      variant: {type: String},
      compact: {type: Boolean},
      iconColor: {type: String},
    }
  }

  constructor() {
    super()
    this.addLabel = ''
    this.linkLabel = ''
    this.variant = 'icon'
    this.compact = false
    this.iconColor = 'var(--mdc-theme-secondary)'
  }

  render() {
    const addLabel = this.addLabel || this._('Create new')
    const linkLabel = this.linkLabel || this._('Select existing')
    return html`
      <grampsjs-split-button
        variant="${this.variant}"
        ?compact="${this.compact}"
        label="${addLabel}"
        icon="${mdiPlus}"
        iconColor="${this.iconColor}"
        menuAriaLabel="${this._('More actions')}"
        .appState="${this.appState}"
        @split-button:primary="${this._handleAdd}"
      >
        <md-menu-item @click="${this._handleAdd}">
          <span slot="headline">${addLabel}</span>
          <grampsjs-icon
            slot="start"
            path="${mdiPlus}"
            color="var(--grampsjs-body-font-color-35)"
          ></grampsjs-icon>
        </md-menu-item>
        <md-menu-item @click="${this._handleLink}">
          <span slot="headline">${linkLabel}</span>
          <grampsjs-icon
            slot="start"
            path="${mdiLinkPlus}"
            color="var(--grampsjs-body-font-color-35)"
          ></grampsjs-icon>
        </md-menu-item>
      </grampsjs-split-button>
    `
  }

  _handleAdd(e) {
    e.stopPropagation()
    fireEvent(this, 'add-or-link:add')
  }

  _handleLink(e) {
    e.stopPropagation()
    fireEvent(this, 'add-or-link:link')
  }
}

window.customElements.define(
  'grampsjs-add-or-link-button',
  GrampsjsAddOrLinkButton
)
