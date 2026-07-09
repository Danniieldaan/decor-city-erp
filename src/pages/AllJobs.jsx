import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages } from '../lib/db'
import { fmt, fd, esc, localDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function AllJobs() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [jobs, setJobs] = useState([])
  const [stagesByJob, setStagesByJob] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [preview, setPreview] = useState(null)
  const [openDD, setOpenDD] = useState(null)
  const [ddPos, setDdPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(true)
  const ddRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const all = await productions.getAll()
        setJobs(all)
        const sMap = {}
        for (const p of all) {
          const st = await prodStages.getByProduction(p.id)
          sMap[p.id] = st
        }
        setStagesByJob(sMap)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) {
        setOpenDD(null)
      }
    }
    if (openDD) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDD])

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

  function statusDisplay(job) {
    const st = getStages(job.id)
    if (job.status === 'completed' || job.status === 'done') {
      return <span className="sp sco">Completed</span>
    }
    if (!st.length) {
      return <span className="sp sdr">{job.status || 'Pending'}</span>
    }
    const done = st.filter(s => s.date || s.dateOverride).length
    if (done === 0) return <span className="sp sdr">Pending</span>
    return <span className="sp spr">{done}/{st.length}</span>
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(prev => {
      const allSelected = jobs.every(j => prev.has(j.id))
      if (allSelected) {
        const next = new Set(prev)
        jobs.forEach(j => next.delete(j.id))
        return next
      }
      const next = new Set(prev)
      jobs.forEach(j => next.add(j.id))
      return next
    })
  }

  async function handleBulkDelete() {
    if (!hasPermission('delete_invoices')) return alert('You do not have permission to delete.')
    if (!confirm('Delete ' + selected.size + ' selected job(s)?')) return
    try {
      for (const id of selected) {
        await prodStages.removeByProduction(id)
        await productions.remove(id)
      }
      setJobs(prev => prev.filter(j => !selected.has(j.id)))
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete production job #' + id + '?')) return
    try {
      await prodStages.removeByProduction(id)
      await productions.remove(id)
      setJobs(prev => prev.filter(j => j.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function openPreview(job) {
    const st = await prodStages.getByProduction(job.id)
    setPreview({ job, stages: st || [] })
  }

  function exportCSV() {
    const headers = ['Job ID', 'Frame Type', 'Size', 'Tier', 'Date Logged', 'Due Date', 'Status']
    const rows = jobs.map(j => [
      j.id,
      getFrameLabel(j),
      getSize(j),
      getTier(j),
      j.created_at || '',
      j.due_date || '',
      j.status || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'all_jobs_' + localDate() + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const allSelected = jobs.length > 0 && jobs.every(j => selected.has(j.id))

  return (
    <div>
      <div className="ph">
        <div className="pt">All Jobs</div>
        <div className="ps">All production jobs</div>
        <div className="ptb">
          <button onClick={exportCSV} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Export CSV</button>
          <button onClick={() => navigate('/production/new')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ New Job</button>
        </div>
      </div>

      <div className="actb">
        <div className="vlbl">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>
        {selected.size > 0 && hasPermission('delete_invoices') && (
          <button onClick={handleBulkDelete} className="h-7 px-3 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
            Delete ({selected.size})
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="empty">No jobs found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Job ID</th>
                <th>Frame Type</th>
                <th>Size</th>
                <th>Tier</th>
                <th>Date Logged</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleSelect(job.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ fontWeight: 600 }}>#{job.id}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getFrameLabel(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getSize(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getTier(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{job.created_at ? fd(job.created_at) : '—'}</td>
                  <td style={{ fontSize: '0.75rem' }}>{job.due_date ? fd(job.due_date) : '—'}</td>
                  <td>{statusDisplay(job)}</td>
                  <td>
                    <div className="ddw">
                      <button
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setDdPos({ top: r.bottom + 4, left: r.left })
                          setOpenDD(openDD === job.id ? null : job.id)
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer border-0"
                        title="Actions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                      </button>
                      {openDD === job.id && (
                        <div ref={ddRef} className="ddm show" style={{ top: ddPos.top, left: ddPos.left }}>
                          <a onClick={() => { setOpenDD(null); openPreview(job) }}>Preview</a>
                          {hasPermission('delete_invoices') && (
                            <a onClick={() => { setOpenDD(null); handleDelete(job.id) }} style={{ color: 'var(--color-destructive)' }}>Delete</a>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <Modal title={'Job #' + preview.job.id} onClose={() => setPreview(null)} footer={
          <button onClick={() => setPreview(null)} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Close</button>
        }>
          <div style={{ padding: '1rem' }}>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="lbl">Customer</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{esc(preview.job.customer_name || '—')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Status</div>
                <div>{statusDisplay(preview.job)}</div>
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="lbl">Date Logged</div>
                <div style={{ fontSize: '0.875rem' }}>{preview.job.created_at ? fd(preview.job.created_at) : '—'}</div>
              </div>
              <div>
                <div className="lbl">Due Date</div>
                <div style={{ fontSize: '0.875rem' }}>{preview.job.due_date ? fd(preview.job.due_date) : '—'}</div>
              </div>
            </div>
            {preview.job.priority && (
              <div style={{ marginBottom: 12 }}>
                <div className="lbl">Priority</div>
                <div style={{ fontSize: '0.875rem' }}>{preview.job.priority}</div>
              </div>
            )}
            {preview.stages.length > 0 && (
              <div>
                <div className="lbl" style={{ marginBottom: 4 }}>Stages</div>
                <table className="ft">
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Stage</th>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Date</th>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Artisans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.stages.map((s, i) => (
                      <tr key={i}>
                        <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{s.sk}</td>
                        <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', textAlign: 'right' }}>{s.dateOverride || s.date ? fd(s.dateOverride || s.date) : '—'}</td>
                        <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem', textAlign: 'right' }}>{s.artisans || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {preview.job.notes && (
              <div style={{ marginTop: 12, padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Notes:</strong> {esc(preview.job.notes)}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
