/*
Pull to refresh on touch screens ("resist the pull"): at the top of a page,
pulling down moves the indicator by 35% of the finger's travel, and
releasing it past the threshold refreshes the page's data.
*/

// the indicator moves this fraction of the finger's travel
export const PULL_RESISTANCE = 0.35
// how far the indicator must travel, in px, to refresh when released
export const PULL_THRESHOLD = 64
// the indicator does not travel further than this
export const PULL_MAX = 96
// how long the indicator spins at least, so a fast refresh is still seen
export const REFRESH_MIN_MS = 700

// The indicator's travel for a finger that moved `dy` px down
export function pullDistance(dy) {
  return Math.min(PULL_MAX, Math.max(0, dy * PULL_RESISTANCE))
}

// Whether a touch starts on something that handles its own gestures or
// floats above the page, such as an open dialog or a menu
function startsInOverlay(event) {
  return event
    .composedPath()
    .some(
      el =>
        (el.tagName === 'DIALOG' && el.open) ||
        (el.tagName === 'MD-DIALOG' && el.open) ||
        el.tagName === 'MD-MENU'
    )
}

export class PullToRefreshController {
  // host: a Lit element that renders the indicator from `distance` and
  // `refreshing`. isEnabled(): whether the current page can be refreshed.
  // onRefresh(): refreshes it.
  constructor(host, {isEnabled, onRefresh}) {
    this.host = host
    this.isEnabled = isEnabled
    this.onRefresh = onRefresh
    this.distance = 0
    this.refreshing = false
    this.pulling = false
    this._startY = null
    this._onStart = this._onStart.bind(this)
    this._onMove = this._onMove.bind(this)
    this._onEnd = this._onEnd.bind(this)
    host.addController(this)
  }

  hostConnected() {
    window.addEventListener('touchstart', this._onStart, {passive: true})
    window.addEventListener('touchmove', this._onMove, {passive: true})
    window.addEventListener('touchend', this._onEnd, {passive: true})
    window.addEventListener('touchcancel', this._onEnd, {passive: true})
  }

  hostDisconnected() {
    window.removeEventListener('touchstart', this._onStart)
    window.removeEventListener('touchmove', this._onMove)
    window.removeEventListener('touchend', this._onEnd)
    window.removeEventListener('touchcancel', this._onEnd)
  }

  _onStart(event) {
    this._startY = null
    if (
      this.refreshing ||
      event.touches.length !== 1 ||
      window.scrollY > 0 ||
      !this.isEnabled() ||
      startsInOverlay(event)
    ) {
      return
    }
    this._startY = event.touches[0].clientY
  }

  _onMove(event) {
    if (this._startY === null) return
    const dy = event.touches[0].clientY - this._startY
    // the page scrolled after all, or the finger went up: not a pull
    if (window.scrollY > 0 || (dy <= 0 && !this.pulling)) {
      this._startY = dy <= 0 ? this._startY : null
      return
    }
    this.pulling = true
    this.distance = pullDistance(dy)
    this.host.requestUpdate()
  }

  async _onEnd() {
    if (!this.pulling) {
      this._startY = null
      return
    }
    const refresh = this.distance >= PULL_THRESHOLD
    this.pulling = false
    this._startY = null
    if (!refresh) {
      this.distance = 0
      this.host.requestUpdate()
      return
    }
    this.refreshing = true
    this.distance = PULL_THRESHOLD
    this.host.requestUpdate()
    await Promise.all([
      Promise.resolve(this.onRefresh()),
      new Promise(resolve => {
        setTimeout(resolve, REFRESH_MIN_MS)
      }),
    ])
    this.refreshing = false
    this.distance = 0
    this.host.requestUpdate()
  }
}
