import {describe, it, expect, vi, afterEach} from 'vitest'
import {
  PullToRefreshController,
  pullDistance,
  PULL_MAX,
  PULL_THRESHOLD,
} from '../../src/pullToRefresh.js'

function makeHost() {
  const host = {
    controllers: [],
    updates: 0,
    addController(c) {
      this.controllers.push(c)
    },
    requestUpdate() {
      this.updates += 1
    },
  }
  return host
}

const touch = (type, y) => {
  const event = new Event(type)
  event.touches = type === 'touchend' ? [] : [{clientY: y}]
  event.composedPath = () => []
  return event
}

describe('pullDistance', () => {
  it('moves the indicator 35% of the finger travel', () => {
    expect(pullDistance(100)).toBeCloseTo(35)
  })

  it('stays within 0 and the maximum', () => {
    expect(pullDistance(-50)).toBe(0)
    expect(pullDistance(10000)).toBe(PULL_MAX)
  })
})

describe('PullToRefreshController', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('refreshes when released past the threshold', async () => {
    vi.useFakeTimers()
    const onRefresh = vi.fn()
    const host = makeHost()
    const c = new PullToRefreshController(host, {
      isEnabled: () => true,
      onRefresh,
    })
    c._onStart(touch('touchstart', 0))
    c._onMove(touch('touchmove', PULL_THRESHOLD / 0.35 + 10))
    expect(c.pulling).toBe(true)
    expect(c.distance).toBeGreaterThanOrEqual(PULL_THRESHOLD)
    const done = c._onEnd()
    expect(onRefresh).toHaveBeenCalledOnce()
    expect(c.refreshing).toBe(true)
    await vi.runAllTimersAsync()
    await done
    expect(c.refreshing).toBe(false)
    expect(c.distance).toBe(0)
  })

  it('springs back without refreshing below the threshold', async () => {
    const onRefresh = vi.fn()
    const c = new PullToRefreshController(makeHost(), {
      isEnabled: () => true,
      onRefresh,
    })
    c._onStart(touch('touchstart', 0))
    c._onMove(touch('touchmove', 50))
    await c._onEnd()
    expect(onRefresh).not.toHaveBeenCalled()
    expect(c.distance).toBe(0)
  })

  it('does not start where it is disabled', () => {
    const c = new PullToRefreshController(makeHost(), {
      isEnabled: () => false,
      onRefresh: vi.fn(),
    })
    c._onStart(touch('touchstart', 0))
    c._onMove(touch('touchmove', 300))
    expect(c.pulling).toBe(false)
  })

  it('does not start when the page is scrolled down', () => {
    const c = new PullToRefreshController(makeHost(), {
      isEnabled: () => true,
      onRefresh: vi.fn(),
    })
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200)
    c._onStart(touch('touchstart', 0))
    c._onMove(touch('touchmove', 300))
    expect(c.pulling).toBe(false)
    scrollY.mockRestore()
  })
})
