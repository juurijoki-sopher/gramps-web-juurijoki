/*
A 4px thinking bar: a gradient three times as wide as the bar, looping so
the same colour meets at both ends, with the edges feathered by a mask.
The recipe is the one for a thinking / loading state rather than a
determinate progress value.
*/

import {LitElement, css} from 'lit'

export const THINKING_BAR_COLORS = ['#4285f4', '#9b72cb', '#d96570', '#f9ab00']

export class GrampsjsThinkingBar extends LitElement {
  static get styles() {
    return css`
      :host {
        display: block;
        height: var(--grampsjs-space-1);
        border-radius: var(--grampsjs-thinking-radius, 2px);
        background: linear-gradient(
          90deg,
          var(--grampsjs-thinking-1, #4285f4),
          var(--grampsjs-thinking-2, #9b72cb),
          var(--grampsjs-thinking-3, #d96570),
          var(--grampsjs-thinking-4, #f9ab00),
          var(--grampsjs-thinking-1, #4285f4)
        );
        background-size: 300% 100%;
        animation: grampsjs-thinking-flow 2s linear infinite;
        -webkit-mask-image: linear-gradient(
          90deg,
          transparent,
          #000 15%,
          #000 85%,
          transparent
        );
        mask-image: linear-gradient(
          90deg,
          transparent,
          #000 15%,
          #000 85%,
          transparent
        );
      }

      :host([hidden]) {
        display: none;
      }

      @keyframes grampsjs-thinking-flow {
        to {
          background-position: -300% 0;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `
  }

  static get properties() {
    return {
      label: {type: String},
    }
  }

  constructor() {
    super()
    this.label = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this.setAttribute('role', 'progressbar')
  }

  updated(changed) {
    if (!changed.has('label')) {
      return
    }
    if (this.label) {
      this.setAttribute('aria-label', this.label)
    } else {
      this.removeAttribute('aria-label')
    }
  }
}

window.customElements.define('grampsjs-thinking-bar', GrampsjsThinkingBar)
