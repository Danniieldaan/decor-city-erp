import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages } from '../lib/db'
import { fmt, fd, esc, localDate } from '../lib/utils'
import { SL, STAGES } from '../lib/constants'

const ARTISANS = ['John', 'Jane', 'Mike', 'Sarah', 'Paul', 'Anna', 'Grace', 'David']

export default function Production() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [stagesByJob, setStagesByJob] = useState({})
  const [allStageKeys, setAllStageKeys] = useState([])
  const [openArtisan, setOpenArtisan] = useState(null)
  const [artisanSel, setArtisanSel] = useState({})
  const [ddPos, setDdPos] = useState({ top: 0, left: 0 })
  const [overrideVal, setOverrideVal] = useState({})
  const ddRef = useRef(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const all = await productions.getAll()
      const active = all.filter(p => p.status === 'active' || p.status === 'in_progress')
      setJobs(active)
      const sMap = {}
      const keysSet = new Set()
      for (const p of active) {
        const st = await prodStages.getByProduction(p.id)
        sMap[p.id] = st
        st.forEach(s => keysSet.add(s.sk))
      }
      setStagesByJob(sMap)
      const ordered = STAGES.filter(k => keysSet.has(k))
      setAllStageKeys(ordered.length ? ordered : [...keysSet])
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    function handleClick(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) {
        setOpenArtisan(null)
      }
    }
    if (openArtisan) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openArtisan])

  function getStages(pid) { return stagesByJob[pid] || [] }

  function getFrameLabel(job) {
    if (!job) return ''
    if (job.frames && job.frames.length) {
      const types = [...new Set(job.frames.map(f => f.frame_type))]
      return types.join(', ')
    }
    return job.frame_type || ''
  }

  function getSize(job) {
    if (!job) return ''
    if (job.frames && job.frames.length) {
      return job.frames.map(f => (f.width || '-') + 'x' + (f.height || '-')).join(', ')
    }
    return (job.width || '-') + 'x' + (job.height || '-')
  }

  function getTier(job) {
    if (!job) return ''
    if (job.frames && job.frames.length) {
      const tiers = [...new Set(job.frames.map(f => f.tier || '').filter(Boolean))]
      return tiers.join(', ')
    }
    return job.tier || ''
  }

  function getTotalQty(job) {
    if (!job) return 0
    if (job.frames && job.frames.length) {
      return job.frames.reduce((s, f) => s + (f.qty || 1), 0)
    }
    return job.qty || 1
  }

  function completedDate(stage) {
    if (stage.dateOverride) return fd(stage.dateOverride)
    if (stage.date) return fd(stage.date)
    return null
  }

  function isStageDone(stage) {
    return !!(stage.dateOverride || stage.date)
  }

  async function toggleStage(stage, pid) {
    if (isStageDone(stage)) return
    const today = localDate()
    const updates = { date: today, dateOverride: null }
    const updated = await prodStages.update(stage.id, updates)
    if (updated) {
      const newStages = getStages(pid).map(s => s.id === stage.id ? { ...s, ...updates } : s)
      setStagesByJob(prev => ({ ...prev, [pid]: newStages }))
      const allDone = newStages.every(s => s.date || s.dateOverride)
      if (allDone) {
        await productions.update(pid, { status: 'completed' })
        setJobs(prev => prev.filter(j => j.id !== pid))
        setStagesByJob(prev => {
          const next = { ...prev }
          delete next[pid]
          return next
        })
      }
    }
  }

  async function undoStage(stage, pid) {
    await prodStages.update(stage.id, { date: null, dateOverride: null })
    setStagesByJob(prev => ({
      ...prev,
      [pid]: prev[pid].map(s => s.id === stage.id ? { ...s, date: null, dateOverride: null } : s)
    }))
    const job = jobs.find(j => j.id === pid)
    if (job && (job.status === 'completed' || job.status === 'done')) {
      await productions.update(pid, { status: 'active' })
      setJobs(prev => prev.map(j => j.id === pid ? { ...j, status: 'active' } : j))
    }
  }

  async function handleDateOverride(stage, pid, val) {
    if (!val) return
    await prodStages.update(stage.id, { dateOverride: val })
    setStagesByJob(prev => ({
      ...prev,
      [pid]: prev[pid].map(s => s.id === stage.id ? { ...s, dateOverride: val } : s)
    }))
    setOverrideVal(prev => {
      const next = { ...prev }
      delete next[stage.id]
      return next
    })
  }

  async function deleteJob(pid) {
    if (!confirm('Delete production job #' + pid + '?')) return
    try {
      await prodStages.removeByProduction(pid)
      await productions.remove(pid)
      setJobs(prev => prev.filter(j => j.id !== pid))
      setStagesByJob(prev => {
        const next = { ...prev }
        delete next[pid]
        return next
      })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  function toggleArtisanDropdown(pid, sk, e) {
    const key = pid + '|' + sk
    if (openArtisan === key) {
      setOpenArtisan(null)
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    setDdPos({ top: r.bottom + 4, left: r.left })
    const stage = getStages(pid).find(s => s.sk === sk)
    const current = stage ? (stage.artisans ? stage.artisans.split(',').map(a => a.trim()).filter(Boolean) : []) : []
    setArtisanSel(prev => ({ ...prev, [key]: current }))
    setOpenArtisan(key)
  }

  function toggleArtisanItem(key, a) {
    setArtisanSel(prev => {
      const cur = prev[key] || []
      const next = cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a]
      return { ...prev, [key]: next }
    })
  }

  async function saveArtisans(pid, sk) {
    const key = pid + '|' + sk
    const sel = artisanSel[key] || []
    const stage = getStages(pid).find(s => s.sk === sk)
    if (!stage) return
    await prodStages.update(stage.id, { artisans: sel.join(', ') })
    setStagesByJob(prev => ({
      ...prev,
      [pid]: prev[pid].map(s => s.id === stage.id ? { ...s, artisans: sel.join(', ') } : s)
    }))
    setOpenArtisan(null)
  }

  function progress(pid) {
    const st = getStages(pid)
    if (!st.length) return 0
    return st.filter(s => s.date || s.dateOverride).length / st.length
  }

  function doneCount(pid) {
    const st = getStages(pid)
    return st.filter(s => s.date || s.dateOverride).length
  }

  function latestDate(pid) {
    const st = getStages(pid)
    const dates = st.map(s => s.dateOverride || s.date).filter(Boolean)
    if (!dates.length) return '—'
    return fd(dates.sort().pop())
  }

  function statusText(pid) {
    const st = getStages(pid)
    const done = st.filter(s => s.date || s.dateOverride).length
    if (done === 0) return <span className="sp sdr">Pending</span>
    if (done === st.length) return <span className="sp sco">Completed</span>
    return <span className="sp spr">{done}/{st.length}</span>
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">Active Jobs</div>
        <div className="ps">Current production floor jobs</div>
        <div className="ptb">
          <button onClick={() => navigate('/production/new')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ New Job</button>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="empty">No active production jobs</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt" style={{ minWidth: allStageKeys.length * 120 + 700 }}>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Frame Type</th>
                <th>Size</th>
                <th>Tier</th>
                <th>Qty</th>
                <th>Customer</th>
                <th>Status</th>
                {allStageKeys.map(sk => (
                  <th key={sk} style={{ fontSize: '0.65rem', textAlign: 'center' }}>{SL[sk] || sk}</th>
                ))}
                <th style={{ textAlign: 'center' }}>Stage Date</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const st = getStages(job.id)
                const pct = Math.round(progress(job.id) * 100)
                return (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 600 }}>#{job.id}</td>
                    <td style={{ fontSize: '0.75rem' }}>{esc(getFrameLabel(job))}</td>
                    <td style={{ fontSize: '0.75rem' }}>{esc(getSize(job))}</td>
                    <td style={{ fontSize: '0.75rem' }}>{esc(getTier(job))}</td>
                    <td style={{ textAlign: 'center' }}>{getTotalQty(job)}</td>
                    <td style={{ fontSize: '0.75rem' }}>{esc(job.customer_name || '')}</td>
                    <td>{statusText(job.id)}</td>
                    {allStageKeys.map(sk => {
                      const stage = st.find(s => s.sk === sk)
                      if (!stage) return <td key={sk} style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.6875rem' }}>—</td>
                      const done = isStageDone(stage)
                      const cd = completedDate(stage)
                      return (
                        <td key={sk} style={{ textAlign: 'center', padding: '0.25rem 0.5rem', verticalAlign: 'middle' }}>
                          {done ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: '#16a34a', fontSize: '1rem', cursor: 'pointer' }} onClick={() => undoStage(stage, job.id)} title="Undo">&check;</span>
                                <span style={{ fontSize: '0.625rem', color: '#64748b' }}>{cd}</span>
                                <div className="art-msel">
                                  <div className="art-msel-trigger" onClick={(e) => toggleArtisanDropdown(job.id, sk, e)}>
                                    {stage.artisans ? stage.artisans.split(',').length + ' art' : 'Artisan'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: '0.625rem', color: '#64748b' }}>Comm: {fmt(stage.comm || 0)}</span>
                                {overrideVal[stage.id] !== undefined ? (
                                  <input
                                    type="date"
                                    className="qi"
                                    style={{ width: 80, fontSize: '0.625rem', padding: '1px 2px' }}
                                    value={overrideVal[stage.id] || ''}
                                    onChange={e => setOverrideVal(prev => ({ ...prev, [stage.id]: e.target.value }))}
                                    onBlur={() => handleDateOverride(stage, job.id, overrideVal[stage.id])}
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    style={{ fontSize: '0.625rem', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={() => setOverrideVal(prev => ({ ...prev, [stage.id]: stage.dateOverride || '' }))}
                                  >override</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <div
                                onClick={() => toggleStage(stage, job.id)}
                                style={{ width: 18, height: 18, border: '2px solid #94a3b8', borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Mark done"
                              />
                              <div className="art-msel">
                                <div className="art-msel-trigger" onClick={(e) => toggleArtisanDropdown(job.id, sk, e)}>
                                  {stage.artisans ? stage.artisans.split(',').length + ' art' : 'Artisan'}
                                </div>
                              </div>
                              <span style={{ fontSize: '0.625rem', color: '#64748b' }}>Comm: {fmt(stage.comm || 0)}</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>{latestDate(job.id)}</td>
                    <td>
                      <button
                        onClick={() => deleteJob(job.id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors cursor-pointer border-0"
                        title="Delete job"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {jobs.map(job => {
        const pct = Math.round(progress(job.id) * 100)
        return (
          <div key={'prog-' + job.id} style={{ padding: '0 0.75rem 0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>#{job.id}</span>
              <div className="prog" style={{ flex: 1 }}>
                <div className="prog-f" style={{ width: pct + '%' }}></div>
              </div>
              <span>{doneCount(job.id)}/{getStages(job.id).length} ({pct}%)</span>
            </div>
          </div>
        )
      })}

      {openArtisan && (() => {
        const [pid, sk] = openArtisan.split('|')
        const key = openArtisan
        return (
          <div ref={ddRef} className="art-msel-dd open" style={{ top: ddPos.top, left: ddPos.left }}>
            {ARTISANS.map(a => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={(artisanSel[key] || []).includes(a)}
                  onChange={() => toggleArtisanItem(key, a)}
                />
                {a}
              </label>
            ))}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 4, marginTop: 4 }}>
              <button
                onClick={() => saveArtisans(+pid, sk)}
                className="h-6 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 w-full"
              >Apply</button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
