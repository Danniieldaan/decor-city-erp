import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, invoices, receipts } from '../lib/db'
import { fmt, fd, esc, localDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Customers() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [allCust, setAllCust] = useState([])
  const [allInv, setAllInv] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
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
        const [custData, invData] = await Promise.all([
          customers.getAll(),
          invoices.getAll()
        ])
        setAllCust(custData || [])
        setAllInv(invData || [])
      } catch (err) {
        console.error('Customers load error:', err)
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

  const categories = [...new Set(allCust.filter(c => c.category).map(c => c.category))].sort()

  function filtered() {
    let list = allCust
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.mobile && c.mobile.includes(q))
      )
    }
    if (category) {
      list = list.filter(c => c.category === category)
    }
    const today = localDate()
    const month = today.substring(0, 7)
    switch (view) {
      case 'today': {
        const todayCids = new Set(allInv.filter(inv => inv.date === today).map(inv => inv.cid))
        list = list.filter(c => todayCids.has(c.id))
        break
      }
      case 'month': {
        const monthCids = new Set(allInv.filter(inv => inv.date && inv.date.startsWith(month)).map(inv => inv.cid))
        list = list.filter(c => monthCids.has(c.id))
        break
      }
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
    const ids = filtered().map(c => c.id)
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
    if (!confirm('Delete customer?')) return
    try {
      await customers.remove(id)
      setAllCust(prev => prev.filter(c => c.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  async function handleBulkMarkActive() {
    try {
      for (const id of selected) {
        await customers.update(id, { active: true })
      }
      setAllCust(prev => prev.map(c => selected.has(c.id) ? { ...c, active: true } : c))
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk mark active error:', err)
    }
  }

  async function handleBulkMarkInactive() {
    try {
      for (const id of selected) {
        await customers.update(id, { active: false })
      }
      setAllCust(prev => prev.map(c => selected.has(c.id) ? { ...c, active: false } : c))
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk mark inactive error:', err)
    }
  }

  async function handleBulkDelete() {
    if (!hasPermission('delete_customers')) return alert('You do not have permission to delete customers.')
    if (!confirm('Delete ' + selected.size + ' selected customer(s)?')) return
    try {
      for (const id of selected) {
        await customers.remove(id)
      }
      setAllCust(prev => prev.filter(c => !selected.has(c.id)))
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
    }
  }

  async function openPreview(cust) {
    try {
      const custInvs = await invoices.getByCustomer(cust.id)
      const custRcpts = await receipts.getByCustomer(cust.id)
      const totalInvoices = custInvs.length
      const totalPayments = custRcpts.reduce((s, r) => s + (r.amount || 0), 0)
      setPreview({ cust, totalInvoices, totalPayments })
    } catch (err) {
      console.error('Preview error:', err)
    }
  }

  const list = filtered()
  const allSelected = list.length > 0 && list.every(c => selected.has(c.id))

  return (
    <div>
      <div className="ph">
        <div className="pt">Customers</div>
        <div className="ps">Manage all customers</div>
        <div className="ptb">
          <button onClick={() => navigate('/customers/new')} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ Add Customer</button>
        </div>
      </div>

      <div className="actb">
        <input
          className="fi"
          style={{ width: 220, padding: '0.375rem 0.625rem' }}
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="fi"
          style={{ width: 150, padding: '0.375rem 0.625rem' }}
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          className="fi"
          style={{ width: 150, padding: '0.375rem 0.625rem' }}
          value={view}
          onChange={e => setView(e.target.value)}
        >
          <option value="all">All</option>
          <option value="today">Bought Today</option>
          <option value="month">Bought This Month</option>
        </select>
        <div className="sep" />
        {selected.size > 0 && (
          <>
            <button onClick={handleBulkMarkActive} className="h-7 px-3 rounded-lg bg-success hover:bg-success/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
              Mark Active ({selected.size})
            </button>
            <button onClick={handleBulkMarkInactive} className="h-7 px-3 rounded-lg bg-warning hover:bg-warning/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
              Mark Inactive ({selected.size})
            </button>
            {hasPermission('delete_customers') && (
              <button onClick={handleBulkDelete} className="h-7 px-3 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
                Delete ({selected.size})
              </button>
            )}
          </>
        )}
        <div className="vlbl">{list.length} customer{list.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : list.length === 0 ? (
        <div className="empty">No customers found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Name</th>
                <th>Category</th>
                <th className="money">Balance</th>
                <th>Contact Name</th>
                <th>Telephone</th>
                <th>Mobile</th>
                <th>Active</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td>
                    <a onClick={() => navigate('/customers/' + c.id + '/edit')} style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {esc(c.name)}
                    </a>
                  </td>
                  <td>{esc(c.category || '')}</td>
                  <td className={(c.balance || 0) > 0 ? 'money mr' : 'money'}>{fmt(c.balance)}</td>
                  <td>{esc(c.contact_name || '')}</td>
                  <td>{esc(c.phone || '')}</td>
                  <td>{esc(c.mobile || '')}</td>
                  <td>{c.active !== false ? <span className="sp sco">Yes</span> : <span className="sp sdr">No</span>}</td>
                  <td>
                    <div className="ddw">
                      <button
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setDdPos({ top: r.bottom + 4, left: r.left })
                          setOpenDD(openDD === c.id ? null : c.id)
                        }}
                        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer border-0"
                        title="Actions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg>
                      </button>
                      {openDD === c.id && (
                        <div ref={ddRef} className="ddm show" style={{ top: ddPos.top, left: ddPos.left }}>
                          <a onClick={() => { setOpenDD(null); openPreview(c) }}>Quick View</a>
                          <a onClick={() => { setOpenDD(null); navigate('/customers/' + c.id + '/edit') }}>Edit</a>
                          {hasPermission('delete_customers') && (
                            <a onClick={() => { setOpenDD(null); handleDelete(c.id) }} style={{ color: 'var(--color-destructive)' }}>Delete</a>
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
        <Modal title={esc(preview.cust.name)} onClose={() => setPreview(null)} footer={
          <button onClick={() => setPreview(null)} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Close</button>
        }>
          <div style={{ padding: '1rem' }}>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <div className="lbl">Category</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{esc(preview.cust.category || 'N/A')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lbl">Balance</div>
                <div className={(preview.cust.balance || 0) > 0 ? 'money mr' : 'money mg'} style={{ fontSize: '0.875rem', fontWeight: 700 }}>{fmt(preview.cust.balance)}</div>
              </div>
            </div>
            {preview.cust.phone && (
              <div style={{ marginBottom: 8 }}>
                <div className="lbl">Phone</div>
                <div style={{ fontSize: '0.8125rem' }}>{esc(preview.cust.phone)}</div>
              </div>
            )}
            {preview.cust.mobile && (
              <div style={{ marginBottom: 8 }}>
                <div className="lbl">Mobile</div>
                <div style={{ fontSize: '0.8125rem' }}>{esc(preview.cust.mobile)}</div>
              </div>
            )}
            {preview.cust.email && (
              <div style={{ marginBottom: 8 }}>
                <div className="lbl">Email</div>
                <div style={{ fontSize: '0.8125rem' }}>{esc(preview.cust.email)}</div>
              </div>
            )}
            {preview.cust.address && (
              <div style={{ marginBottom: 8 }}>
                <div className="lbl">Address</div>
                <div style={{ fontSize: '0.8125rem' }}>{esc(preview.cust.address)}</div>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
              <div className="trow" style={{ fontSize: '0.875rem' }}>
                <span>Total Invoices</span>
                <span style={{ fontWeight: 700 }}>{preview.totalInvoices}</span>
              </div>
              <div className="trow" style={{ fontSize: '0.875rem' }}>
                <span>Total Payments</span>
                <span className="mg" style={{ fontWeight: 700 }}>{fmt(preview.totalPayments)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
