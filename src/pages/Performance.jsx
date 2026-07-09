import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages, outstanding } from '../lib/db'
import { fmt, fd, fdl, esc, getWeekStart, getWeekEnd, wkRange, isWk, localDate } from '../lib/utils'

export default function Performance() {
  const navigate = useNavigate()
  const [prodList, setProdList] = useState([])
  const [stageMap, setStageMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const allProd = await productions.getAll()
        setProdList(allProd)
        const sm = {}
        for (const p of allProd) {
          const st = await prodStages.getByProduction(p.id)
          sm[p.id] = st
        }
        setStageMap(sm)
      } catch (err) {
        console.error('Performance load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const artisanData = {}
  prodList.forEach(p => {
    const sts = stageMap[p.id] || []
    sts.forEach(st => {
      if (!st.artisans) return
      const names = st.artisans.split(',').map(a => a.trim()).filter(Boolean)
      const comm = st.comm || 0
      const split = names.length ? comm / names.length : 0
      const month = st.date ? st.date.substring(0, 7) : ''
      names.forEach(n => {
        if (!artisanData[n]) artisanData[n] = { jobs: 0, commission: 0, monthly: {} }
        artisanData[n].jobs++
        artisanData[n].commission += split
        if (month) {
          artisanData[n].monthly[month] = (artisanData[n].monthly[month] || 0) + split
        }
      })
    })
  })

  const entries = Object.keys(artisanData).map(name => ({
    name,
    jobs: artisanData[name].jobs,
    commission: artisanData[name].commission,
    avg: artisanData[name].jobs ? artisanData[name].commission / artisanData[name].jobs : 0,
    monthly: artisanData[name].monthly
  })).sort((a, b) => b.commission - a.commission)

  const top = entries[0]
  const months = [...new Set(entries.flatMap(e => Object.keys(e.monthly)))].sort()

  const mm = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Loading...</div>

  return (
    <div>
      <div className="ph">
        <div className="pt">Performance</div>
        <div className="ps">Artisan performance and rankings</div>
        <div className="ptb">
          <button onClick={() => navigate('/workers')} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Workers</button>
          <button onClick={() => navigate('/payroll')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">Payroll</button>
        </div>
      </div>

      {top && (
        <div style={{ padding: '0.75rem' }}>
          <div className="pnl" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '2px solid #f59e0b', margin: 0 }}>
            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e', marginBottom: 8 }}>Top Performer</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f', marginBottom: 4 }}>{esc(top.name)}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>{fmt(top.commission)}</div>
              <div style={{ fontSize: '0.8125rem', color: '#92400e' }}>{top.jobs} job{top.jobs !== 1 ? 's' : ''} completed</div>
            </div>
          </div>
        </div>
      )}

      <div className="pnl">
        <div className="pnlh">Artisan Rankings</div>
        {entries.length === 0 ? (
          <div className="empty">No performance data available</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rank</th>
                  <th>Artisan</th>
                  <th className="money">Total Commission</th>
                  <th className="money">Jobs Done</th>
                  <th className="money">Avg Commission / Job</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.name}>
                    <td style={{ fontWeight: 700, color: i < 3 ? '#f59e0b' : undefined, textAlign: 'center' }}>
                      {i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '#' + (i + 1)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{esc(e.name)}</td>
                    <td className="money mb">{fmt(e.commission)}</td>
                    <td className="money">{e.jobs}</td>
                    <td className="money">{fmt(Math.round(e.avg * 100) / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pnl">
        <div className="pnlh">Monthly Commission Trend</div>
        {entries.length === 0 ? (
          <div className="empty">No data available</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Artisan</th>
                  {months.map(m => (
                    <th key={m} className="money">{mm[+m.substring(5)]} {m.substring(0, 4)}</th>
                  ))}
                  <th className="money">Total</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.name}>
                    <td style={{ fontWeight: 600 }}>{esc(e.name)}</td>
                    {months.map(m => (
                      <td key={m} className="money">{fmt(e.monthly[m] || 0)}</td>
                    ))}
                    <td className="money mb">{fmt(e.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
