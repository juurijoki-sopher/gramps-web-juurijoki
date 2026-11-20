/*
A number whose digits roll into place, one after another ("roll, don't
jump"): each digit is a column of 0 to 9 that slides to its value, the
digits starting 100 ms apart. Separators, such as the space in "2 157",
stay put. Screen readers get the number once, as text.
*/
import {html, css, LitElement} from 'lit'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

// The characters of `text` as [char, digit or null], for rendering
export function rollingParts(text) {
  return [...text].map(char => [char, /[0-9]/.test(char) ? Number(char) : null])
}

class GrampsjsRollingNumber extends LitElement {
  static get styles() {
    return css`
      :host {
        display: inline-block;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .digits {
        display: inline-flex;
      }

      .window {
        display: inline-block;
        height: 1lh;
        overflow: hidden;
        vertical-align: top;
      }

      .strip {
        display: flex;
        flex-direction: column;
        transform: translateY(calc(-1lh * var(--digit, 0)));
        transition: transform var(--grampsjs-motion-roll-duration, 0ms)
          var(--grampsjs-motion-ease-out, ease-out);
        transition-delay: calc(
          var(--grampsjs-motion-roll-stagger, 0ms) * var(--index, 0)
        );
      }

      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    `
  }

  static get properties() {
    return {
      value: {type: Number},
      lang: {type: String},
      // false until the first frame, so the digits start at 0 and roll
      _rolled: {state: true},
    }
  }

  constructor() {
    super()
    this.value = 0
    this.lang = ''
    this._rolled = false
  }

  get _text() {
    try {
      return new Intl.NumberFormat(this.lang || undefined).format(this.value)
    } catch {
      return String(this.value)
    }
  }

  firstUpdated() {
    // after the digits are on screen at 0, so the change is animated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._rolled = true
      })
    })
  }

  render() {
    const text = this._text
    let index = 0
    return html`<span class="visually-hidden">${text}</span
      ><span class="digits" aria-hidden="true"
        >${rollingParts(text).map(([char, digit]) => {
          if (digit === null) {
            return html`<span>${char}</span>`
          }
          const style = `--digit: ${
            this._rolled ? digit : 0
          }; --index: ${index}`
          index += 1
          return html`<span class="window"
            ><span class="strip" style="${style}"
              >${DIGITS.map(d => html`<span>${d}</span>`)}</span
            ></span
          >`
        })}</span
      >`
  }
}

window.customElements.define('grampsjs-rolling-number', GrampsjsRollingNumber)
