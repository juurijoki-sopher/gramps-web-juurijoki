/*
Four-layer lighting for md-filled-button, so a flat fill does not look cheap.

The recipe is the one for a coloured button that should look lit from above:

  1. top light    — inset highlight where light hits the top edge
  2. bottom shade — inset darker line under the bottom edge
  3. contact      — tight dark shadow where the button meets the page
  4. glow         — soft coloured bloom of light bouncing off the fill

plus a gentle top-to-bottom gradient on the face, and the same layers
inverted on press. Applied inside the button's shadow tree so the inset
layers sit on the fill, not under it. The face colour is still
`--md-filled-button-container-color` (primary by default), including the
few buttons that override it.
*/

import {css} from 'lit'
import {MdFilledButton} from '@material/web/button/filled-button.js'

export const filledButtonLighting = css`
  :host {
    --md-filled-button-hover-container-elevation: 0;
    --grampsjs-filled-glow: color-mix(
      in srgb,
      var(--_container-color) 60%,
      transparent
    );
  }

  .background {
    background: linear-gradient(
      to bottom,
      color-mix(in srgb, #ffffff 16%, var(--_container-color)),
      var(--_container-color)
    );
    box-shadow: inset 0 1px 0 var(--grampsjs-filled-top-light, #ffffff59),
      inset 0 -2px 0 var(--grampsjs-filled-bottom-shade, #0003),
      0 1px 2px var(--grampsjs-filled-contact, #0006),
      0 8px 24px -6px var(--grampsjs-filled-glow);
    transition: box-shadow var(--grampsjs-motion-press-duration, 100ms)
        var(--grampsjs-motion-ease-out, ease-out),
      background var(--grampsjs-motion-press-duration, 100ms)
        var(--grampsjs-motion-ease-out, ease-out);
  }

  :host(:hover:not([disabled], [soft-disabled])) {
    --grampsjs-filled-glow: color-mix(
      in srgb,
      var(--_container-color) 75%,
      transparent
    );
  }

  :host(:active:not([disabled], [soft-disabled])) .background {
    background: linear-gradient(
      to bottom,
      var(--_container-color),
      color-mix(in srgb, #000000 10%, var(--_container-color))
    );
    box-shadow: inset 0 2px 4px #0005, inset 0 -1px 0 #ffffff40, 0 1px 1px #0004;
  }

  :host(:is([disabled], [soft-disabled])) .background {
    box-shadow: none;
  }

  @media (forced-colors: active) {
    .background {
      background: var(--_container-color);
      box-shadow: none;
    }
  }
`

MdFilledButton.elementStyles.push(filledButtonLighting)
