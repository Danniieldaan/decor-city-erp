import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, invoices, invoiceItems, receipts } from '../lib/db'
import { fmt, fd, invNum, sc, esc, localDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Invoices() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [allInv, setAllInv] = useState([])
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
        const [invData, custData] = await Promise.all([
          invoices.getAll(),
          customers.getAll()
        ])
        setAllInv(invData || [])
        setAllCust(custData || [])
      } catch (err) {
        console.error('Invoices load error:', err)
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
    let list = allInv
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(inv => {
        const name = custName(inv.cid).toLowerCase()
        return name.includes(q) || String(inv.id).includes(q)
      })
    }
    const today = localDate()
    const month = today.substring(0, 7)
    switch (view) {
      case 'today':
        list = list.filter(inv => inv.date === today)
        break
      case 'month':
        list = list.filter(inv => inv.date && inv.date.startsWith(month))
        break
      case 'completed':
        list = list.filter(inv => inv.status === 'Completed')
        break
      case 'invoiced':
        list = list.filter(inv => inv.status === 'Issued')
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
    const ids = filtered().map(inv => inv.id)
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
    if (!confirm('Delete invoice #' + id + '?')) return
    try {
      await invoiceItems.removeByInvoice(id)
      await invoices.remove(id)
      setAllInv(prev => prev.filter(inv => inv.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function handleBulkDelete() {
    if (!hasPermission('delete_invoices')) return alert('You do not have permission to delete invoices.')
    if (!confirm('Delete ' + selected.size + ' selected invoice(s)?')) return
    try {
      for (const id of selected) {
        await invoiceItems.removeByInvoice(id)
        await invoices.remove(id)
      }
      setAllInv(prev => prev.filter(inv => !selected.has(inv.id)))
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
    }
  }

  async function openPreview(inv) {
    const [items, cust] = await Promise.all([
      invoiceItems.getByInvoice(inv.id),
      customers.getById(inv.cid)
    ])
    setPreview({ inv, items: items || [], cust })
  }

  async function handlePrint(inv) {
    const w = window.open('', '_blank')
    if (!w) return alert('Please allow popups for printing.')
    const cust = allCust.find(c => c.id === inv.cid)
    const printItems = await invoiceItems.getByInvoice(inv.id)
    const rows = (printItems || []).map(it =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.frame_type || '')}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${it.qty || 1}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${fmt(it.price || 0)}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${fmt(it.total || 0)}</td></tr>`
    ).join('')
    w.document.write(`<html><head><title>Invoice ${invNum(inv.id, inv.date)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1e293b}table{width:100%;border-collapse:collapse}</style></head><body>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">Decor City</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px">Frame Workshop & Art Studio</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px">
        <div><strong>Invoice:</strong> ${esc(invNum(inv.id, inv.date))}<br><strong>Date:</strong> ${fd(inv.date)}</div>
        <div style="text-align:right"><strong>Customer:</strong> ${esc(cust ? cust.name : '')}<br>${cust ? esc(cust.address || '') : ''}</div>
      </div>
      <table><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase">Item</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Qty</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Price</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:16px;border-top:2px solid #e2e8f0;padding-top:8px;text-align:right;font-weight:700;font-size:18px">Grand Total: ${fmt(inv.grand_total || 0)}</div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  const list = filtered()
  const allSelected = list.length > 0 && list.every(inv => selected.has(inv.id))

  return (
    <div>
      <div className="ph">
        <div className="pt">Invoices</div>
        <div className="ps">Manage all invoices</div>
        <div className="ptb">
          <button onClick={() => navigate('/invoices/new')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ New Invoice</button>
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
          <option value="completed">Completed</option>
          <option value="invoiced">Invoiced</option>
        </select>
        <div className="sep" />
        {selected.size > 0 && hasPermission('delete_invoices') && (
          <button onClick={handleBulkDelete} className="h-7 px-3 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
            Delete ({selected.size})
          </button>
        )}
        <div className="vlbl">{list.length} invoice{list.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : list.length === 0 ? (
        <div className="empty">No invoices found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>#</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th className="money">Total</th>
                <th className="money">Discount</th>
                <th className="money">Grand Total</th>
                <th className="money">Paid</th>
                <th className="money">Balance</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(inv => (
                <tr key={inv.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{invNum(inv.id, inv.date)}</td>
                  <td>{esc(custName(inv.cid))}</td>
                  <td>{fd(inv.date)}</td>
                  <td>{inv.item_count || '-'}</td>
                  <td className="money">{fmt(inv.sub_total)}</td>
                  <td className="money">{fmt((inv.item_disc || 0) + (inv.header_disc || 0))}</td>
                  <td className="money" style={{ fontWeight: 700 }}>{fmt(inv.grand_total)}</td>
                  <td className="money mg">{fmt(inv.paid || 0)}</td>
                  <td className={(inv.balance || 0) > 0 ? 'money mr' : 'money'}>{fmt(inv.balance || 0)}</td>
                  <td><span className={'sp ' + sc(inv.status)}>{inv.status || 'Draft'}</span></td>
                  <td>
                    <div className="ddw">
                      <button
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setDdPos({ top: r.bottom + 4, left: r.left })
                          setOpenDD(openDD === inv.id ? null : inv.id)
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer border-0"
                        title="Actions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                      </button>
                      {openDD === inv.id && (
                        <div ref={ddRef} className="ddm show" style={{ top: ddPos.top, left: ddPos.left }}>
                          <a onClick={() => { setOpenDD(null); openPreview(inv) }}>Preview</a>
                          <a onClick={() => { setOpenDD(null); handlePrint(inv) }}>Print</a>
                          <a onClick={() => { setOpenDD(null); window.location.href = 'mailto:?subject=Invoice%20' + encodeURIComponent(invNum(inv.id, inv.date)) + '&body=Please%20find%20attached%20invoice%20' + encodeURIComponent(invNum(inv.id, inv.date)) }}>Email</a>
                          <a onClick={() => { setOpenDD(null); navigate('/invoices/' + inv.id + '/edit') }}>Edit</a>
                          {hasPermission('delete_invoices') && (
                            <a onClick={() => { setOpenDD(null); handleDelete(inv.id) }} style={{ color: 'var(--color-destructive)' }}>Delete</a>
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
        <Modal title={'Invoice ' + invNum(preview.inv.id, preview.inv.date)} onClose={() => setPreview(null)} footer={
          <div className="flex gap-2">
            <button onClick={() => { handlePrint(preview.inv); setPreview(null) }} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Print</button>
            <button onClick={() => setPreview(null)} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Close</button>
          </div>
        }>
          <div style={{ padding: '1rem' }}>
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="lbl">Customer</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{esc(preview.cust ? preview.cust.name : '')}</div>
                {preview.cust && preview.cust.address && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(preview.cust.address)}</div>}
                {preview.cust && preview.cust.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(preview.cust.phone)}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Date</div>
                <div style={{ fontSize: '0.875rem' }}>{fd(preview.inv.date)}</div>
                {preview.inv.expiry && <><div className="lbl" style={{ marginTop: 4 }}>Expiry</div><div style={{ fontSize: '0.875rem' }}>{fd(preview.inv.expiry)}</div></>}
              </div>
            </div>
            {preview.inv.ref && <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>Ref: {esc(preview.inv.ref)}</div>}
            {preview.inv.rep && <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>Rep: {esc(preview.inv.rep)}</div>}
            {preview.items.length > 0 ? (
              <table className="ft" style={{ marginBottom: 12 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Item</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Qty</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Price</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Disc%</th>
                    <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>
                        {esc(it.frame_type || '')}
                        {(it.width || it.height) && <span style={{ color: '#64748b', fontSize: '0.6875rem' }}> ({it.width || '-'}x{it.height || '-'})</span>}
                      </td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{it.qty || 1}</td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{fmt(it.price || 0)}</td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{it.disc || 0}%</td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>{fmt(it.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">No items</div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 8 }}>
              <div className="trow"><span>Subtotal</span><span>{fmt(preview.inv.sub_total || 0)}</span></div>
              <div className="trow"><span>Item Discounts</span><span className="mr">{fmt(preview.inv.item_disc || 0)}</span></div>
              {preview.inv.header_disc > 0 && <div className="trow"><span>Header Discount</span><span className="mr">{fmt(preview.inv.header_disc || 0)}</span></div>}
              <div className="trow grand"><span>Grand Total</span><span>{fmt(preview.inv.grand_total || 0)}</span></div>
              <div className="trow"><span>Paid</span><span className="mg">{fmt(preview.inv.paid || 0)}</span></div>
              <div className="trow"><span>Balance</span><span className={(preview.inv.balance || 0) > 0 ? 'mr' : 'mg'}>{fmt(preview.inv.balance || 0)}</span></div>
            </div>
            {preview.inv.terms && (
              <div style={{ marginTop: 12, padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Terms:</strong> {esc(preview.inv.terms)}
              </div>
            )}
            {preview.inv.message && (
              <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Message:</strong> {esc(preview.inv.message)}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
