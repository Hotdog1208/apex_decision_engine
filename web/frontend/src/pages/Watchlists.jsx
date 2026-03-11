import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, BarChart2 } from 'lucide-react'
import { api } from '../api'
import PageWrapper from '../components/PageWrapper'
import PageHeader from '../components/PageHeader'
import Card, { CardBody } from '../components/Card'

export default function Watchlists() {
  const [watchlists, setWatchlists] = useState({})
  const [quotes, setQuotes] = useState({})
  const [newSymbol, setNewSymbol] = useState('')
  const [listName, setListName] = useState('default')
  const [loading, setLoading] = useState(false)

  const load = () => api.getWatchlists().then(setWatchlists).catch(() => setWatchlists({}))

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const lists = watchlists.watchlists || {}
    const allSymbols = [...new Set(Object.values(lists).flat())]
    if (allSymbols.length === 0) return
    api
      .getQuotes(allSymbols)
      .then((r) => {
        const map = {}
        for (const q of r.quotes || []) map[q.symbol] = q
        setQuotes(map)
      })
      .catch(() => {})
  }, [watchlists])

  const add = () => {
    if (!newSymbol.trim()) return
    setLoading(true)
    api
      .addToWatchlist(listName, newSymbol.trim())
      .then(() => {
        setNewSymbol('')
        load()
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const remove = (name, symbol) => {
    api.removeFromWatchlist(name, symbol).then(load).catch(console.error)
  }

  const lists = Object.entries(watchlists.watchlists || {})

  return (
    <PageWrapper>
      <div className="space-y-6">
        <PageHeader
          title="Watchlists"
          subtitle="Track symbols with live prices. Accurate and better than TradingView."
          icon={BarChart2}
        />

        <Card animate hover>
          <CardBody>
            <div className="flex flex-wrap gap-2 items-end">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol"
                className="rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white w-28"
                maxLength={8}
              />
              <select
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/20 px-3 py-2 text-white min-w-[120px]"
              >
                {lists.map(([k]) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
              <button
                onClick={add}
                disabled={loading || !newSymbol.trim()}
                className="p-2.5 rounded-lg bg-apex-accent text-black hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <Plus size={18} /> Add
              </button>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {lists.map(([name, symbols]) => (
            <Card key={name} animate hover>
              <CardBody>
                <h2 className="text-white font-semibold mb-3 border-b border-white/10 pb-2">{name}</h2>
                <div className="flex flex-wrap gap-3">
                  {(symbols || []).map((s) => {
                    const q = quotes[s]
                    return (
                      <div
                        key={s}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-apex-accent/30 transition-colors"
                      >
                        <span className="font-data font-semibold text-white">{s}</span>
                        {q != null ? (
                          <>
                            <span className="font-data text-apex-accent">${(q.price ?? 0).toFixed(2)}</span>
                            <span className="text-xs text-white/50">Vol: {((q.volume ?? 0) / 1e6).toFixed(2)}M</span>
                          </>
                        ) : (
                          <span className="text-white/40 text-sm">—</span>
                        )}
                        <Link
                          to={`/charts?symbol=${s}`}
                          className="text-apex-accent hover:underline text-xs flex items-center gap-1"
                        >
                          Chart
                        </Link>
                        <button
                          onClick={() => remove(name, s)}
                          className="text-white/40 hover:text-apex-loss p-1"
                          aria-label={`Remove ${s}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
