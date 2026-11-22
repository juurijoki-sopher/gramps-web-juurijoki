/*
The dropdown menu for adding objects in the top app bar. On wide screens a
split button: the leading half opens the last-used type, the chevron lists
the others. On small screens an icon button opens the full menu.
*/

import {html, css, LitElement} from 'lit'
import {
  mdiAccount,
  mdiAccountMultiple,
  mdiCalendar,
  mdiMapMarker,
  mdiBookOpenVariant,
  mdiBookmark,
  mdiArchive,
  mdiTextBox,
  mdiImage,
  mdiFormatListChecks,
  mdiPlus,
  mdiRss,
} from '@mdi/js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu'
import '@material/web/menu/menu-item'

import {sharedStyles, appBarIconButtonStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'
import './GrampsjsTooltip.js'
import './GrampsjsSplitButton.js'

export const ADD_MENU_ITEMS = [
  ['Person', '/new_person', mdiAccount],
  ['Family', '/new_family', mdiAccountMultiple],
  ['Event', '/new_event', mdiCalendar],
  ['Place', '/new_place', mdiMapMarker],
  ['Source', '/new_source', mdiBookOpenVariant],
  ['Citation', '/new_citation', mdiBookmark],
  ['Repository', '/new_repository', mdiArchive],
  ['Note', '/new_note', mdiTextBox],
  ['Media Object', '/new_media', mdiImage],
  ['Task', '/new_task', mdiFormatListChecks],
  ['Blog Post', '/new_blog_post', mdiRss],
]

export function primaryAddItem(items, lastAddObject) {
  return items.find(([title]) => title === lastAddObject) ?? items[0]
}

export function otherAddItems(items, lastAddObject) {
  const primary = primaryAddItem(items, lastAddObject)
  return items.filter(item => item !== primary)
}

class GrampsjsAddMenu extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      appBarIconButtonStyles,
      css`
        grampsjs-split-button {
          margin: 0 4px;
        }

        /* a small label above the items */
        md-menu-item.header {
          --md-menu-item-disabled-opacity: 1;
          --md-menu-item-label-text-color: var(--grampsjs-text-secondary-color);
          --md-menu-item-one-line-container-height: 32px;
          --md-menu-item-label-text-size: 13px;
        }

        .icon-wrap {
          position: relative;
        }
      `,
    ]
  }

  static get properties() {
    return {
      labelled: {type: Boolean},
    }
  }

  constructor() {
    super()
    this.labelled = false
  }

  render() {
    return this.labelled ? this._renderSplit() : this._renderIconButton()
  }

  _lastAddObject() {
    return this.appState?.settings?.lastAddObject
  }

  _primary() {
    return primaryAddItem(ADD_MENU_ITEMS, this._lastAddObject())
  }

  _renderSplit() {
    const [title, url, iconPath] = this._primary()
    return html`
      <grampsjs-split-button
        variant="filled"
        label="${this._('Add %s', this._(title))}"
        icon="${iconPath}"
        href="${url}"
        menuAriaLabel="${this._('More actions')}"
        .appState="${this.appState}"
        @split-button:primary="${() => this._remember(title)}"
      >
        ${otherAddItems(ADD_MENU_ITEMS, title).map(item =>
          this._menuItem(...item)
        )}
      </grampsjs-split-button>
    `
  }

  _renderIconButton() {
    return html`
      <div class="icon-wrap">
        <md-icon-button
          aria-label="${this._('Add')}"
          @click="${this._handleClickAdd}"
          id="button_add"
        >
          <grampsjs-icon path="${mdiPlus}" color="currentColor"></grampsjs-icon>
        </md-icon-button>
        <grampsjs-tooltip for="button_add" .appState="${this.appState}"
          >${this._('Add')}</grampsjs-tooltip
        >
        <md-menu
          id="menu_add"
          anchor="button_add"
          anchor-corner="start-end"
          menu-corner="end-end"
        >
          <md-menu-item disabled class="header"
            ><div slot="headline">${this._('Add')}</div></md-menu-item
          >
          ${ADD_MENU_ITEMS.map(menuItem => this._menuItem(...menuItem))}
        </md-menu>
      </div>
    `
  }

  _menuItem(title, url, iconPath) {
    return html`
      <md-menu-item
        href="${url}"
        graphic="icon"
        @click="${() => this._remember(title)}"
      >
        <span slot="headline">${this._(title)}</span>
        <grampsjs-icon
          slot="start"
          path="${iconPath}"
          color="var(--grampsjs-body-font-color-35)"
        ></grampsjs-icon>
      </md-menu-item>
    `
  }

  _remember(title) {
    if (title && title !== this._lastAddObject()) {
      this.appState.updateSettings({lastAddObject: title})
    }
  }

  _handleClickAdd() {
    const menu = this.shadowRoot.getElementById('menu_add')
    menu.open = !menu.open
  }
}

window.customElements.define('grampsjs-add-menu', GrampsjsAddMenu)
