import { useState, useEffect } from 'react'
import { Calendar as CalIcon } from 'lucide-react'
import { api } from '../api'

export default function Calendar() {
  const [items, setItems] = useState([])

  useEffect(() => {
    api.getCalendar().then((r) => setItems(r.items || [])).catch(() => setItems([]))
  }, [])

  const impactColor = (i) => (i === 'high' ? 'text-apex-loss' : i === 'medium' ? 'text-apex-warning' : 'text-slate-400')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <CalIcon size={28} className="text-apex-accent" />
        Economic Calendar
      </h1>
      <p className="text-slate-400 text-sm">Upcoming releases and events. Impact: High / Medium / Low.</p>
      <div className="rounded-lg border border-slate-700/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-apex-dark/80 text-slate-400 text-left">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Impact</th>
              <th className="py-3 px-4">Forecast</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-t border-slate-700/50 hover:bg-slate-800/30">
                <td className="py-3 px-4 text-white">{e.date}</td>
                <td className="py-3 px-4 text-slate-300">{e.time}</td>
                <td className="py-3 px-4 text-white">{e.event}</td>
                <td className={`py-3 px-4 capitalize ${impactColor(e.impact)}`}>{e.impact}</td>
                <td className="py-3 px-4 text-slate-400">{e.forecast}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
