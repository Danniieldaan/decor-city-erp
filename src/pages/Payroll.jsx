import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages, outstanding } from '../lib/db'
import { fmt, fd, fdl, esc, getWeekStart, getWeekEnd, wkRange, isWk, localDate } from '../lib/utils'

export default function Payroll() {
  const navigate = useNavigate()
  const [prodList, setProdList] = useState([])
  const [stageMap, setStageMap] = useState({})
  const [outList, setOutList] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOff, setWeekOff] = useState(0)
  const [paying, setPaying] = useState(false)

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
        console.error('Payroll load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const baseMon = new Date(getWeekStart(localDate()))
  baseMon.setDate(baseMon.getDate() + weekOff * 7)
  const wkStart = baseMon.toISOString().split('T')[0]
  const wkEnd = getWeekEnd(wkStart)

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const sd = new Date(wkStart + 'T00:00:00')
  const ed = new Date(wkEnd + 'T00:00:00')
  const rangeStr = days[sd.getDay()] + ' ' + sd.getDate() + ' ' + months[sd.getMonth()] + ' ' + sd.getFullYear() + ' – ' + days[ed.getDay()] + ' ' + ed.getDate() + ' ' + months[ed.getMonth()] + ' ' + ed.getFullYear()

  const weekRows = []
  prodList.forEach(p => {
    const sts = stageMap[p.id] || []
    sts.forEach(st => {
      const d = st.dateOverride || st.date
      if (d && d >= wkStart && d <= wkEnd) {
        weekRows.push({ prod: p, stage: st, date: d })
      }
    })
  })
  weekRows.sort((a, b) => a.date.localeCompare(b.date))

  const artWeekly = {}
  const artDetails = {}
  weekRows.forEach(({ prod, stage }) => {
    if (!stage.artisans) return
    const names = stage.artisans.split(',').map(a => a.trim()).filter(Boolean)
    const comm = stage.comm || 0
    const split = names.length ? comm / names.length : 0
    names.forEach(n => {
      artWeekly[n] = (artWeekly[n] || 0) + split
      if (!artDetails[n]) artDetails[n] = []
      artDetails[n].push({ prod, stage, split })
    })
  })

  const unpaidOut = outList.filter(o => !o.paid)
  const artOut = {}
  unpaidOut.forEach(o => {
    artOut[o.artisan] = (artOut[o.artisan] || 0) + (o.amount || 0)
  })

  const paidThisWk = outList.filter(o => o.paid && o.paidDate && o.paidDate >= wkStart && o.paidDate <= wkEnd)
  const weekPaid = paidThisWk.length > 0

  async function payAll() {
    setPaying(true)
    try {
      const today = localDate()
      await outstanding.markAllPaid(today)
      setOutList(prev => prev.map(o => o.paid ? o : { ...o, paid: true, paidDate: today }))
    } catch (err) {
      console.error(err)
    } finally {
      setPaying(false)
    }
  }

  async function payArtisan(artisan) {
    setPaying(true)
    try {
      const today = localDate()
      const items = unpaidOut.filter(o => o.artisan === artisan)
      for (const item of items) {
        await outstanding.markPaid(item.id, today)
      }
      setOutList(prev => prev.map(o => o.artisan === artisan && !o.paid ? { ...o, paid: true, paidDate: today } : o))
    } catch (err) {
      console.error(err)
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Loading...</div>

  return (
    <div>
      <div className="ph">
        <div className="pt">Weekly Payroll</div>
        <div className="ps">Manage artisan payroll and outstanding payments</div>
        <div className="ptb">
          <button onClick={() => navigate('/production')} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Production</button>
        </div>
      </div>

      <div className="actb">
        <button onClick={() => setWeekOff(weekOff - 1)} className="h-7 px-3 rounded-lg border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">&larr; Prev</button>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0 0.5rem' }}>{rangeStr}</span>
        <button onClick={() => setWeekOff(weekOff + 1)} className="h-7 px-3 rounded-lg border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Next &rarr;</button>
        <div className="sep" />
        {weekPaid ? (
          <span className="sp sco">Paid</span>
        ) : (
          <span className="sp spr">Unpaid</span>
        )}
        <div className="sep" />
        {unpaidOut.length > 0 && (
          <button onClick={payAll} disabled={paying} className="h-7 px-3 rounded-lg bg-success hover:bg-success/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 disabled:opacity-50">Pay All Outstanding</button>
        )}
        <div className="vlbl">{weekRows.length} stage{weekRows.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="pnl">
        <div className="pnlh">Weekly Stage Commissions</div>
        {weekRows.length === 0 ? (
          <div className="empty">No stages completed this week</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Frame Type</th>
                  <th>Stage</th>
                  <th>Artisan(s)</th>
                  <th className="money">Commission</th>
                  <th className="money">Split Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {weekRows.map(({ prod, stage }, i) => {
                  const names = stage.artisans ? stage.artisans.split(',').map(a => a.trim()).filter(Boolean) : []
                  const comm = stage.comm || 0
                  const split = names.length ? comm / names.length : 0
                  const frameType = (prod.frames && prod.frames.length) ? [...new Set(prod.frames.map(f => f.frame_type))].join(', ') : (prod.frame_type || '')
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>#{prod.id}</td>
                      <td style={{ fontSize: '0.75rem' }}>{esc(frameType)}</td>
                      <td style={{ fontSize: '0.75rem' }}>{stage.sk}</td>
                      <td style={{ fontSize: '0.75rem' }}>{names.length ? names.join(', ') : '—'}</td>
                      <td className="money">{fmt(comm)}</td>
                      <td className="money">{fmt(split)}</td>
                      <td style={{ fontSize: '0.75rem' }}>{fdl(stage.dateOverride || stage.date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pnl">
        <div className="pnlh">Artisan Weekly Totals</div>
        {Object.keys(artWeekly).length === 0 ? (
          <div className="empty">No commissions this week</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Artisan</th>
                  <th className="money">Total Commission</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(artWeekly).sort().map(name => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{esc(name)}</td>
                    <td className="money mb">{fmt(artWeekly[name])}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--color-muted)' }}>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td className="money mb">{fmt(Object.values(artWeekly).reduce((s, v) => s + v, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pnl">
        <div className="pnlh">Outstanding Balances</div>
        {unpaidOut.length === 0 ? (
          <div className="empty">No outstanding balances</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="dt">
              <thead>
                <tr>
                  <th>Artisan</th>
                  <th className="money">Outstanding Amount</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(artOut).sort().map(name => (
                  <tr key={name}>
                    <td style={{ fontWeight: 600 }}>{esc(name)}</td>
                    <td className="money mr">{fmt(artOut[name])}</td>
                    <td>
                      <button
                        onClick={() => payArtisan(name)}
                        disabled={paying}
                        className="h-7 px-3 rounded-lg bg-success hover:bg-success/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 disabled:opacity-50"
                      >
                        Pay
                      </button>
                    </td>
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
