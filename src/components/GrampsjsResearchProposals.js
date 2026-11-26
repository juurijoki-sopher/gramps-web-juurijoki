/*
Research records on a person: name variants, a citation proposal the
researcher confirms, and matches already in this tree.
*/

import {html, css, LitElement} from 'lit'
import '@material/web/button/filled-button.js'
import '@material/web/button/text-button.js'
import '@material/web/checkbox/checkbox.js'
import '@material/web/select/filled-select.js'
import '@material/web/select/select-option.js'
import '@material/web/textfield/outlined-text-field.js'

import {sharedStyles} from '../SharedStyles.js'
import {GrampsjsAppStateMixin} from '../mixins/GrampsjsAppStateMixin.js'
import {fireEvent, prefixSearchQuery, toWritableObject} from '../util.js'
import {
  alternateName,
  alternateNameSuggestions,
  mergeSearchHits,
  personQueryParts,
  treeSearchQueries,
} from '../nameVariants.js'
import {
  COLLECTIONS,
  PROPOSAL_EVENT_TYPES,
  SOURCE_PERSON_RULE,
  acceptancePlan,
  acceptedCitation,
  buildCitation,
  buildEvent,
  buildPlace,
  buildSource,
  catalogueHasRule,
  eventFill,
  eventOfType,
  unfinishedAcceptEvent,
  exactPlace,
  exactTitle,
  fieldDecision,
  formatStoredDate,
  peopleFromBacklinks,
  peopleWithSourceRule,
  personAfterAccept,
  placeNameQuery,
  proposalsFromCitations,
  sourceTitleQuery,
  splitRecord,
} from '../researchProposal.js'

const QUIET = {dbChanged: false}

let personRuleCatalogue = null

function defaultForm() {
  return {
    collection: 'hiski',
    otherTitle: '',
    record: '',
    eventType: 'Birth',
    dateText: '',
    placeText: '',
  }
}

function personLine(person) {
  const profile = person?.profile || {}
  const name = [profile.name_given, profile.name_surname]
    .filter(Boolean)
    .join(' ')
  return name || person?.gramps_id || person?.grampsId || ''
}

async function loadPersonRules(apiGet) {
  if (personRuleCatalogue) return personRuleCatalogue
  const res = await apiGet('/api/filters/people')
  if (!('data' in res)) return []
  personRuleCatalogue = res.data?.rules || []
  return personRuleCatalogue
}

