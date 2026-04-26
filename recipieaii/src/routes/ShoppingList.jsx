import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Alert, Button, Spinner } from '../components/ui'

export default function ShoppingList() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)
  const [newItem, setNewItem] = useState('')
  const [busy, setBusy] = useState(false)

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
        <p className="font-display italic text-ink-soft text-lg mt-3">
          {items.length === 0
            ? 'A blank slip of paper. Add your first item below.'
            : `${unchecked.length} to gather · ${checked.length} in the basket`}
        </p>
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
              <Row key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} />
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
                onToggle={onToggle}
                onDelete={onDelete}
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

function Row({ item, onToggle, onDelete, muted }) {
  const isChecked = !!item.checked_at
  return (
    <li
      className={
        'group flex items-center gap-5 py-4 border-b transition-opacity ' +
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
      <span
        className={
          'flex-1 font-display text-lg ' +
          (isChecked ? 'line-through text-ink-muted' : 'text-ink')
        }
      >
        {item.item}
      </span>
      <button
        onClick={() => onDelete(item)}
        className="opacity-0 group-hover:opacity-100 text-xs text-ink-muted hover:text-tomato transition-opacity px-2"
        aria-label="Remove"
      >
        ✕
      </button>
    </li>
  )
}
