import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Alert, Button, Card, Spinner } from '../components/ui'

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
      prev.map((x) => (x.id === it.id ? { ...x, checked_at: checked ? new Date().toISOString() : null } : x)),
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
  if (!items) return <Spinner label="Loading…" />

  const unchecked = items.filter((i) => !i.checked_at)
  const checked = items.filter((i) => i.checked_at)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shopping list</h1>
        <p className="text-sm text-gray-500 mt-1">
          {items.length === 0
            ? 'Your list is empty. Add items below or from any recipe.'
            : `${unchecked.length} to buy · ${checked.length} checked`}
        </p>
      </div>

      <form onSubmit={onAdd} className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item (e.g. olive oil)"
          className="flex-1 min-h-[44px] px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Button type="submit" disabled={busy || !newItem.trim()}>
          Add
        </Button>
      </form>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {checked.length > 0 && (
            <button
              onClick={onClearChecked}
              className="text-gray-600 hover:text-gray-900 underline"
            >
              Remove checked
            </button>
          )}
          <button onClick={onClearAll} className="text-red-600 hover:text-red-800 underline">
            Clear all
          </button>
        </div>
      )}

      {unchecked.length > 0 && (
        <Card>
          <ul className="divide-y divide-gray-100">
            {unchecked.map((it) => (
              <Row key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </Card>
      )}

      {checked.length > 0 && (
        <Card className="bg-gray-50">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">In cart</p>
          <ul className="divide-y divide-gray-200">
            {checked.map((it) => (
              <Row key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Row({ item, onToggle, onDelete }) {
  const isChecked = !!item.checked_at
  return (
    <li className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={() => onToggle(item)}
        className="w-5 h-5 accent-emerald-600 cursor-pointer"
      />
      <span
        className={
          'flex-1 text-gray-900 ' + (isChecked ? 'line-through text-gray-400' : '')
        }
      >
        {item.item}
      </span>
      <button
        onClick={() => onDelete(item)}
        className="text-xs text-gray-400 hover:text-red-600 px-2"
        aria-label="Remove"
      >
        ✕
      </button>
    </li>
  )
}
