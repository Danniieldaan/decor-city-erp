import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customers, invoices, invoiceItems } from '../lib/db'
import { fmt, fd, esc, localDate, nid } from '../lib/utils'
import { FTYPES } from '../lib/constants'

function emptyItem() {
  return { _key: nid('item'), frame_type: '', width: '', height: '', description: '', unit: 'pcs', qty: 1, price: 0, disc: 0, total: 0 }
}

function calcRow(item) {
  const qty = +item.qty || 1
  const price = +item.price || 0
  const disc = +item.disc || 0
  const lineTotal = qty * price
  const discAmt = lineTotal * (disc / 100)
  return { ...item, qty, price, disc, total: Math.round(lineTotal - discAmt) }
}

function calcTotals(items, headerDiscPct) {
  const hd = +headerDiscPct || 0
  const subTotal = items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0)
  const itemDisc = items.reduce((s, it) => {
    const line = (it.qty || 1) * (it.price || 0)
    return s + Math.round(line * ((+it.disc || 0) / 100))
  }, 0)
  const afterItemDisc = subTotal - itemDisc
  const headerDisc = Math.round(afterItemDisc * (hd / 100))
  const grandTotal = afterItemDisc - headerDisc
  return { sub_total: subTotal, item_disc: itemDisc, header_disc: headerDisc, grand_total: grandTotal }
}

async function updateCustBal(cid) {
  const custInvs = await invoices.getByCustomer(cid)
  const totalBal = custInvs.reduce((s, inv) => s + (inv.balance || 0), 0)
  await customers.update(cid, { balance: totalBal })
}

