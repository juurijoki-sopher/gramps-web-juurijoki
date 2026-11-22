/*
A Material 3 split button: the leading half runs the most common action,
the trailing chevron opens a menu of related variants.

Light-DOM children should be md-menu-item elements. Variants: filled, tonal,
outlined, and icon (two icon buttons, for toolbars).
*/

import {html, css, LitElement, nothing} from 'lit'
import {classMap} from 'lit/directives/class-map.js'
import {ifDefined} from 'lit/directives/if-defined.js'
import {mdiMenuDown} from '@mdi/js'
import '@material/web/button/filled-button.js'
import '@material/web/button/filled-tonal-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/iconbutton/filled-icon-button.js'
import '@material/web/iconbutton/filled-tonal-icon-button.js'
import '@material/web/iconbutton/outlined-icon-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/menu/menu.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent} from '../util.js'
import './GrampsjsIcon.js'

export class GrampsjsSplitButton extends GrampsjsAppStateMixin(LitElement) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: inline-flex;
          position: relative;
          vertical-align: middle;
        }

        .split {
          display: inline-flex;
          position: relative;
          align-items: stretch;
          gap: 2px;
        }

        /* Each half keeps its own press feedback; scaling a half would
           open a gap in the pill. */
        .split
          > :is(
            md-filled-button,
            md-filled-tonal-button,
            md-outlined-button,
            md-filled-icon-button,
            md-filled-tonal-icon-button,
            md-outlined-icon-button,
            md-icon-button
          ):active {
          scale: 1;
        }

        .primary.filled {
          --md-filled-button-container-shape-start-end: 0;
          --md-filled-button-container-shape-end-end: 0;
          --md-filled-icon-button-container-shape-start-end: 0;
          --md-filled-icon-button-container-shape-end-end: 0;
        }

        .menu-btn.filled {
          --md-filled-button-container-shape-start-start: 0;
          --md-filled-button-container-shape-end-start: 0;
          --md-filled-icon-button-container-shape-start-start: 0;
          --md-filled-icon-button-container-shape-end-start: 0;
        }

        .primary.tonal {
          --md-filled-tonal-button-container-shape-start-end: 0;
          --md-filled-tonal-button-container-shape-end-end: 0;
          --md-filled-tonal-icon-button-container-shape-start-end: 0;
          --md-filled-tonal-icon-button-container-shape-end-end: 0;
        }

        .menu-btn.tonal {
          --md-filled-tonal-button-container-shape-start-start: 0;
          --md-filled-tonal-button-container-shape-end-start: 0;
          --md-filled-tonal-icon-button-container-shape-start-start: 0;
          --md-filled-tonal-icon-button-container-shape-end-start: 0;
        }

        .primary.outlined {
          --md-outlined-button-container-shape-start-end: 0;
          --md-outlined-button-container-shape-end-end: 0;
          --md-outlined-icon-button-container-shape-start-end: 0;
          --md-outlined-icon-button-container-shape-end-end: 0;
        }

        .menu-btn.outlined {
          --md-outlined-button-container-shape-start-start: 0;
          --md-outlined-button-container-shape-end-start: 0;
          --md-outlined-icon-button-container-shape-start-start: 0;
          --md-outlined-icon-button-container-shape-end-start: 0;
        }

        .chevron {
          transition: transform 0.2s ease;
        }

        .chevron.open {
          transform: rotate(180deg);
        }
      `,
    ]
  }

  static get properties() {
    return {
      label: {type: String},
      icon: {type: String},
      href: {type: String},
      variant: {type: String},
      compact: {type: Boolean},
      disabled: {type: Boolean},
      menuAriaLabel: {type: String},
      iconColor: {type: String},
      _open: {state: true},
    }
  }

  constructor() {
    super()
    this.label = ''
    this.icon = ''
    this.href = ''
    this.variant = 'filled'
    this.compact = false
    this.disabled = false
    this.menuAriaLabel = ''
    this.iconColor = 'currentColor'
    this._open = false
  }

  render() {
    const variant = this._variant()
    return html`
      <div class="split">
        ${this._renderPrimary(variant)} ${this._renderChevron(variant)}
        <md-menu
          id="menu"
          anchor="btn-menu"
          anchor-corner="end-end"
          menu-corner="end-end"
          @opened="${this._handleOpened}"
          @closed="${this._handleClosed}"
        >
          <slot></slot>
        </md-menu>
      </div>
    `
  }

  _variant() {
    return ['filled', 'tonal', 'outlined', 'icon'].includes(this.variant)
      ? this.variant
      : 'filled'
  }

  _useIconButtons(variant) {
    return variant === 'icon' || this.compact || !this.label
  }

  _primaryIcon(iconOnly) {
    if (!this.icon) {
      return ''
    }
    return html`<grampsjs-icon
      slot="${iconOnly ? nothing : 'icon'}"
      path="${this.icon}"
      color="${this.iconColor}"
    ></grampsjs-icon>`
  }

  _primaryProps(variant, iconOnly) {
    return {
      className: classMap({primary: true, [variant]: true}),
      id: 'btn-primary',
      disabled: this.disabled,
      href: this.href || undefined,
      ariaLabel: iconOnly ? this.label || undefined : undefined,
    }
  }

  _renderPrimary(variant) {
    const iconOnly = this._useIconButtons(variant)
    const props = this._primaryProps(variant, iconOnly)
    const icon = this._primaryIcon(iconOnly)
    const label = iconOnly ? '' : this.label
    if (iconOnly) {
      return this._renderIconPrimary(variant, props, icon)
    }
    if (variant === 'tonal') {
      return html`<md-filled-tonal-button
        class="${props.className}"
        id="${props.id}"
        ?disabled="${props.disabled}"
        href="${ifDefined(props.href)}"
        @click="${this._handlePrimaryClick}"
        >${icon}${label}</md-filled-tonal-button
      >`
    }
    if (variant === 'outlined') {
      return html`<md-outlined-button
        class="${props.className}"
        id="${props.id}"
        ?disabled="${props.disabled}"
        href="${ifDefined(props.href)}"
        @click="${this._handlePrimaryClick}"
        >${icon}${label}</md-outlined-button
      >`
    }
    return html`<md-filled-button
      class="${props.className}"
      id="${props.id}"
      ?disabled="${props.disabled}"
      href="${ifDefined(props.href)}"
      @click="${this._handlePrimaryClick}"
      >${icon}${label}</md-filled-button
    >`
  }

  _renderIconPrimary(variant, props, icon) {
    if (variant === 'tonal') {
      return html`<md-filled-tonal-icon-button
        class="${props.className}"
        id="${props.id}"
        ?disabled="${props.disabled}"
        href="${ifDefined(props.href)}"
        aria-label="${ifDefined(props.ariaLabel)}"
        @click="${this._handlePrimaryClick}"
        >${icon}</md-filled-tonal-icon-button
      >`
    }
    if (variant === 'outlined') {
      return html`<md-outlined-icon-button
        class="${props.className}"
        id="${props.id}"
        ?disabled="${props.disabled}"
        href="${ifDefined(props.href)}"
        aria-label="${ifDefined(props.ariaLabel)}"
        @click="${this._handlePrimaryClick}"
        >${icon}</md-outlined-icon-button
      >`
    }
    if (variant === 'filled') {
      return html`<md-filled-icon-button
        class="${props.className}"
        id="${props.id}"
        ?disabled="${props.disabled}"
        href="${ifDefined(props.href)}"
        aria-label="${ifDefined(props.ariaLabel)}"
        @click="${this._handlePrimaryClick}"
        >${icon}</md-filled-icon-button
      >`
    }
    return html`<md-icon-button
      class="${props.className}"
      id="${props.id}"
      ?disabled="${props.disabled}"
      href="${ifDefined(props.href)}"
      aria-label="${ifDefined(props.ariaLabel)}"
      @click="${this._handlePrimaryClick}"
      >${icon}</md-icon-button
    >`
  }

  _renderChevron(variant) {
    const classes = classMap({'menu-btn': true, [variant]: true})
    const menuLabel = this.menuAriaLabel || this._('More actions')
    const icon = html`<grampsjs-icon
      class="chevron ${this._open ? 'open' : ''}"
      path="${mdiMenuDown}"
      color="${this.iconColor}"
    ></grampsjs-icon>`
    const attrs = {
      classes,
      menuLabel,
      icon,
    }
    if (variant === 'tonal') {
      return html`<md-filled-tonal-icon-button
        class="${attrs.classes}"
        id="btn-menu"
        ?disabled="${this.disabled}"
        aria-label="${attrs.menuLabel}"
        aria-haspopup="menu"
        aria-expanded="${this._open ? 'true' : 'false'}"
        aria-controls="menu"
        @click="${this._handleMenuClick}"
        >${attrs.icon}</md-filled-tonal-icon-button
      >`
    }
    if (variant === 'outlined') {
      return html`<md-outlined-icon-button
        class="${attrs.classes}"
        id="btn-menu"
        ?disabled="${this.disabled}"
        aria-label="${attrs.menuLabel}"
        aria-haspopup="menu"
        aria-expanded="${this._open ? 'true' : 'false'}"
        aria-controls="menu"
        @click="${this._handleMenuClick}"
        >${attrs.icon}</md-outlined-icon-button
      >`
    }
    if (variant === 'filled') {
      return html`<md-filled-icon-button
        class="${attrs.classes}"
        id="btn-menu"
        ?disabled="${this.disabled}"
        aria-label="${attrs.menuLabel}"
        aria-haspopup="menu"
        aria-expanded="${this._open ? 'true' : 'false'}"
        aria-controls="menu"
        @click="${this._handleMenuClick}"
        >${attrs.icon}</md-filled-icon-button
      >`
    }
    return html`<md-icon-button
      class="${attrs.classes}"
      id="btn-menu"
      ?disabled="${this.disabled}"
      aria-label="${attrs.menuLabel}"
      aria-haspopup="menu"
      aria-expanded="${this._open ? 'true' : 'false'}"
      aria-controls="menu"
      @click="${this._handleMenuClick}"
      >${attrs.icon}</md-icon-button
    >`
  }

  _handlePrimaryClick() {
    fireEvent(this, 'split-button:primary')
  }

  _handleMenuClick(e) {
    e.preventDefault()
    e.stopPropagation()
    const menu = this.renderRoot.getElementById('menu')
    if (menu) {
      menu.open = !menu.open
      this._open = menu.open
    }
  }

  _handleOpened() {
    this._open = true
  }

  _handleClosed() {
    this._open = false
  }
}

window.customElements.define('grampsjs-split-button', GrampsjsSplitButton)
