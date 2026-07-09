import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages, outstanding } from '../lib/db'
import { fmt, fd, fdl, esc, getWeekStart, getWeekEnd, wkRange, isWk, localDate } from '../lib/utils'

export default function Workers() {
  const navigate = useNavigate()
  const [prodList, setProdList] = useState([])
  const [stageMap, setStageMap] = useState({})
  const [outList, setOutList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [allProd, allOut] = await Promise.all([
          productions.getAll(),
          outstanding.getAll()
        ])
        setProdList(allProd)
        setOutList(allOut)
        const sm = {}
        for (const p of allProd) {
          const st = await prodStages.getByProduction(p.id)
          sm[p.id] = st
        }
        setStageMap(sm)
      } catch (err) {
        console.error('Workers load error:', err)
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

  const unpaidOut = outList.filter(o => !o.paid)
  const artOut = {}
  unpaidOut.forEach(o => {
    artOut[o.artisan] = (artOut[o.artisan] || 0) + (o.amount || 0)
  })

  const artisans = Object.keys(artisanData).sort()
  const months = [...new Set(artisans.flatMap(a => Object.keys(artisanData[a].monthly)))].sort()

  const mm = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Loading...</div>

  return (
    <div>
      <div className="ph">
        <div className="pt">Workers</div>
        <div className="ps">Artisan overview and monthly earnings</div>
        <div className="ptb">
          <button onClick={() => navigate('/payroll')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">Payroll</button>
        </div>
      </div>

      <div className="actb">
        <div className="vlbl">{artisans.length} artisan{artisans.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="pnl">
        <div className="pnlh">Artisan Summary</div>
        {artisans.length === 0 ? (
          <div className="empty">No artisans found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Artisan Name</th>
                  <th className="money">Total Jobs</th>
                  <th className="money">Total Commission</th>
                  <th className="money">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {artisans.map(name => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{esc(name)}</td>
                    <td className="money">{artisanData[name].jobs}</td>
                    <td className="money">{fmt(artisanData[name].commission)}</td>
                    <td className="money mr">{fmt(artOut[name] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pnl">
        <div className="pnlh">Monthly Earnings</div>
        {artisans.length === 0 ? (
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
                {artisans.map(name => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{esc(name)}</td>
                    {months.map(m => (
                      <td key={m} className="money">{fmt(artisanData[name].monthly[m] || 0)}</td>
                    ))}
                    <td className="money mb">{fmt(artisanData[name].commission)}</td>
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
