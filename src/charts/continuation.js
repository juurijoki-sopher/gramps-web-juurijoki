// Directions in which a person has relatives who were not fetched with the
// chart: 'ancestors' when a parent handle is missing from `graph`, and
// 'descendants' when a child handle is. An empty parent handle is an unknown
// parent, and a partner who was not fetched is not a direction of its own:
// the chart's lines run between generations.
export function continuationDirections(graph, handle) {
  const missing = relative => Boolean(relative) && !graph.person(relative)
  const directions = []
  const parents = graph
    .parentFamilies(handle)
    .flatMap(family => [family.father_handle, family.mother_handle])
  if (parents.some(missing)) {
    directions.push('ancestors')
  }
  if (graph.childRelations(handle).some(child => missing(child.handle))) {
    directions.push('descendants')
  }
  return directions
}
