/*
The number of objects of each type in the tree, as tiles that lead to the
lists
*/

import {LitElement, html, css} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import {objectIconPath} from '../util.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import './GrampsjsIcon.js'
import './GrampsjsRollingNumber.js'

// [key in the object counts, icon, list path, label]
const TYPES = [
  ['people', 'person', 'people', 'People'],
  ['families', 'family', 'families', 'Families'],
  ['events', 'event', 'events', 'Events'],
  ['places', 'place', 'places', 'Places'],
  ['sources', 'source', 'sources', 'Sources'],
  ['citations', 'citation', 'citations', 'Citations'],
  ['repositories', 'repository', 'repositories', 'Repositories'],
  ['notes', 'note', 'notes', 'Notes'],
  ['media', 'media', 'medialist', 'Media'],
]

export class GrampsjsStatistics extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
        }

        /* one tile per object type: the number first, large, as it is
           what the panel is about, and the type below it */
        .tiles {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: var(--grampsjs-space-2);
          margin: 0 var(--grampsjs-space-2) var(--grampsjs-space-2);
        }

        a.tile,
        a.tile:link,
        a.tile:visited {
          display: flex;
          flex-direction: column;
          gap: var(--grampsjs-space-1);
          padding: var(--grampsjs-space-3);
          border-radius: var(--grampsjs-radius-sm);
          background-color: var(--md-sys-color-surface);
          color: var(--grampsjs-body-font-color);
          text-decoration: none;
          outline: none;
          transition: background-color 100ms ease-out;
        }

        a.tile:hover {
          background-color: var(
            --grampsjs-row-hover-color,
            var(--grampsjs-body-font-color-5)
          );
          text-decoration: none;
        }

        a.tile:focus-visible {
          outline: 2px solid var(--md-sys-color-primary);
          outline-offset: 2px;
        }

        .number {
          font-size: var(--grampsjs-font-size-xl);
          font-weight: var(--grampsjs-font-weight-medium);
          font-variant-numeric: tabular-nums;
          line-height: 1.2;
          color: var(--grampsjs-on-tonal-color);
        }

        .label {
          display: flex;
          align-items: center;
          gap: var(--grampsjs-space-2);
          font-size: var(--grampsjs-font-size-sm);
          color: var(--grampsjs-text-secondary-color);
        }

        .label grampsjs-icon {
          flex: none;
        }
      `,
    ]
  }

  static get properties() {
    return {
      data: {type: Object},
    }
  }

  constructor() {
    super()
    this.data = {}
  }

  render() {
    const lang = (this.appState?.i18n?.lang || '').replace('_', '-')
    return html`
      <h3>${this._('Statistics')}</h3>
      <div class="tiles">
        ${TYPES.filter(([key]) => key in this.data).map(
          ([key, icon, path, label]) => html`
            <a class="tile" href="/${path}">
              <span class="number">
                <grampsjs-rolling-number
                  .value="${this.data[key]}"
                  lang="${lang}"
                ></grampsjs-rolling-number>
              </span>
              <span class="label">
                <grampsjs-icon
                  path="${objectIconPath[icon]}"
                  color="currentColor"
                  height="16"
                  width="16"
                ></grampsjs-icon>
                ${this._(label)}
              </span>
            </a>
          `
        )}
      </div>
    `
  }
}

window.customElements.define('grampsjs-statistics', GrampsjsStatistics)
