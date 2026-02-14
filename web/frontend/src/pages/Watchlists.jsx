import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../api'

export default function Watchlists() {
  const [watchlists, setWatchlists] = useState({})
  const [newSymbol, setNewSymbol] = useState('')
  const [listName, setListName] = useState('default')

  const load = () => api.getWatchlists().then(setWatchlists).catch(() => setWatchlists({}))

  useEffect(() => {
    load()
  }, [])

  const add = () => {
    if (!newSymbol.trim()) return
    api.addToWatchlist(listName, newSymbol.trim()).then(() => {
      setNewSymbol('')
      load()
    }).catch(console.error)
  }

  const remove = (name, symbol) => {
    api.removeFromWatchlist(name, symbol).then(load).catch(console.error)
  }

  const lists = Object.entries(watchlists.watchlists || {})

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Watchlists</h1>
      <p className="text-slate-400 text-sm">Track symbols. Add/remove below.</p>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white w-28"
        />
        <select
          value={listName}
          onChange={(e) => setListName(e.target.value)}
          className="rounded bg-apex-dark border border-slate-600 px-3 py-2 text-white"
        >
          {lists.map(([k]) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button onClick={add} className="p-2 rounded bg-apex-accent text-white">
          <Plus size={18} />
        </button>
      </div>
      <div className="space-y-4">
        {lists.map(([name, symbols]) => (
          <div key={name} className="rounded-lg border border-slate-700/50 bg-apex-dark/50 p-4">
            <h2 className="text-white font-medium mb-2">{name}</h2>
            <div className="flex flex-wrap gap-2">
              {(symbols || []).map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-700/50 text-slate-200 text-sm"
                >
                  {s}
                  <button onClick={() => remove(name, s)} className="text-slate-500 hover:text-apex-loss">
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
