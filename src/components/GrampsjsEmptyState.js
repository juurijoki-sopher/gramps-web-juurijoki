import {html, css, LitElement} from 'lit'

import {sharedStyles} from '../SharedStyles.js'
import './GrampsjsIcon.js'

/* What a list shows when it has nothing to show: an icon, a short message
that says why, and, in the default slot, the action that helps, such as
clearing the filters. */
export class GrampsjsEmptyState extends LitElement {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          margin: var(--grampsjs-space-5) 0;
        }

        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--grampsjs-space-3);
          padding: var(--grampsjs-space-6) var(--grampsjs-space-4);
          border-radius: var(--grampsjs-radius-md);
          background-color: var(--grampsjs-panel-color);
          text-align: center;
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: var(--grampsjs-tonal-color);
        }

        .message {
          margin: 0;
          max-width: 40ch;
          font-size: var(--grampsjs-font-size-body);
          color: var(--grampsjs-body-font-color);
        }

        ::slotted(*) {
          margin-top: var(--grampsjs-space-1);
        }
      `,
    ]
  }

  static get properties() {
    return {
      icon: {type: String},
      message: {type: String},
    }
  }

  constructor() {
    super()
    this.icon = ''
    this.message = ''
  }

  render() {
    return html`
      <div class="container" role="status">
        ${this.icon
          ? html`<div class="icon">
              <grampsjs-icon
                .path="${this.icon}"
                color="var(--grampsjs-on-tonal-color)"
                height="28"
                width="28"
              ></grampsjs-icon>
            </div>`
          : ''}
        <p class="message">${this.message}</p>
        <slot></slot>
      </div>
    `
  }
}

window.customElements.define('grampsjs-empty-state', GrampsjsEmptyState)
