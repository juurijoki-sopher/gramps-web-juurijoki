/*
The navigation bar at the bottom of small screens: the most used
destinations within reach of the thumb (Fitts's law), in the pattern people
know from other phone apps (Jakob's law), with the full menu one tap away.
*/
import {html, css, LitElement} from 'lit'
import '@material/web/ripple/ripple.js'
import '@material/web/focus/md-focus-ring.js'
import {mdiMagnify, mdiMenu} from '@mdi/js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {LISTS_PAGES} from '../routing.js'
import {fireEvent} from '../util.js'
import {ICONS} from './GrampsjsMainMenu.js'
import './GrampsjsIcon.js'

// Few destinations, so each is quick to find (Hick's law); the drawer holds
// the rest
export const BOTTOM_NAV_ITEMS = [
  {id: 'home', href: '/', pages: ['home'], label: 'Home'},
  {id: 'lists', href: '/people', pages: LISTS_PAGES, label: 'Lists'},
  {id: 'tree', href: '/tree', pages: ['tree'], label: 'Family Tree'},
  {id: 'search', href: '/search', pages: ['search'], label: 'Search'},
]

// The height of the bar above the safe area, as on Material 3's navigation bar
export const BOTTOM_NAV_HEIGHT = '64px'

class GrampsjsBottomNav extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          display: block;
          background-color: var(--grampsjs-drawer-background-color);
          border-top: 1px solid var(--grampsjs-divider-color);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        nav {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          height: 64px;
        }

        a,
        a:link,
        a:visited,
        button {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-width: 48px;
          height: 100%;
          padding: 0 4px;
          border: none;
          background: none;
          color: var(--md-sys-color-on-surface-variant);
          text-decoration: none;
          font: inherit;
          font-size: var(--grampsjs-font-size-2xs);
          font-weight: var(--grampsjs-font-weight-medium);
          cursor: pointer;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          --md-focus-ring-shape: 16px;
        }

        /* the selected destination's icon sits on a pill, as in the drawer */
        .indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 32px;
          border-radius: var(--grampsjs-radius-lg);
        }

        [aria-current='page'] {
          color: var(--grampsjs-drawer-selected-font-color);
          font-weight: var(--grampsjs-font-weight-heading);
        }

        [aria-current='page'] .indicator {
          background-color: var(--grampsjs-drawer-selected-color);
          color: var(--md-sys-color-primary);
        }

        .label {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media print {
          :host {
            display: none;
          }
        }
      `,
    ]
  }

  _item({id, href, pages, label}) {
    const selected = pages.includes(this.appState.path.page)
    const icons = id === 'search' ? [mdiMagnify] : ICONS[id]
    const [outline, filled = outline] = icons
    return html`
      <a
        class="pressable"
        id="bottom-nav-${id}"
        href="${href}"
        aria-current="${selected ? 'page' : 'false'}"
      >
        <md-focus-ring inward></md-focus-ring>
        <md-ripple></md-ripple>
        <span class="indicator">
          <grampsjs-icon
            path="${selected ? filled : outline}"
            color="currentColor"
          ></grampsjs-icon>
        </span>
        <span class="label">${this._(label)}</span>
      </a>
    `
  }

  render() {
    return html`
      <nav aria-label="${this._('Menu')}">
        ${BOTTOM_NAV_ITEMS.map(item => this._item(item))}
        <button
          class="pressable"
          id="bottom-nav-menu"
          type="button"
          aria-haspopup="true"
          @click="${this._openMenu}"
        >
          <md-focus-ring inward></md-focus-ring>
          <md-ripple></md-ripple>
          <span class="indicator">
            <grampsjs-icon
              path="${mdiMenu}"
              color="currentColor"
            ></grampsjs-icon>
          </span>
          <span class="label">${this._('Menu')}</span>
        </button>
      </nav>
    `
  }

  _openMenu() {
    fireEvent(this, 'drawer:toggle')
  }
}

window.customElements.define('grampsjs-bottom-nav', GrampsjsBottomNav)
