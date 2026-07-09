import { useState, useEffect } from 'react'
import { productions, prodStages } from '../lib/db'
import { fmt, fd, esc, localDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function CompletedJobs() {
  const { hasPermission } = useAuth()
  const [jobs, setJobs] = useState([])
  const [stagesByJob, setStagesByJob] = useState({})
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editStages, setEditStages] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const all = await productions.getAll()
      const completed = all.filter(p => p.status === 'completed' || p.status === 'done')
      setJobs(completed)
      const sMap = {}
      for (const p of completed) {
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

  function totalCommission(pid) {
    const st = getStages(pid)
    return st.reduce((s, stage) => s + (stage.comm || 0), 0)
  }

  function stageDatesSummary(pid) {
    const st = getStages(pid).filter(s => s.date || s.dateOverride)
    if (!st.length) return '—'
    const dates = st.map(s => {
      const d = s.dateOverride || s.date
      return d ? d.substring(5) : ''
    }).filter(Boolean)
    return dates.join(', ')
  }

  async function handleOpenEdit(job) {
    const st = await prodStages.getByProduction(job.id)
    setEditStages(st.map(s => ({ ...s })))
    setEditing(job)
  }

  function updateEditStage(i, field, val) {
    setEditStages(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  async function saveEdit() {
    if (!editing) return
    try {
      for (const s of editStages) {
        await prodStages.update(s.id, {
          date: s.date,
          dateOverride: s.dateOverride,
          comm: s.comm
        })
      }
      setStagesByJob(prev => ({ ...prev, [editing.id]: editStages }))
      setEditing(null)
    } catch (err) {
      console.error('Save edit error:', err)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete completed job #' + id + '?')) return
    try {
      await prodStages.removeByProduction(id)
      await productions.remove(id)
      setJobs(prev => prev.filter(j => j.id !== id))
      setStagesByJob(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function openPreview(job) {
    const st = await prodStages.getByProduction(job.id)
    setPreview({ job, stages: st || [] })
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">Completed Jobs</div>
        <div className="ps">All completed production jobs</div>
      </div>

      <div className="actb">
        <div className="vlbl">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="empty">No completed jobs</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Frame Type</th>
                <th>Size</th>
                <th>Tier</th>
                <th className="money">Total Commission</th>
                <th>Stage Dates</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 600 }}>#{job.id}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getFrameLabel(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getSize(job))}</td>
                  <td style={{ fontSize: '0.75rem' }}>{esc(getTier(job))}</td>
                  <td className="money">{fmt(totalCommission(job.id))}</td>
                  <td style={{ fontSize: '0.6875rem', color: '#64748b' }}>{stageDatesSummary(job.id)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openPreview(job)} className="h-7 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all cursor-pointer border-0">Preview</button>
                      <button onClick={() => handleOpenEdit(job)} className="h-7 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-all cursor-pointer border-0">Edit</button>
                      {hasPermission('delete_invoices') && (
                        <button onClick={() => handleDelete(job.id)} className="h-7 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-all cursor-pointer border-0">Delete</button>
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
                <div className="lbl">Due Date</div>
                <div style={{ fontSize: '0.875rem' }}>{preview.job.due_date ? fd(preview.job.due_date) : '—'}</div>
              </div>
            </div>
            {preview.stages.length > 0 && (
              <div>
                <div className="lbl" style={{ marginBottom: 4 }}>Stages</div>
                <table className="ft">
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Stage</th>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Date</th>
                      <th className="money" style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Commission</th>
                      <th style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Artisans</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.stages.map((s, i) => {
                      const d = s.dateOverride || s.date
                      return (
                        <tr key={i}>
                          <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{s.sk}</td>
                          <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{d ? fd(d) : '—'}</td>
                          <td className="money" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{fmt(s.comm || 0)}</td>
                          <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{s.artisans || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={'Edit Job #' + editing.id + ' Stages'} onClose={() => setEditing(null)} footer={
          <div className="flex gap-2">
            <button onClick={saveEdit} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Save Changes</button>
            <button onClick={() => setEditing(null)} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Cancel</button>
          </div>
        }>
          <div style={{ padding: '1rem' }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Edit stage dates and commissions</div>
            <table className="ft">
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Stage</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Override</th>
                  <th className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {editStages.map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{s.sk}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <input type="date" className="qi" style={{ width: 120 }} value={s.date || ''} onChange={e => updateEditStage(i, 'date', e.target.value)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <input type="date" className="qi" style={{ width: 120 }} value={s.dateOverride || ''} onChange={e => updateEditStage(i, 'dateOverride', e.target.value)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <input type="number" className="qi" style={{ width: 100 }} value={s.comm || 0} onChange={e => updateEditStage(i, 'comm', +e.target.value || 0)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
