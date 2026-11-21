import {select} from 'd3-selection'
import {
  mdiChevronDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronUp,
} from '@mdi/js'

// A continuation tab sits on the card edge that faces relatives who are not
// drawn, in the person's sex colour, with a chevron pointing towards them.
// The inner edge is flush with the card. On the left the card's colour
// stripe already reaches 4px past the box, so the tab starts outside it.

export const tabLength = 40
export const tabDepth = 18
const corner = 8
const chevronScale = 0.72
const hitSize = 44
const stripePastBox = 4

// Dark on every sex colour, in either theme: those colours are light pastels
export const continuationChevron = 'rgba(0, 0, 0, 0.78)'
const shadeColor = 'rgba(0, 0, 0, 0.14)'

const chevrons = {
  left: mdiChevronLeft,
  right: mdiChevronRight,
  up: mdiChevronUp,
  down: mdiChevronDown,
}

// The side of the card a direction grows towards. Ancestors are above in a
// vertical chart and to the right in columns; descendants are the opposite.
export function continuationSide(direction, vertical) {
  if (direction === 'ancestors') {
    return vertical ? 'up' : 'right'
  }
  return vertical ? 'down' : 'left'
}

// The middle of the card edge the tab grows from, relative to the card centre
export function tabAnchor(side, boxWidth, boxHeight) {
  return {
    left: [-(boxWidth / 2 + stripePastBox), 0],
    right: [boxWidth / 2, 0],
    up: [0, -boxHeight / 2],
    down: [0, boxHeight / 2],
  }[side]
}

// The tab's extent relative to the card centre
export function tabExtent(side, boxWidth, boxHeight) {
  const [x, y] = tabAnchor(side, boxWidth, boxHeight)
  const along = tabLength / 2
  return {
    left: {xMin: x - tabDepth, xMax: x, yMin: y - along, yMax: y + along},
    right: {xMin: x, xMax: x + tabDepth, yMin: y - along, yMax: y + along},
    up: {xMin: x - along, xMax: x + along, yMin: y - tabDepth, yMax: y},
    down: {xMin: x - along, xMax: x + along, yMin: y, yMax: y + tabDepth},
  }[side]
}

// Grows `bounds` so a tab at `x`, `y` is inside the chart
export function includeTabBounds(bounds, x, y, side, boxWidth, boxHeight) {
  const extent = tabExtent(side, boxWidth, boxHeight)
  bounds.xMin = Math.min(bounds.xMin, x + extent.xMin)
  bounds.xMax = Math.max(bounds.xMax, x + extent.xMax)
  bounds.yMin = Math.min(bounds.yMin, y + extent.yMin)
  bounds.yMax = Math.max(bounds.yMax, y + extent.yMax)
}

// The tab shape with its origin on the card edge
function tabPath(side) {
  const length = tabLength / 2
  const inner = tabDepth - corner
  const outer = length - corner
  if (side === 'down') {
    return `M${-length},0H${length}V${inner}Q${length},${tabDepth} ${outer},${tabDepth}H${-outer}Q${-length},${tabDepth} ${-length},${inner}Z`
  }
  if (side === 'up') {
    return `M${-length},0H${length}V${-inner}Q${length},${-tabDepth} ${outer},${-tabDepth}H${-outer}Q${-length},${-tabDepth} ${-length},${-inner}Z`
  }
  if (side === 'right') {
    return `M0,${-length}V${length}H${inner}Q${tabDepth},${length} ${tabDepth},${outer}V${-outer}Q${tabDepth},${-length} ${inner},${-length}Z`
  }
  return `M0,${-length}V${length}H${-inner}Q${-tabDepth},${length} ${-tabDepth},${outer}V${-outer}Q${-tabDepth},${-length} ${-inner},${-length}Z`
}

// Centre of the chevron, half the tab's depth out from the card
function chevronCentre(side) {
  const inset = tabDepth / 2
  return {
    left: [-inset, 0],
    right: [inset, 0],
    up: [0, -inset],
    down: [0, inset],
  }[side]
}

function drawContinuationTab(group, {side, fill}) {
  const path = tabPath(side)
  group.append('path').attr('class', 'tab').attr('d', path).attr('fill', fill)
  group
    .append('path')
    .attr('class', 'shade')
    .attr('d', path)
    .attr('fill', shadeColor)
    .attr('fill-opacity', 0)
  const [cx, cy] = chevronCentre(side)
  group
    .append('path')
    .attr('class', 'chevron')
    .attr('d', chevrons[side])
    .attr('fill', continuationChevron)
    .attr(
      'transform',
      `translate(${cx},${cy}) scale(${chevronScale}) translate(-12,-12)`
    )
  group
    .append('rect')
    .attr('class', 'hit')
    .attr('x', cx - hitSize / 2)
    .attr('y', cy - hitSize / 2)
    .attr('width', hitSize)
    .attr('height', hitSize)
    .attr('fill', '#000')
    .attr('fill-opacity', 0)
}

function shadeTab() {
  select(this)
    .select('.shade')
    .attr('fill-opacity', this.matches(':hover, :focus') ? 1 : 0)
}

// Makes each tab a button that calls `activate`, or a plain mark when the
// chart is not interactive
function setContinuationTabInteraction(tabs, {interactive, activate}) {
  tabs.on('.tab', null)
  if (!interactive) {
    tabs
      .attr('role', null)
      .attr('tabindex', null)
      .attr('aria-label', null)
      .style('cursor', null)
    return
  }
  function onActivate(event, datum) {
    activate.call(this, event, datum)
    event.stopPropagation()
    event.preventDefault()
  }
  tabs
    .attr('role', 'button')
    .attr('tabindex', 0)
    .style('cursor', 'pointer')
    .on('click.tab', onActivate)
    .on('keydown.tab', function (event, datum) {
      if (event.key === 'Enter' || event.key === ' ') {
        onActivate.call(this, event, datum)
      }
    })
    .on('mouseenter.tab mouseleave.tab focus.tab blur.tab', shadeTab)
}

// Draws the continuation tabs of `nodes`. `directions(node)` lists
// 'ancestors', 'descendants' or both. `label(direction)` is the button name.
// With `interactive`, a tab calls `activate(event, datum)` and does not pass
// the click on to the card.
export function updateContinuationTabs(
  nodes,
  {
    directions,
    vertical,
    interactive,
    palette,
    boxWidth,
    boxHeight,
    label,
    activate,
  }
) {
  const tabs = nodes
    .selectChildren('.continuation-tab')
    .data(
      node =>
        directions(node).map(direction => ({
          direction,
          side: continuationSide(direction, vertical),
          node,
        })),
      datum => datum.direction
    )
    .join(enter => enter.append('g').attr('class', 'continuation-tab'))
  tabs.each(function (datum) {
    const sex = datum.node.person?.profile?.sex
    select(this).selectAll('*').remove()
    drawContinuationTab(select(this), {
      side: datum.side,
      fill: palette.sex[sex] ?? palette.sex.U,
    })
  })
  tabs.attr('transform', ({side}) => {
    const [x, y] = tabAnchor(side, boxWidth, boxHeight)
    return `translate(${x},${y})`
  })
  tabs.attr('aria-label', ({direction}) => label(direction) ?? '')
  setContinuationTabInteraction(tabs, {interactive, activate})
  return tabs
}
