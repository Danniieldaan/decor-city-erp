import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productions, prodStages } from '../lib/db'
import { fmt, fd, esc, nid, localDate } from '../lib/utils'
import { FTYPES, STAGES_MAP, SL, PRIORITIES, TIERS } from '../lib/constants'

const DEFAULT_COMM = 0

function stagesForFrames(frames) {
  const keysSet = new Set()
  for (const f of frames) {
    const s = STAGES_MAP[f.frame_type]
    if (s) s.forEach(k => keysSet.add(k))
  }
  return [...keysSet]
}

function generateStages(frameTypes, comm) {
  const keys = new Set()
  for (const ft of frameTypes) {
    const s = STAGES_MAP[ft]
    if (s) s.forEach(k => keys.add(k))
  }
  return [...keys].map((sk, i) => ({
    sk,
    artisans: '',
    comm: comm || DEFAULT_COMM,
    date: null,
    dateOverride: null,
    idx: i
  }))
}

export default function ProductionForm() {
  const navigate = useNavigate()
  const [prodId, setProdId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('normal')
  const [notes, setNotes] = useState('')
  const [frames, setFrames] = useState([
    { frame_type: 'Single Frame', width: '', height: '', description: '', unit: 'pcs', qty: 1 }
  ])
  const [defaultComm, setDefaultComm] = useState(DEFAULT_COMM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProdId('PROD-' + Date.now())
  }, [])

  function addRow() {
    setFrames(prev => [...prev, { frame_type: 'Single Frame', width: '', height: '', description: '', unit: 'pcs', qty: 1 }])
  }

  function removeRow(i) {
    if (frames.length <= 1) return
    setFrames(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateFrame(i, field, val) {
    setFrames(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }

  const previewStages = stagesForFrames(frames)

  async function handleSave() {
    if (!customerName.trim()) return alert('Customer name is required')
    if (frames.length === 0) return alert('At least one frame item is required')
    setSaving(true)
    try {
      const stageDefs = generateStages(
        frames.map(f => f.frame_type),
        defaultComm
      )
      const prodRec = {
        status: 'active',
        customer_name: customerName.trim(),
        due_date: dueDate || null,
        priority,
        notes,
        frames: frames.map(f => ({
          ...f,
          width: f.width ? +f.width : null,
          height: f.height ? +f.height : null,
          qty: +f.qty || 1
        })),
        created_at: localDate()
      }
      const prod = await productions.create(prodRec)
      if (stageDefs.length) {
        await prodStages.bulkSave(prod.id, stageDefs)
      }
      navigate('/production')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to create production job')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">New Production Job</div>
        <div className="ps">Create a new production job</div>
        <div className="ptb">
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98] disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Job'}
          </button>
          <button onClick={() => navigate('/production')} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">
            Cancel
          </button>
        </div>
      </div>

      <div className="pnl">
        <div className="pnlh">Job Details</div>
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="lbl">Production ID</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 0' }}>{prodId}</div>
            </div>
            <div>
              <div className="lbl">Customer Name</div>
              <input className="fi" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div className="lbl">Due Date</div>
              <input type="date" className="fi" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <div className="lbl">Priority</div>
              <select className="fi" value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="lbl">Default Commission per Stage (&#x20a6;)</div>
            <input type="number" className="fi" style={{ width: 200 }} value={defaultComm} onChange={e => setDefaultComm(+e.target.value || 0)} />
          </div>
        </div>
      </div>

      <div className="pnl">
        <div className="pnlh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Frame Items</span>
          <button onClick={addRow} className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">+ Add Row</button>
        </div>
        <div style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table className="ft">
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Frame Type</th>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Width</th>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Height</th>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Description</th>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Unit</th>
                <th className="lb" style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Qty</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {frames.map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <select className="qi" value={f.frame_type} onChange={e => updateFrame(i, 'frame_type', e.target.value)}>
                      {FTYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <input className="qi" type="number" style={{ width: 70 }} value={f.width} onChange={e => updateFrame(i, 'width', e.target.value)} placeholder="mm" />
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <input className="qi" type="number" style={{ width: 70 }} value={f.height} onChange={e => updateFrame(i, 'height', e.target.value)} placeholder="mm" />
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <input className="qi" value={f.description} onChange={e => updateFrame(i, 'description', e.target.value)} placeholder="Optional" />
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <select className="qi" value={f.unit} onChange={e => updateFrame(i, 'unit', e.target.value)}>
                      <option value="pcs">pcs</option>
                      <option value="set">set</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    <input className="qi" type="number" style={{ width: 60 }} value={f.qty} onChange={e => updateFrame(i, 'qty', e.target.value)} min="1" />
                  </td>
                  <td style={{ padding: '0.25rem 0.375rem' }}>
                    {frames.length > 1 && (
                      <button onClick={() => removeRow(i)} className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors cursor-pointer border-0 text-xs font-bold">&times;</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pnl">
        <div className="pnlh">Preview: Stages Breakdown</div>
        <div style={{ padding: '0.75rem' }}>
          {previewStages.length === 0 ? (
            <div className="empty">No stages generated</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {previewStages.map((sk, i) => (
                <span key={sk} className="sp sco" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {i + 1}. {SL[sk] || sk}
                </span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b' }}>
            {frames.map((f, i) => (
              <div key={i}>
                <strong>{f.frame_type}</strong>: {(STAGES_MAP[f.frame_type] || []).join(' \u2192 ')}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pnl">
        <div className="pnlh">Notes</div>
        <div style={{ padding: '0.75rem' }}>
          <textarea
            className="fi"
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes about this production job..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  )
}