export class GrampsjsResearchProposals extends GrampsjsAppStateMixin(
  LitElement
) {
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: block;
          margin-top: var(--grampsjs-space-4);
        }

        h3 {
          margin: 0 0 var(--grampsjs-space-2);
          font-size: var(--grampsjs-font-size-lg);
        }

        h4 {
          margin: var(--grampsjs-space-3) 0 var(--grampsjs-space-1);
          font-size: var(--grampsjs-font-size-md);
        }

        p,
        li {
          font-size: var(--grampsjs-font-size-sm);
        }

        .help,
        .error {
          color: var(--grampsjs-text-secondary-color);
        }

        .error {
          color: var(--grampsjs-alert-error-font-color);
        }

        .names,
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--grampsjs-space-2);
          align-items: center;
        }

        .proposal {
          margin: var(--grampsjs-space-3) 0;
          padding-top: var(--grampsjs-space-2);
          border-top: 1px solid var(--grampsjs-body-font-color-15);
        }

        form {
          display: flex;
          flex-direction: column;
          gap: var(--grampsjs-space-2);
          max-width: 36rem;
          margin-top: var(--grampsjs-space-3);
        }

        md-outlined-text-field,
        md-filled-select {
          width: 100%;
        }

        label {
          display: flex;
          align-items: center;
          gap: var(--grampsjs-space-2);
          font-size: var(--grampsjs-font-size-sm);
        }

        a {
          color: var(--md-sys-color-primary);
        }
      `,
    ]
  }

  static get properties() {
    return {
      person: {type: Object},
      _citations: {type: Array},
      _matches: {type: Array},
      _sourcePeople: {type: Array},
      _sourceTitles: {type: Object},
      _form: {type: Object},
      _choices: {type: Object},
      _saving: {type: Boolean},
      _error: {type: String},
    }
  }

  constructor() {
    super()
    this.person = {}
    this._citations = []
    this._matches = []
    this._sourcePeople = []
    this._sourceTitles = {}
    this._form = defaultForm()
    this._choices = {}
    this._saving = false
    this._error = ''
    this._loadedKey = ''
    this._token = 0
  }

  updated(changed) {
    super.updated(changed)
    if (!changed.has('person') && !changed.has('appState')) return
    const key = `${this.person?.handle || ''}:${(
      this.person?.citation_list || []
    ).join(',')}`
    if (!this.person?.handle || key === this._loadedKey) return
    this._loadedKey = key
    this._load()
  }

  get _canEdit() {
    return Boolean(this.appState?.permissions?.canEdit)
  }

  get _proposals() {
    return proposalsFromCitations(this._citations)
  }

  render() {
    if (!this.person?.handle) return html``
    const suggestions = alternateNameSuggestions(this.person)
    return html`
      <h3>${this._('Research')}</h3>
      ${suggestions.length && this._canEdit
        ? this._renderNames(suggestions)
        : ''}
      ${this._proposals.map(proposal => this._renderProposal(proposal))}
      ${this._canEdit ? this._renderForm() : ''}
      ${this._error ? html`<p class="error">${this._error}</p>` : ''}
      ${this._renderPeople(
        this._('Other people with this source'),
        this._sourcePeople
      )}
      ${this._renderPeople(
        this._('Possible matches in this tree'),
        this._matches
      )}
    `
  }

  _renderNames(suggestions) {
    return html`
      <p class="help">${this._('Also search under these names.')}</p>
      <div class="names">
        ${suggestions.map(
          name => html`
            <md-text-button @click="${() => this._addAlternate(name)}">
              ${this._('Add as alternate name')}: ${name}
            </md-text-button>
          `
        )}
      </div>
    `
  }

  _renderProposal(proposal) {
    const event = eventOfType(this.person, proposal.eventType)
    const decision = fieldDecision(event, proposal)
    const choices = this._choicesFor(proposal, decision)
    const title = this._sourceTitles[proposal.sourceHandle] || ''
    const existingDate = formatStoredDate(event?.date)
    return html`
      <div class="proposal">
        <h4>
          ${this._(proposal.eventType || 'Event')}
          ${title ? html` · ${title}` : ''}
        </h4>
        <p>
          ${proposal.dateText} ${proposal.placeText}
          ${proposal.url
            ? html` ·
                <a href="${proposal.url}" target="_blank" rel="noopener"
                  >${this._('Open record')}</a
                >`
            : proposal.page
            ? html` · ${proposal.page}`
            : ''}
        </p>
        ${existingDate
          ? html`<p class="help">${this._('In the tree')}: ${existingDate}</p>`
          : ''}
        ${this._canEdit ? this._renderChoices(proposal, decision, choices) : ''}
      </div>
    `
  }

  _renderChoices(proposal, decision, choices) {
    const dateDisabled = decision.date.blocked && !choices.newEvent
    const placeDisabled = decision.place.blocked && !choices.newEvent
    return html`
      ${decision.date.blocked
        ? html`<p class="help">${this._('The existing date stays.')}</p>`
        : ''}
      ${decision.place.blocked
        ? html`<p class="help">${this._('The existing place stays.')}</p>`
        : ''}
      ${decision.hasEvent
        ? html`
            <label>
              <md-checkbox
                ?checked="${choices.newEvent}"
                @change="${e =>
                  this._setChoice(proposal, 'newEvent', e.target.checked)}"
              ></md-checkbox>
              ${this._('Create a new event')}
            </label>
          `
        : ''}
      ${proposal.dateText
        ? html`
            <label>
              <md-checkbox
                ?checked="${choices.useDate && !dateDisabled}"
                ?disabled="${dateDisabled || this._saving}"
                @change="${e =>
                  this._setChoice(proposal, 'useDate', e.target.checked)}"
              ></md-checkbox>
              ${this._('Use this date')}
            </label>
          `
        : ''}
      ${proposal.placeText
        ? html`
            <label>
              <md-checkbox
                ?checked="${choices.usePlace && !placeDisabled}"
                ?disabled="${placeDisabled || this._saving}"
                @change="${e =>
                  this._setChoice(proposal, 'usePlace', e.target.checked)}"
              ></md-checkbox>
              ${this._('Use this place')}
            </label>
          `
        : ''}
      <div class="actions">
        <md-filled-button
          ?disabled="${this._saving}"
          @click="${() => this._accept(proposal)}"
        >
          ${this._('Accept into the tree')}
        </md-filled-button>
      </div>
    `
  }

  _renderForm() {
    const form = this._form
    return html`
      <form @submit="${this._save}">
        <p class="help">
          ${this._(
            'Open a search, then paste the page or the address of the record you want to keep.'
          )}
        </p>
        <md-filled-select
          label="${this._('Collection')}"
          .value="${form.collection}"
          @change="${e => this._setForm({collection: e.target.value})}"
        >
          ${COLLECTIONS.map(
            collection => html`
              <md-select-option value="${collection.id}">
                <div slot="headline">${collection.title}</div>
              </md-select-option>
            `
          )}
          <md-select-option value="other">
            <div slot="headline">${this._('Other collection')}</div>
          </md-select-option>
        </md-filled-select>
        ${form.collection === 'other'
          ? html`
              <md-outlined-text-field
                label="${this._('Collection title')}"
                .value="${form.otherTitle}"
                @input="${e => this._setForm({otherTitle: e.target.value})}"
              ></md-outlined-text-field>
            `
          : ''}
        <md-outlined-text-field
          label="${this._('Page or URL')}"
          .value="${form.record}"
          @input="${e => this._setForm({record: e.target.value})}"
        ></md-outlined-text-field>
        <md-filled-select
          label="${this._('Event type')}"
          .value="${form.eventType}"
          @change="${e => this._setForm({eventType: e.target.value})}"
        >
          ${PROPOSAL_EVENT_TYPES.map(
            type => html`
              <md-select-option value="${type}">
                <div slot="headline">${this._(type)}</div>
              </md-select-option>
            `
          )}
        </md-filled-select>
        <md-outlined-text-field
          label="${this._('Date as written')}"
          .value="${form.dateText}"
          @input="${e => this._setForm({dateText: e.target.value})}"
        ></md-outlined-text-field>
        <md-outlined-text-field
          label="${this._('Place as written')}"
          .value="${form.placeText}"
          @input="${e => this._setForm({placeText: e.target.value})}"
        ></md-outlined-text-field>
        <div class="actions">
          <md-filled-button type="submit" ?disabled="${this._saving}">
            ${this._('Save research record')}
          </md-filled-button>
        </div>
      </form>
    `
  }

  _renderPeople(heading, people) {
    if (!people?.length) return html``
    return html`
      <h4>${heading}</h4>
      <ul>
        ${people.map(person => {
          const id = person.gramps_id || person.grampsId
          const line = personLine(person)
          return html`
            <li>
              ${id
                ? html`<a
                    href="/person/${id}"
                    @click="${e => this._openPerson(e, id)}"
                    >${line}</a
                  >`
                : line}
            </li>
          `
        })}
      </ul>
    `
  }

  _setForm(patch) {
    this._form = {...this._form, ...patch}
  }

  _choicesFor(proposal, decision) {
    const stored = this._choices[proposal.handle]
    if (stored) return stored
    return {
      useDate: decision.date.canFill,
      usePlace: decision.place.canFill,
      newEvent: !decision.hasEvent,
    }
  }

  _setChoice(proposal, key, value) {
    const event = eventOfType(this.person, proposal.eventType)
    const decision = fieldDecision(event, proposal)
    const current = this._choicesFor(proposal, decision)
    const next = {...current, [key]: value}
    if (key === 'newEvent' && value) {
      next.useDate = Boolean(proposal.dateText)
      next.usePlace = Boolean(proposal.placeText)
    }
    this._choices = {...this._choices, [proposal.handle]: next}
  }

  _addAlternate(given) {
    fireEvent(this, 'edit:action', {
      action: 'updateProp',
      data: {
        alternate_names: [
          ...(this.person.alternate_names || []),
          alternateName(this.person.primary_name, given),
        ],
      },
    })
  }

  _openPerson(e, grampsId) {
    e.preventDefault()
    fireEvent(this, 'nav', {path: `person/${grampsId}`})
  }

  _fail(message) {
    this._error = message || this._('saving failed')
    fireEvent(this, 'grampsjs:error', {message: this._error})
  }

  async _load() {
    const token = (this._token += 1)
    const person = this.person
    const citations = await this._citationObjects(person)
    if (token !== this._token) return
    this._citations = citations
    const proposals = proposalsFromCitations(citations)
    const [matches, sourcePeople] = await Promise.all([
      this._searchTree(person),
      this._peopleForSources(person, proposals),
    ])
    if (token !== this._token) return
    this._matches = matches
    this._sourcePeople = sourcePeople.people
    this._sourceTitles = sourcePeople.titles
  }

  async _citationObjects(person) {
    const handles = person?.citation_list || []
    const extended = person?.extended?.citations || []
    const out = []
    for (const handle of handles) {
      const known = extended.find(
        citation => citation?.handle === handle && 'attribute_list' in citation
      )
      if (known) {
        out.push(known)
        continue
      }
      const res = await this.appState.apiGet(`/api/citations/${handle}`)
      if (res?.data) out.push(res.data)
    }
    return out
  }

  async _searchTree(person) {
    const parts = personQueryParts(person)
    const queries = treeSearchQueries(parts)
    if (!queries.length || !this.appState?.apiGet) return []
    const locale = this.appState.i18n?.lang || 'en'
    const lists = await Promise.all(
      queries.map(async query => {
        const params = new URLSearchParams({
          query: prefixSearchQuery(query),
          locale,
          profile: 'all',
          page: '1',
          pagesize: '5',
          type: 'person',
        })
        const res = await this.appState.apiGet(`/api/search/?${params}`)
        return res?.data || []
      })
    )
    return mergeSearchHits(lists, {
      excludeHandle: person.handle,
      year: parts.year,
    })
      .map(hit => ({
        handle: hit.object?.handle,
        gramps_id: hit.object?.gramps_id,
        profile: hit.object?.profile,
      }))
      .filter(hit => hit.handle)
  }

  async _peopleForSources(person, proposals) {
    const titles = {}
    const people = []
    const seen = new Set()
    if (!proposals.length || !this.appState?.apiGet) {
      return {titles, people}
    }
    const rules = await loadPersonRules(endpoint =>
      this.appState.apiGet(endpoint)
    )
    const hasRule = catalogueHasRule({rules}, SOURCE_PERSON_RULE)
    const sources = new Map()
    for (const proposal of proposals) {
      if (!proposal.sourceHandle || sources.has(proposal.sourceHandle)) continue
      const res = await this.appState.apiGet(
        `/api/sources/${proposal.sourceHandle}?keys=handle,gramps_id,title`
      )
      if (res?.data) sources.set(proposal.sourceHandle, res.data)
    }
    for (const [handle, source] of sources) {
      titles[handle] = source.title || ''
      let found = []
      let usedRule = false
      if (hasRule && source.gramps_id) {
        const query = peopleWithSourceRule(source.gramps_id)
        const res = await this.appState.apiGet(
          `/api/people/?rules=${encodeURIComponent(
            JSON.stringify(query)
          )}&profile=self&pagesize=20`
        )
        if (!res?.error) {
          found = res.data || []
          usedRule = true
        }
      }
      // The rule is missing, or this backend rejected it: use the citation's
      // own backlinks, which are the people already attached to this record.
      if (!usedRule) {
        const proposal = proposals.find(item => item.sourceHandle === handle)
        const res = await this.appState.apiGet(
          `/api/citations/${proposal.handle}?backlinks=true`
        )
        const links = res?.data?.backlinks || res?.data?.extended?.backlinks
        found = await this._hydratePeople(
          peopleFromBacklinks(links, person.handle)
        )
      }
      found.forEach(item => {
        if (
          !item?.handle ||
          item.handle === person.handle ||
          seen.has(item.handle)
        ) {
          return
        }
        seen.add(item.handle)
        people.push(item)
      })
    }
    return {titles, people}
  }

  async _hydratePeople(people) {
    const out = []
    for (const person of people.slice(0, 8)) {
      if (person.grampsId || person.profile) {
        out.push({
          handle: person.handle,
          gramps_id: person.grampsId,
          profile: person.profile,
        })
        continue
      }
      const res = await this.appState.apiGet(
        `/api/people/${person.handle}?profile=self&keys=handle,gramps_id,profile`
      )
      if (res?.data) out.push(res.data)
    }
    return out
  }

  async _findSource(title) {
    const rules = sourceTitleQuery(title)
    const res = await this.appState.apiGet(
      `/api/sources/?rules=${encodeURIComponent(
        JSON.stringify(rules)
      )}&keys=handle,title,gramps_id&pagesize=20`
    )
    if (res?.error) return {error: res.error}
    const found = exactTitle(res?.data || [], title)
    if (found?.handle) return {source: found}
    const source = buildSource(title)
    const created = await this.appState.apiPost('/api/sources/', source, QUIET)
    if (created?.error) return {error: created.error}
    return {source}
  }

  async _placeHandle(name) {
    const rules = placeNameQuery(name)
    const res = await this.appState.apiGet(
      `/api/places/?rules=${encodeURIComponent(
        JSON.stringify(rules)
      )}&keys=handle,name&pagesize=20`
    )
    if (res?.error) {
      this._fail(res.error)
      return ''
    }
    const found = exactPlace(res?.data || [], name)
    if (found?.handle) return found.handle
    const place = buildPlace(name)
    const created = await this.appState.apiPost('/api/places/', place, QUIET)
    if (created?.error) {
      this._fail(created.error)
      return ''
    }
    return place.handle
  }

  _collectionTitle() {
    if (this._form.collection === 'other') return this._form.otherTitle.trim()
    return (
      COLLECTIONS.find(item => item.id === this._form.collection)?.title || ''
    )
  }

  async _save(e) {
    e.preventDefault()
    if (this._saving) return
    const record = splitRecord(this._form.record)
    const title = this._collectionTitle()
    if (!title || !record.page) {
      this._error = this._('A page or URL is required.')
      return
    }
    this._saving = true
    this._error = ''
    const found = await this._findSource(title)
    if (found.error) {
      this._fail(found.error)
      this._saving = false
      return
    }
    const citation = buildCitation({
      sourceHandle: found.source.handle,
      page: record.page,
      url: record.url,
      eventType: this._form.eventType,
      dateText: this._form.dateText,
      placeText: this._form.placeText,
    })
    const posted = await this.appState.apiPost(
      '/api/citations/',
      citation,
      QUIET
    )
    if (posted?.error) {
      this._fail(posted.error)
      this._saving = false
      return
    }
    const body = {
      ...toWritableObject(this.person),
      citation_list: [...(this.person.citation_list || []), citation.handle],
    }
    const saved = await this.appState.apiPut(
      `/api/people/${this.person.handle}`,
      body
    )
    this._saving = false
    if (saved?.error) {
      this._fail(saved.error)
      return
    }
    this._form = defaultForm()
    fireEvent(this, 'research:saved')
  }

  // the event an earlier, unfinished acceptance of the proposal created, if
  // any (see unfinishedAcceptEvent)
  async _unfinishedEvent(proposal) {
    const res = await this.appState.apiGet(
      `/api/citations/${proposal.handle}?keys=backlinks&backlinks=true`
    )
    const handles = res?.data?.backlinks?.event || []
    const events = await Promise.all(
      handles.map(async handle => {
        const ev = await this.appState.apiGet(
          `/api/events/${handle}?keys=handle,type`
        )
        return ev?.data || null
      })
    )
    return unfinishedAcceptEvent(events, this.person, proposal.eventType)
  }

  async _accept(proposal) {
    if (this._saving) return
    const event = eventOfType(this.person, proposal.eventType)
    const decision = fieldDecision(event, proposal)
    const choices = this._choicesFor(proposal, decision)
    const plan = acceptancePlan(event, proposal, {
      ...choices,
      useDate: choices.useDate && !(decision.date.blocked && !choices.newEvent),
      usePlace:
        choices.usePlace && !(decision.place.blocked && !choices.newEvent),
    })
    if (!plan.ok) {
      this._error = this._('The existing date stays.')
      return
    }
    const citation = this._citations.find(
      item => item.handle === proposal.handle
    )
    if (!citation) return
    this._saving = true
    this._error = ''
    let placeHandle = ''
    if (plan.applyPlace) {
      placeHandle = await this._placeHandle(proposal.placeText)
      if (!placeHandle) {
        this._saving = false
        return
      }
    }
    let eventHandle = event?.handle
    const leftover = plan.create ? await this._unfinishedEvent(proposal) : null
    if (leftover) {
      eventHandle = leftover.handle
    } else if (plan.create) {
      const created = buildEvent({
        type: proposal.eventType,
        dateText: plan.applyDate ? proposal.dateText : '',
        placeHandle: plan.applyPlace ? placeHandle : '',
        citationHandle: proposal.handle,
      })
      const posted = await this.appState.apiPost('/api/events/', created, QUIET)
      if (posted?.error) {
        this._fail(posted.error)
        this._saving = false
        return
      }
      eventHandle = created.handle
    } else {
      const freshEvent = await this.appState.apiGet(
        `/api/events/${eventHandle}`
      )
      if (freshEvent?.error || !freshEvent?.data) {
        this._fail(freshEvent?.error)
        this._saving = false
        return
      }
      const patch = eventFill(freshEvent.data, proposal, plan, placeHandle)
      const saved = await this.appState.apiPut(
        `/api/events/${event.handle}`,
        {...toWritableObject(freshEvent.data), ...patch},
        QUIET
      )
      if (saved?.error) {
        this._fail(saved.error)
        this._saving = false
        return
      }
    }
    const freshCitation = await this.appState.apiGet(
      `/api/citations/${citation.handle}`
    )
    if (freshCitation?.error || !freshCitation?.data) {
      this._fail(freshCitation?.error)
      this._saving = false
      return
    }
    const cleaned = acceptedCitation(toWritableObject(freshCitation.data))
    const citationSaved = await this.appState.apiPut(
      `/api/citations/${citation.handle}`,
      cleaned,
      QUIET
    )
    if (citationSaved?.error) {
      this._fail(citationSaved.error)
      this._saving = false
      return
    }
    const patch = personAfterAccept(this.person, {
      citationHandle: proposal.handle,
      addEventHandle: plan.create ? eventHandle : '',
    })
    const personSaved = await this.appState.apiPut(
      `/api/people/${this.person.handle}`,
      {...toWritableObject(this.person), ...patch}
    )
    this._saving = false
    if (personSaved?.error) {
      this._fail(personSaved.error)
      return
    }
    fireEvent(this, 'research:saved')
  }
}

window.customElements.define(
  'grampsjs-research-proposals',
  GrampsjsResearchProposals
)
