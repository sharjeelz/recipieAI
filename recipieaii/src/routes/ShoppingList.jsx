import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Alert, Button, Spinner } from '../components/ui'
import {
  COUNTRY_LABELS,
  detectCountry,
  getKnownCountries,
  getRetailers,
  setCountryOverride,
} from '../lib/retailers'

export default function ShoppingList() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)
  const [newItem, setNewItem] = useState('')
  const [busy, setBusy] = useState(false)
  const [country, setCountry] = useState(detectCountry)

  function changeCountry(code) {
    setCountryOverride(code)
    setCountry(code)
  }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const rows = await api.get('/shopping-list')
      setItems(rows)
    } catch (e) {
      setErr(e.message)
    }
  }

  async function onAdd(e) {
    e.preventDefault()
    const item = newItem.trim()
    if (!item) return
    setBusy(true)
    try {
      await api.post('/shopping-list', { item })
      setNewItem('')
      await load()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function onToggle(it) {
    const checked = !it.checked_at
    setItems((prev) =>
      prev.map((x) =>
        x.id === it.id
          ? { ...x, checked_at: checked ? new Date().toISOString() : null }
          : x,
      ),
    )
    try {
      await api.patch(`/shopping-list/${it.id}`, { checked })
    } catch (e) {
      setErr(e.message)
      load()
    }
  }

  async function onDelete(it) {
    setItems((prev) => prev.filter((x) => x.id !== it.id))
    try {
      await api.del(`/shopping-list/${it.id}`)
    } catch (e) {
      setErr(e.message)
      load()
    }
  }

  async function onRename(it, newText) {
    const trimmed = newText.trim()
    if (!trimmed || trimmed === it.item) return // no-op
    // Optimistic update
    setItems((prev) =>
      prev.map((x) => (x.id === it.id ? { ...x, item: trimmed } : x)),
    )
    try {
      await api.patch(`/shopping-list/${it.id}`, { item: trimmed })
    } catch (e) {
      setErr(e.message)
      load() // re-pull truth
    }
  }

  async function onClearChecked() {
    if (!confirm('Remove all checked items?')) return
    try {
      await api.del('/shopping-list/checked/all')
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function onClearAll() {
    if (!confirm('Clear the whole list?')) return
    try {
      await api.del('/shopping-list')
      setItems([])
    } catch (e) {
      setErr(e.message)
    }
  }

  if (err) return <Alert>{err}</Alert>
  if (!items) return <Spinner label="Pulling the list…" />

  const unchecked = items.filter((i) => !i.checked_at)
  const checked = items.filter((i) => i.checked_at)

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <div className="flex items-baseline gap-4 mb-4">
          <span className="font-display italic text-ink-muted tnum">01</span>
          <span className="eyebrow">From kitchen to market</span>
          <span className="flex-1 h-px bg-rule" />
        </div>
        <h1 className="display-lg">
          The{' '}
          <span className="italic" style={{ fontVariationSettings: '"opsz" 96, "SOFT" 100' }}>
            market
          </span>{' '}
          list
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <p className="font-display italic text-ink-soft text-lg">
            {items.length === 0
              ? 'A blank slip of paper. Add your first item below.'
              : `${unchecked.length} to gather · ${checked.length} in the basket`}
          </p>
          <CountryPicker country={country} onChange={changeCountry} />
        </div>
      </header>

      {/* Add form */}
      <form onSubmit={onAdd} className="flex gap-3 max-w-xl">
        <div className="relative flex-1">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-muted">
            +
          </span>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="olive oil, sourdough, fennel bulb…"
            className="w-full bg-transparent border-0 border-b border-rule pl-7 py-3 text-base font-display placeholder:text-ink-muted/60 focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          disabled={busy || !newItem.trim()}
          className="shrink-0"
        >
          Add
        </Button>
      </form>

      {/* Lists */}
      {unchecked.length > 0 && (
        <section>
          <p className="eyebrow mb-4">To gather</p>
          <ul className="border-t border-rule">
            {unchecked.map((it) => (
              <Row
                key={it.id}
                item={it}
                country={country}
                onToggle={onToggle}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </ul>
        </section>
      )}

      {checked.length > 0 && (
        <section>
          <p className="eyebrow mb-4">In the basket</p>
          <ul className="border-t border-rule-soft">
            {checked.map((it) => (
              <Row
                key={it.id}
                item={it}
                country={country}
                onToggle={onToggle}
                onDelete={onDelete}
                onRename={onRename}
                muted
              />
            ))}
          </ul>
        </section>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-6 text-xs tracking-widest uppercase pt-4">
          {checked.length > 0 && (
            <button
              onClick={onClearChecked}
              className="text-ink-muted hover:text-ink link-grow"
            >
              Empty the basket
            </button>
          )}
          <button
            onClick={onClearAll}
            className="text-tomato/80 hover:text-tomato link-grow"
          >
            Tear up the list
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ item, country, onToggle, onDelete, onRename, muted }) {
  const isChecked = !!item.checked_at
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.item)
  const inputRef = useRef(null)

  // Keep local draft in sync if the underlying item changes (e.g. after a rename round-trip)
  useEffect(() => {
    if (!editing) setDraft(item.item)
  }, [item.item, editing])

  function startEdit() {
    if (isChecked) return
    setDraft(item.item)
    setEditing(true)
    // focus + select on next tick so the input has rendered
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  function commit() {
    setEditing(false)
    onRename(item, draft)
  }

  function cancel() {
    setEditing(false)
    setDraft(item.item)
  }

  return (
    <li
      className={
        'group flex items-center gap-3 sm:gap-5 py-4 border-b transition-opacity ' +
        (muted ? 'border-rule-soft opacity-60' : 'border-rule')
      }
    >
      <button
        onClick={() => onToggle(item)}
        aria-label={isChecked ? 'Uncheck' : 'Check off'}
        className={
          'shrink-0 h-6 w-6 rounded-full border flex items-center justify-center transition-colors ' +
          (isChecked
            ? 'bg-sage border-sage text-paper-soft'
            : 'border-rule hover:border-ink')
        }
      >
        {isChecked && <span className="text-xs leading-none">✓</span>}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancel()
            }
          }}
          maxLength={255}
          className="flex-1 min-w-0 bg-transparent border-0 border-b border-ink/40 px-0 py-1 font-display text-lg text-ink focus:outline-none focus:border-ink"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          disabled={isChecked}
          className={
            'flex-1 min-w-0 text-left font-display text-lg truncate transition-colors ' +
            (isChecked
              ? 'line-through text-ink-muted cursor-default'
              : 'text-ink hover:text-terracotta cursor-text')
          }
          title={isChecked ? '' : 'Tap to rename'}
        >
          {item.item}
        </button>
      )}

      {!isChecked && !editing && <FindMenu item={item} country={country} />}
      <button
        onClick={() => onDelete(item)}
        className="shrink-0 text-base text-ink-muted hover:text-tomato transition-colors px-2 leading-none"
        aria-label="Remove"
      >
        ✕
      </button>
    </li>
  )
}

/**
 * FindMenu — small popover next to each item that lists retailers for
 * the user's detected country. Click any retailer to open its search
 * for this item in a new tab.
 */
function FindMenu({ item, country }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const retailers = getRetailers(country)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Find ${item.item} online`}
        aria-expanded={open}
        title="Find this online"
        className={
          'inline-flex items-center gap-1.5 text-[11px] tracking-widest uppercase transition-colors px-2.5 py-1.5 rounded-full border ' +
          (open
            ? 'text-terracotta border-terracotta bg-terracotta-soft'
            : 'text-ink-muted border-rule hover:text-terracotta hover:border-terracotta')
        }
      >
        <span aria-hidden="true">🔍</span>
        <span className="hidden sm:inline">Find</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-30 min-w-[220px] rounded-2xl border border-rule bg-paper-soft shadow-[0_8px_28px_-8px_rgba(28,24,21,0.25)] overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-rule-soft">
            <p className="eyebrow text-ink-muted">Buy from</p>
            <p className="font-display italic text-sm text-ink mt-0.5 truncate">
              {item.item}
            </p>
          </div>
          <ul className="py-1">
            {retailers.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url(item.item)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-ink hover:bg-paper-deep transition-colors"
                >
                  <span className="font-display">{r.name}</span>
                  <span aria-hidden="true" className="text-ink-muted text-xs">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 border-t border-rule-soft text-[10px] tracking-widest uppercase text-ink-muted">
            {COUNTRY_LABELS[country] || COUNTRY_LABELS.DEFAULT}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * CountryPicker — sits in the page header. Lets the user pick which
 * country's retailers to show in the Find menu. Persisted to localStorage.
 */
function CountryPicker({ country, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const known = ['DEFAULT', ...getKnownCountries()]

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Change region for the Find menu"
        className={
          'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ' +
          (open
            ? 'border-terracotta bg-terracotta-soft text-terracotta-deep'
            : 'border-ink/15 bg-paper-soft text-ink hover:border-ink hover:bg-paper-deep')
        }
      >
        <span className="text-ink-muted text-[11px] tracking-widest uppercase">
          stores in
        </span>
        <span className="font-display">
          {COUNTRY_LABELS[country] || COUNTRY_LABELS.DEFAULT}
        </span>
        <span aria-hidden="true" className="text-[10px] text-ink-muted">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-30 min-w-[240px] rounded-2xl border border-rule bg-paper-soft shadow-[0_8px_28px_-8px_rgba(28,24,21,0.25)] overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-rule-soft">
            <p className="eyebrow text-ink-muted">Region</p>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Which country's stores to show
            </p>
          </div>
          <ul className="py-1 max-h-[320px] overflow-y-auto">
            {known.map((code) => {
              const active = code === country
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onChange(code)
                      setOpen(false)
                    }}
                    className={
                      'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ' +
                      (active
                        ? 'text-terracotta bg-terracotta-soft/40'
                        : 'text-ink hover:bg-paper-deep')
                    }
                  >
                    <span className="font-display">
                      {COUNTRY_LABELS[code]}
                    </span>
                    {active && (
                      <span aria-hidden="true" className="text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
