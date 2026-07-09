import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, receipts, invoices } from '../lib/db'
import { fmt, fd, rcptNum, invNum, esc, localDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Receipts() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [allRcpts, setAllRcpts] = useState([])
  const [allCust, setAllCust] = useState([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState('all')
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [openDD, setOpenDD] = useState(null)
  const [ddPos, setDdPos] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(true)
  const ddRef = useRef(null)

  useEffect(() => {
    async function load() {
      try {
        const [rcptData, custData] = await Promise.all([
          receipts.getAll(),
          customers.getAll()
        ])
        setAllRcpts(rcptData || [])
        setAllCust(custData || [])
      } catch (err) {
        console.error('Receipts load error:', err)
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

  function custName(id) {
    const c = allCust.find(x => x.id === id)
    return c ? c.name : 'Unknown'
  }

  function filtered() {
    let list = allRcpts
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(r => custName(r.cid).toLowerCase().includes(q))
    }
    const today = localDate()
    const month = today.substring(0, 7)
    switch (view) {
      case 'today':
        list = list.filter(r => r.date === today)
        break
      case 'month':
        list = list.filter(r => r.date && r.date.startsWith(month))
        break
      case 'Cash':
      case 'Bank Transfer':
      case 'POS':
        list = list.filter(r => r.method === view)
        break
    }
    return list
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
    const ids = filtered().map(r => r.id)
    setSelected(prev => {
      const allSelected = ids.every(id => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      }
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  async function handleDelete(id) {
    if (!hasPermission('delete_receipts')) return alert('You do not have permission to delete receipts.')
    if (!confirm('Delete receipt ' + rcptNum(id) + '?')) return
    try {
      await receipts.remove(id)
      setAllRcpts(prev => prev.filter(r => r.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function openPreview(rcpt) {
    try {
      const cust = await customers.getById(rcpt.cid)
      const inv = rcpt.qid ? await invoices.getById(rcpt.qid) : null
      setPreview({ rcpt, cust, inv })
    } catch (err) {
      console.error('Preview error:', err)
    }
  }

  function handlePrint(rcpt) {
    const cust = allCust.find(c => c.id === rcpt.cid)
    const w = window.open('', '_blank')
    if (!w) return alert('Please allow popups for printing.')
    w.document.write(`<html><head><title>Receipt ${rcptNum(rcpt.id)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1e293b}</style></head><body>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">Decor City</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px">Frame Workshop & Art Studio</p>
      <h2 style="font-size:18px;margin-bottom:16px">Payment Receipt</h2>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px">
        <div><strong>Receipt:</strong> ${rcptNum(rcpt.id)}<br><strong>Date:</strong> ${fd(rcpt.date)}</div>
        <div style="text-align:right"><strong>Customer:</strong> ${esc(cust ? cust.name : '')}</div>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Amount:</strong> <span style="font-weight:700;font-size:18px">${fmt(rcpt.amount || 0)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Method:</strong> <span>${esc(rcpt.method || '')}</span></div>
        ${rcpt.ref ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Reference:</strong> <span>${esc(rcpt.ref)}</span></div>` : ''}
        ${rcpt.description ? `<div style="padding:4px 0"><strong>Description:</strong> ${esc(rcpt.description)}</div>` : ''}
      </div>
      <div style="color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px">Thank you for your patronage!</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  const list = filtered()
  const allSelected = list.length > 0 && list.every(r => selected.has(r.id))

  return (
    <div>
      <div className="ph">
        <div className="pt">Receipts</div>
        <div className="ps">Manage all receipts</div>
        <div className="ptb">
          <button onClick={() => navigate('/receipts/new')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ New Receipt</button>
        </div>
      </div>

      <div className="actb">
        <input
          className="fi"
          style={{ width: 220, padding: '0.375rem 0.625rem' }}
          placeholder="Search customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="fi"
          style={{ width: 150, padding: '0.375rem 0.625rem' }}
          value={view}
          onChange={e => setView(e.target.value)}
        >
          <option value="all">All</option>
          <option value="today">Today</option>
          <option value="month">This Month</option>
          <option value="Cash">Cash</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="POS">POS</option>
        </select>
        <div className="sep" />
        <div className="vlbl">{list.length} receipt{list.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : list.length === 0 ? (
        <div className="empty">No receipts found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Receipt #</th>
                <th>Customer</th>
                <th>Invoice #</th>
                <th className="money">Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Reference</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{rcptNum(r.id)}</td>
                  <td>{esc(custName(r.cid))}</td>
                  <td>{r.qid ? invNum(r.qid, r.date) : '-'}</td>
                  <td className="money mg">{fmt(r.amount)}</td>
                  <td>{esc(r.method || '')}</td>
                  <td>{fd(r.date)}</td>
                  <td>{esc(r.ref || '')}</td>
                  <td>
                    <div className="ddw">
                      <button
                        onClick={e => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setDdPos({ top: rect.bottom + 4, left: rect.left })
                          setOpenDD(openDD === r.id ? null : r.id)
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer border-0"
                        title="Actions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                      </button>
                      {openDD === r.id && (
                        <div ref={ddRef} className="ddm show" style={{ top: ddPos.top, left: ddPos.left }}>
                          <a onClick={() => { setOpenDD(null); openPreview(r) }}>Preview</a>
                          <a onClick={() => { setOpenDD(null); handlePrint(r) }}>Print</a>
                          <a onClick={() => { setOpenDD(null); window.location.href = 'mailto:?subject=Receipt%20' + encodeURIComponent(rcptNum(r.id)) + '&body=Please%20find%20attached%20receipt%20' + encodeURIComponent(rcptNum(r.id)) }}>Email</a>
                          <a onClick={() => { setOpenDD(null); alert('Edit receipt coming soon!') }}>Edit</a>
                          {hasPermission('delete_receipts') && (
                            <a onClick={() => { setOpenDD(null); handleDelete(r.id) }} style={{ color: 'var(--color-destructive)' }}>Delete</a>
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
        <Modal title={'Receipt ' + rcptNum(preview.rcpt.id)} onClose={() => setPreview(null)} footer={
          <div className="flex gap-2">
            <button onClick={() => { handlePrint(preview.rcpt); setPreview(null) }} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Print</button>
            <button onClick={() => setPreview(null)} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Close</button>
          </div>
        }>
          <div style={{ padding: '1rem' }}>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="lbl">Customer</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{esc(preview.cust ? preview.cust.name : '')}</div>
                {preview.cust && preview.cust.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(preview.cust.phone)}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Date</div>
                <div style={{ fontSize: '0.875rem' }}>{fd(preview.rcpt.date)}</div>
              </div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: 12 }}>
              <div className="trow" style={{ fontSize: '0.875rem' }}>
                <span>Amount</span>
                <span className="mg" style={{ fontWeight: 700, fontSize: '1.125rem' }}>{fmt(preview.rcpt.amount)}</span>
              </div>
              <div className="trow">
                <span>Method</span>
                <span>{esc(preview.rcpt.method || '')}</span>
              </div>
              {preview.rcpt.ref && (
                <div className="trow">
                  <span>Reference</span>
                  <span>{esc(preview.rcpt.ref)}</span>
                </div>
              )}
              {preview.inv && (
                <div className="trow">
                  <span>Invoice</span>
                  <span style={{ fontWeight: 600 }}>{invNum(preview.inv.id, preview.inv.date)}</span>
                </div>
              )}
            </div>
            {preview.rcpt.description && (
              <div style={{ padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Description:</strong> {esc(preview.rcpt.description)}
              </div>
            )}
            {preview.rcpt.notes && (
              <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Notes:</strong> {esc(preview.rcpt.notes)}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
