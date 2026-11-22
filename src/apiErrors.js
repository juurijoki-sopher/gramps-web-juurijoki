/*
Names a failed API request so that its error says what failed and why,
e.g. "People: filtering failed – not found (404)" in place of the server's
bare "Not Found".

The API wrappers in appState remember each failed request here. Most
components report an error with its message only, so the error handler looks
up the request that just failed with that message.
*/

// The object a request is about, by the first part of its path after /api/
const RESOURCE_LABELS = {
  people: 'People',
  families: 'Families',
  events: 'Events',
  places: 'Places',
  sources: 'Sources',
  citations: 'Citations',
  repositories: 'Repositories',
  notes: 'Notes',
  media: 'Media',
  tags: 'Tags',
  tasks: 'Tasks',
  users: 'Users',
  search: 'Search',
  relations: 'Relationships',
  timelines: 'Timeline',
  exporters: 'Export',
  importers: 'Import',
  metadata: 'Tree Information',
  transactions: 'History',
  chat: 'Assistant',
  dna: 'DNA',
  trees: 'Tree Information',
  // this site's own additions, such as the links of users to people
  juurijoki: 'Users',
}

// What the request did, by its method; a GET with a filter filters
const ACTIONS = {
  GET: 'loading failed',
  POST: 'saving failed',
  PUT: 'updating failed',
  DELETE: 'deleting failed',
}

// Why it failed, by HTTP status
const REASONS = {
  400: 'invalid request',
  401: 'not signed in',
  403: 'no permission',
  404: 'not found',
  409: 'conflict with another change',
  413: 'The file is too large for the server to accept.',
  422: 'invalid data',
  429: 'too many requests',
}

// The reason phrases of HTTP, which add nothing to the reason above
const STANDARD_MESSAGES = new Set([
  'not found',
  'bad request',
  'unauthorized',
  'forbidden',
  'conflict',
  'unprocessable entity',
  'too many requests',
  'internal server error',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  'authorization error',
  'network error',
  'failed to fetch',
  'load failed',
  'networkerror when attempting to fetch resource.',
  'payload too large',
  'request entity too large',
])

const RECENT_MS = 10000
const recent = []

// Remembers a failed request: `message` is the error the API helper
// returned, `errorDetail` its {method, endpoint, status, response}.
export function rememberApiError(message, errorDetail) {
  if (!message || !errorDetail?.endpoint) return
  recent.unshift({message, errorDetail, time: Date.now()})
  recent.length = Math.min(recent.length, 20)
}

// The request that most recently failed with `message`, if it did so in the
// last few seconds
export function recentApiError(message, now = Date.now()) {
  return (
    recent.find(e => e.message === message && now - e.time < RECENT_MS)
      ?.errorDetail ?? null
  )
}

export function clearApiErrors() {
  recent.length = 0
}

function resourceKey(endpoint) {
  const path = endpoint.split('?')[0]
  const match = path.match(/^\/api\/([^/]+)/)
  return match ? match[1] : ''
}

function isFiltered(endpoint) {
  const query = endpoint.split('?')[1] ?? ''
  return /(^|&)(rules|filter|gql|query|oql)=/.test(query)
}

function reasonKey(message, status) {
  if (message === 'Network error' || !status) {
    return 'no connection to the server'
  }
  if (REASONS[status]) return REASONS[status]
  if (status >= 500) return 'server error'
  return ''
}

// A readable description of a failed request, translated with `_`
export function describeApiError(message, errorDetail, _) {
  const {method = 'GET', endpoint = '', status} = errorDetail ?? {}
  const key = resourceKey(endpoint)
  const resource = RESOURCE_LABELS[key] ? _(RESOURCE_LABELS[key]) : key
  const action =
    method === 'GET' && isFiltered(endpoint)
      ? _('filtering failed')
      : _(ACTIONS[method] ?? 'loading failed')
  const reasonText = reasonKey(message, status)
  const reason = reasonText ? _(reasonText) : ''
  // the server's own message, unless it only repeats the reason
  const extra =
    message && !STANDARD_MESSAGES.has(String(message).toLowerCase())
      ? _(message)
      : ''
  const why = [reason, extra].filter(Boolean).join(': ')
  const code = status ? ` (${status})` : ''
  const head = resource ? `${resource}: ${action}` : action
  return why ? `${head} – ${why}${code}` : `${head}${code}`
}