export default function InvoiceForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [saving, setSaving] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [showCustDD, setShowCustDD] = useState(false)
  const [custResults, setCustResults] = useState([])
  const [selectedCust, setSelectedCust] = useState(null)
  const [customersList, setCustomersList] = useState([])

  const [form, setForm] = useState({
    doc_no: '', ref: '', rep: '', date: localDate(), expiry: '',
    discount: '', delivery: '', terms: '', message: ''
  })

  const [items, setItems] = useState([emptyItem()])

  useEffect(() => {
    async function load() {
      try {
        const custData = await customers.getAll()
        setCustomersList(custData || [])
        if (isEdit && id) {
          const inv = await invoices.getById(id)
          if (inv) {
            setForm({
              doc_no: inv.doc_no || '',
              ref: inv.ref || '',
              rep: inv.rep || '',
              date: inv.date || localDate(),
              expiry: inv.expiry || '',
              discount: inv.discount || '',
              delivery: inv.delivery || '',
              terms: inv.terms || '',
              message: inv.message || ''
            })
            if (inv.cid) {
              const cust = await customers.getById(inv.cid)
              if (cust) {
                setSelectedCust(cust)
                setCustSearch(cust.name)
              }
            }
            const invItems = await invoiceItems.getByInvoice(id)
            if (invItems && invItems.length > 0) {
              setItems(invItems.map(it => ({ ...it, _key: nid('item') })))
            } else {
              setItems([emptyItem()])
            }
          }
        }
      } catch (err) {
        console.error('Form load error:', err)
      }
    }
    load()
  }, [id, isEdit])

  useEffect(() => {
    if (!custSearch || !showCustDD) {
      setCustResults([])
      return
    }
    const q = custSearch.toLowerCase()
    const filtered = customersList.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
    setCustResults(filtered)
  }, [custSearch, customersList, showCustDD])

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function selectCustomer(cust) {
    setSelectedCust(cust)
    setCustSearch(cust.name)
    setShowCustDD(false)
  }

  function updateItem(idx, field, value) {
    setItems(prev => {
      const next = prev.map((it, i) => i === idx ? { ...it, [field]: value } : it)
      next[idx] = calcRow(next[idx])
      return next
    })
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(idx) {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const calcItems = items.map(calcRow)
  const totals = calcTotals(calcItems, form.discount)

  async function handleSave(saveAndNew) {
    if (!selectedCust) return alert('Please select a customer.')
    if (calcItems.length === 0) return alert('Add at least one item.')
    setSaving(true)
    try {
      const invoiceData = {
        cid: selectedCust.id,
        doc_no: form.doc_no || null,
        ref: form.ref || null,
        rep: form.rep || null,
        date: form.date || localDate(),
        expiry: form.expiry || null,
        discount: +form.discount || 0,
        delivery: form.delivery || null,
        terms: form.terms || null,
        message: form.message || null,
        sub_total: totals.sub_total,
        item_disc: totals.item_disc,
        header_disc: totals.header_disc,
        grand_total: totals.grand_total,
        status: 'Issued'
      }

      let inv
      if (isEdit) {
        const existing = await invoices.getById(id)
        invoiceData.paid = existing ? existing.paid || 0 : 0
        invoiceData.balance = totals.grand_total - (invoiceData.paid || 0)
        inv = await invoices.update(id, invoiceData)
      } else {
        invoiceData.paid = 0
        invoiceData.balance = totals.grand_total
        inv = await invoices.create(invoiceData)
      }

      const saveItems = calcItems.map(it => ({
        frame_type: it.frame_type || null,
        width: it.width ? +it.width : null,
        height: it.height ? +it.height : null,
        description: it.description || null,
        unit: it.unit || 'pcs',
        qty: it.qty || 1,
        price: it.price || 0,
        disc: +it.disc || 0,
        total: it.total || 0
      }))
      await invoiceItems.bulkSave(inv.id, saveItems)
      await updateCustBal(selectedCust.id)

      if (saveAndNew) {
        setForm({ doc_no: '', ref: '', rep: '', date: localDate(), expiry: '', discount: '', delivery: '', terms: '', message: '' })
        setItems([emptyItem()])
        setSelectedCust(null)
        setCustSearch('')
      } else {
        navigate('/invoices')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save invoice: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    if (!selectedCust) return alert('Select a customer first.')
    const w = window.open('', '_blank')
    if (!w) return alert('Please allow popups for printing.')
    const rows = calcItems.map(it =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.frame_type || 'N/A')}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${it.qty || 1}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${fmt(it.price || 0)}</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:right">${fmt(it.total || 0)}</td></tr>`
    ).join('')
    w.document.write(`<html><head><title>Invoice Preview</title><style>body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#1e293b}table{width:100%;border-collapse:collapse}h2{font-size:18px;font-weight:700;margin:0 0 4px}</style></head><body>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 4px">Decor City</h1>
      <p style="color:#64748b;font-size:14px;margin:0 0 24px">Frame Workshop & Art Studio</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px">
        <div><strong>Customer:</strong> ${esc(selectedCust.name)}<br>${esc(selectedCust.address || '')}<br>${esc(selectedCust.phone || '')}</div>
        <div style="text-align:right"><strong>Date:</strong> ${fd(form.date)}${form.expiry ? '<br><strong>Expiry:</strong> ' + fd(form.expiry) : ''}</div>
      </div>
      <table><thead><tr style="background:#f1f5f9"><th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase">Item</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Qty</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Price</th><th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="margin-top:16px;border-top:2px solid #e2e8f0;padding-top:8px"><div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>Subtotal</span><span>${fmt(totals.sub_total)}</span></div><div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>Item Discounts</span><span>${fmt(totals.item_disc)}</span></div>${totals.header_disc > 0 ? '<div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>Header Discount</span><span>' + fmt(totals.header_disc) + '</span></div>' : ''}<div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;padding:4px 0;border-top:2px solid #e2e8f0;margin-top:4px"><span>Grand Total</span><span>${fmt(totals.grand_total)}</span></div></div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">{isEdit ? 'Edit Invoice' : 'Process Invoice'}</div>
        <div className="ps">{isEdit ? 'Update invoice details' : 'Create a new invoice'}</div>
        <div className="ptb">
          <button onClick={() => handleSave(false)} disabled={saving} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="h-8 px-4 rounded-xl border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Save & New
          </button>
          <button onClick={handlePrint} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Print
          </button>
        </div>
      </div>

      <div style={{ padding: '0.75rem' }}>
        {/* Customer Details */}
        <div className="pnl">
          <div className="pnlh">Customer Details</div>
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
              <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: '0.8125rem' }}>
                <div style={{ fontWeight: 600 }}>{esc(selectedCust.name)}</div>
                {selectedCust.phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(selectedCust.phone)}</div>}
                {selectedCust.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(selectedCust.email)}</div>}
                {selectedCust.address && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{esc(selectedCust.address)}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Details & Delivery Address */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div className="pnl" style={{ margin: 0 }}>
            <div className="pnlh">Invoice Details</div>
            <div style={{ padding: '0.75rem' }}>
              <table className="ft">
                <tbody>
                  <tr>
                    <td className="lb">Doc#</td>
                    <td><input className="qi" value={form.doc_no} onChange={e => handleFormChange('doc_no', e.target.value)} placeholder="Auto" /></td>
                  </tr>
                  <tr>
                    <td className="lb">Ref</td>
                    <td><input className="qi" value={form.ref} onChange={e => handleFormChange('ref', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">Rep</td>
                    <td><input className="qi" value={form.rep} onChange={e => handleFormChange('rep', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">Date</td>
                    <td><input className="qi" type="date" value={form.date} onChange={e => handleFormChange('date', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">Expiry</td>
                    <td><input className="qi" type="date" value={form.expiry} onChange={e => handleFormChange('expiry', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">Disc%</td>
                    <td><input className="qi" type="number" min="0" max="100" step="0.01" value={form.discount} onChange={e => handleFormChange('discount', e.target.value)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pnl" style={{ margin: 0 }}>
            <div className="pnlh">Delivery Address</div>
            <div style={{ padding: '0.75rem' }}>
              <textarea
                className="fi"
                style={{ minHeight: 140, resize: 'vertical' }}
                value={form.delivery}
                onChange={e => handleFormChange('delivery', e.target.value)}
                placeholder="Delivery address..."
              />
            </div>
          </div>

          <div className="pnl" style={{ margin: 0 }}>
            <div className="pnlh">Terms & Message</div>
            <div style={{ padding: '0.75rem' }}>
              <textarea
                className="fi"
                style={{ minHeight: 64, resize: 'vertical', marginBottom: 8 }}
                value={form.terms}
                onChange={e => handleFormChange('terms', e.target.value)}
                placeholder="Terms and conditions..."
              />
              <textarea
                className="fi"
                style={{ minHeight: 64, resize: 'vertical' }}
                value={form.message}
                onChange={e => handleFormChange('message', e.target.value)}
                placeholder="Additional message..."
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="pnl" style={{ marginTop: '0.75rem' }}>
          <div className="pnlh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Line Items</span>
            <button onClick={addItem} className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">+ Add Row</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ft" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', minWidth: 140 }}>Frame Type</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', width: 60 }}>W</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', width: 60 }}>H</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', minWidth: 120 }}>Description</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'left', width: 50 }}>Unit</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: 50 }}>Qty</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: 80 }}>Price</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: 50 }}>Disc%</th>
                  <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b', textAlign: 'right', width: 80 }}>Total</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {calcItems.map((it, idx) => (
                  <tr key={it._key}>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <select className="qi" value={it.frame_type} onChange={e => updateItem(idx, 'frame_type', e.target.value)}>
                        <option value="">Select...</option>
                        {FTYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" type="number" min="0" step="0.1" value={it.width} onChange={e => updateItem(idx, 'width', e.target.value)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" type="number" min="0" step="0.1" value={it.height} onChange={e => updateItem(idx, 'height', e.target.value)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" value={it.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" type="number" min="1" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} style={{ textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" type="number" min="0" step="0.01" value={it.price} onChange={e => updateItem(idx, 'price', e.target.value)} style={{ textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <input className="qi" type="number" min="0" max="100" step="0.01" value={it.disc} onChange={e => updateItem(idx, 'disc', e.target.value)} style={{ textAlign: 'right' }} />
                    </td>
                    <td className="money" style={{ padding: '0.25rem 0.375rem', fontWeight: 600, fontSize: '0.8125rem' }}>{fmt(it.total)}</td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      <button onClick={() => removeItem(idx)} className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-destructive transition-colors cursor-pointer border-0" title="Remove">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Panel */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <div style={{ width: 300, border: '1px solid var(--color-border)', borderRadius: 'var(--default-border-radius)', background: '#fff', padding: '0.75rem' }}>
            <div className="trow"><span>Subtotal</span><span>{fmt(totals.sub_total)}</span></div>
            <div className="trow"><span>Item Discounts</span><span className="mr">{fmt(totals.item_disc)}</span></div>
            {totals.header_disc > 0 && (
              <div className="trow"><span>Header Discount ({form.discount || 0}%)</span><span className="mr">{fmt(totals.header_disc)}</span></div>
            )}
            <div className="trow grand"><span>Grand Total</span><span>{fmt(totals.grand_total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
