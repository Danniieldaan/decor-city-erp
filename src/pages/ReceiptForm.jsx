import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, invoices, receipts } from '../lib/db'
import { fmt, fd, esc, localDate, invNum } from '../lib/utils'
import { PAY_METHODS } from '../lib/constants'

export default function ReceiptForm() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [showCustDD, setShowCustDD] = useState(false)
  const [custResults, setCustResults] = useState([])
  const [customersList, setCustomersList] = useState([])
  const [selectedCust, setSelectedCust] = useState(null)
  const [outstandingInvs, setOutstandingInvs] = useState([])
  const [allocations, setAllocations] = useState({})

  const [form, setForm] = useState({
    amount: '',
    method: 'Cash',
    ref: '',
    date: localDate(),
    description: '',
    notes: ''
  })

  useEffect(() => {
    async function load() {
      try {
        const custData = await customers.getAll()
        setCustomersList(custData || [])
      } catch (err) {
        console.error('Form load error:', err)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!custSearch || !showCustDD) {
      setCustResults([])
      return
    }
    const q = custSearch.toLowerCase()
    const filtered = customersList.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
    setCustResults(filtered)
  }, [custSearch, customersList, showCustDD])

  useEffect(() => {
    if (selectedCust) {
      async function loadOutstanding() {
        try {
          const invs = await invoices.getByCustomer(selectedCust.id)
          const unpaid = (invs || []).filter(inv => (inv.balance || 0) > 0)
          setOutstandingInvs(unpaid)
          setAllocations({})
        } catch (err) {
          console.error('Load outstanding error:', err)
        }
      }
      loadOutstanding()
    } else {
      setOutstandingInvs([])
      setAllocations({})
    }
  }, [selectedCust])

  function selectCustomer(cust) {
    setSelectedCust(cust)
    setCustSearch(cust.name)
    setShowCustDD(false)
  }

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateAllocation(invId, value) {
    setAllocations(prev => ({ ...prev, [invId]: Math.max(0, +value || 0) }))
  }

  function autoMatch() {
    const total = +form.amount || 0
    let remaining = total
    const newAlloc = {}
    for (const inv of outstandingInvs) {
      if (remaining <= 0) break
      const alloc = Math.min(inv.balance, remaining)
      newAlloc[inv.id] = alloc
      remaining -= alloc
    }
    setAllocations(newAlloc)
  }

  function fillAll(invId) {
    const inv = outstandingInvs.find(i => i.id === invId)
    if (inv) {
      setAllocations(prev => ({ ...prev, [invId]: inv.balance }))
    }
  }

  const totalAllocated = outstandingInvs.reduce((s, inv) => s + (allocations[inv.id] || 0), 0)
  const receiptAmount = +form.amount || 0

  async function handleSave(action) {
    if (!selectedCust) return alert('Please select a customer.')
    if (!receiptAmount || receiptAmount <= 0) return alert('Enter a valid receipt amount.')
    if (totalAllocated > receiptAmount) return alert('Allocated amount cannot exceed receipt amount.')

    setSaving(true)
    try {
      const receiptData = {
        cid: selectedCust.id,
        amount: receiptAmount,
        method: form.method,
        ref: form.ref || null,
        date: form.date || localDate(),
        description: form.description || null,
        notes: form.notes || null
      }

      const rcpt = await receipts.create(receiptData)

      for (const inv of outstandingInvs) {
        const alloc = allocations[inv.id] || 0
        if (alloc > 0) {
          const newPaid = (inv.paid || 0) + alloc
          const newBalance = (inv.grand_total || 0) - newPaid
          await invoices.update(inv.id, { paid: newPaid, balance: Math.max(0, newBalance) })
        }
      }

      const custInvs = await invoices.getByCustomer(selectedCust.id)
      const totalBal = custInvs.reduce((s, inv) => s + (inv.balance || 0), 0)
      await customers.update(selectedCust.id, { balance: totalBal })

      if (action === 'print') {
        const cust = selectedCust
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(`<html><head><title>Receipt ${rcpt.id}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1e293b}</style></head><body>
            <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">Decor City</h1>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px">Frame Workshop & Art Studio</p>
            <h2 style="font-size:18px;margin-bottom:16px">Payment Receipt</h2>
            <div style="display:flex;justify-content:space-between;margin-bottom:24px">
              <div><strong>Receipt:</strong> ${rcpt.id}<br><strong>Date:</strong> ${fd(form.date)}</div>
              <div style="text-align:right"><strong>Customer:</strong> ${esc(cust.name)}</div>
            </div>
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Amount:</strong> <span style="font-weight:700;font-size:18px">${fmt(receiptAmount)}</span></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Method:</strong> <span>${esc(form.method)}</span></div>
              ${form.ref ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><strong>Reference:</strong> <span>${esc(form.ref)}</span></div>` : ''}
              ${form.description ? `<div style="padding:4px 0"><strong>Description:</strong> ${esc(form.description)}</div>` : ''}
            </div>
            <div style="color:#64748b;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px">Thank you for your patronage!</div>
          </body></html>`)
          w.document.close()
          setTimeout(() => { w.print() }, 500)
        }
        navigate('/receipts')
      } else if (action === 'new') {
        setForm({ amount: '', method: 'Cash', ref: '', date: localDate(), description: '', notes: '' })
        setSelectedCust(null)
        setCustSearch('')
        setOutstandingInvs([])
        setAllocations({})
      } else {
        navigate('/receipts')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save receipt: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">New Receipt</div>
        <div className="ps">Record a new payment receipt</div>
        <div className="ptb">
          <button onClick={() => handleSave('save')} disabled={saving} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">
            {saving ? 'Saving...' : 'Process'}
          </button>
          <button onClick={() => handleSave('new')} disabled={saving} className="h-8 px-4 rounded-xl border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Process & New
          </button>
          <button onClick={() => handleSave('print')} disabled={saving} className="h-8 px-4 rounded-xl border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Process & Print
          </button>
          <button onClick={() => navigate('/receipts')} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Cancel
          </button>
        </div>
      </div>

      <div style={{ padding: '0.75rem' }}>
        <div className="pnl">
          <div className="pnlh">Customer</div>
          <div style={{ padding: '0.75rem' }}>
            <div className="srch">
              <input
                className="fi"
                placeholder="Search customer..."
                value={custSearch}
                onChange={e => { setCustSearch(e.target.value); setShowCustDD(true); setSelectedCust(null) }}
                onFocus={() => setShowCustDD(true)}
              />
              {showCustDD && custSearch && (
                <div className="qcddm" style={{ display: 'block' }}>
                  {custResults.length === 0 ? (
                    <a className="addnew" onClick={() => { setShowCustDD(false); navigate('/customers/new') }}>+ Add new customer</a>
                  ) : (
                    <>
                      {custResults.map(c => (
                        <a key={c.id} onClick={() => selectCustomer(c)}>{esc(c.name)} {c.phone ? '<' + esc(c.phone) + '>' : ''}</a>
                      ))}
                      <a className="addnew" onClick={() => { setShowCustDD(false); navigate('/customers/new') }}>+ Add new customer</a>
                    </>
                  )}
                </div>
              )}
            </div>
            {selectedCust && (
              <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: 8, fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{esc(selectedCust.name)}</div>
                  {selectedCust.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(selectedCust.phone)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lbl">Balance</div>
                  <div className={(selectedCust.balance || 0) > 0 ? 'money mr' : 'money mg'} style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(selectedCust.balance)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pnl" style={{ marginTop: '0.75rem' }}>
          <div className="pnlh">Receipt Details</div>
          <div style={{ padding: '0.75rem' }}>
            <table className="ft">
              <tbody>
                <tr>
                  <td className="lb">Amount</td>
                  <td><input className="qi" type="number" min="0" step="0.01" value={form.amount} onChange={e => handleFormChange('amount', e.target.value)} style={{ fontWeight: 700, fontSize: '0.875rem' }} /></td>
                </tr>
                <tr>
                  <td className="lb">Method</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {PAY_METHODS.map(m => (
                        <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                          <input type="radio" name="method" value={m} checked={form.method === m} onChange={e => handleFormChange('method', e.target.value)} style={{ cursor: 'pointer' }} />
                          {m}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
                {form.method !== 'Cash' && (
                  <tr>
                    <td className="lb">Reference</td>
                    <td><input className="qi" value={form.ref} onChange={e => handleFormChange('ref', e.target.value)} placeholder="Transaction reference" /></td>
                  </tr>
                )}
                <tr>
                  <td className="lb">Date</td>
                  <td><input className="qi" type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="lb">Description</td>
                  <td><input className="qi" value={form.description} onChange={e => handleFormChange('description', e.target.value)} placeholder="Payment description" /></td>
                </tr>
                <tr>
                  <td className="lb">Notes</td>
                  <td><textarea className="fi" style={{ minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => handleFormChange('notes', e.target.value)} placeholder="Internal notes" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {selectedCust && outstandingInvs.length > 0 && (
          <div className="pnl" style={{ marginTop: '0.75rem' }}>
            <div className="pnlh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Outstanding Invoices Allocation</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={autoMatch} className="h-7 px-3 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-all cursor-pointer bg-transparent">Auto-Match</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="ft" style={{ minWidth: 500 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left' }}>Invoice</th>
                    <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Date</th>
                    <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Grand Total</th>
                    <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Balance</th>
                    <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', minWidth: 100 }}>Allocation</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingInvs.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ padding: '0.375rem 0.5rem', fontWeight: 600, fontSize: '0.8125rem' }}>{invNum(inv.id, inv.date)}</td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{fd(inv.date)}</td>
                      <td className="money" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{fmt(inv.grand_total)}</td>
                      <td className="money mr" style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{fmt(inv.balance)}</td>
                      <td style={{ padding: '0.375rem 0.5rem' }}>
                        <input
                          className="qi"
                          type="number"
                          min="0"
                          step="0.01"
                          value={allocations[inv.id] || ''}
                          onChange={e => updateAllocation(inv.id, e.target.value)}
                          style={{ textAlign: 'right', fontWeight: 600 }}
                          placeholder="0.00"
                        />
                      </td>
                      <td style={{ padding: '0.375rem 0.5rem' }}>
                        <button onClick={() => fillAll(inv.id)} className="text-xs text-primary hover:underline cursor-pointer border-0 bg-transparent font-semibold" title="Allocate full balance">Full</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', fontSize: '0.8125rem' }}>
              <span>Total Allocated: <strong className={totalAllocated > 0 ? 'mg' : ''}>{fmt(totalAllocated)}</strong></span>
              <span>Receipt Amount: <strong>{fmt(receiptAmount)}</strong></span>
              {totalAllocated > receiptAmount && (
                <span style={{ color: 'var(--color-destructive)', fontWeight: 600 }}>Over-allocated!</span>
              )}
            </div>
          </div>
        )}

        {selectedCust && outstandingInvs.length === 0 && (
          <div className="pnl" style={{ marginTop: '0.75rem' }}>
            <div className="pnlh">Outstanding Invoices</div>
            <div className="empty">No outstanding invoices for this customer</div>
          </div>
        )}
      </div>
    </div>
  )
}
