import { useState, useEffect } from 'react'
import { customers, invoices, receipts } from '../../lib/db'
import { fmt, fd, invNum, esc } from '../../lib/utils'

export default function Transactions() {
  const [custList, setCustList] = useState([])
  const [invList, setInvList] = useState([])
  const [rcptList, setRcptList] = useState([])
  const [cid, setCid] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const custData = await customers.getAll()
        setCustList(custData || [])
      } catch (err) {
        console.error('Transactions load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!cid) {
      setInvList([])
      setRcptList([])
      return
    }
    async function loadTransactions() {
      try {
        const [invData, rcptData] = await Promise.all([
          invoices.getByCustomer(cid),
          receipts.getByCustomer(cid)
        ])
        setInvList(invData || [])
        setRcptList(rcptData || [])
      } catch (err) {
        console.error('Load transactions error:', err)
      }
    }
    loadTransactions()
  }, [cid])

  const transactions = []
  invList.forEach(inv => {
    transactions.push({
      date: inv.date || '',
      description: 'Invoice ' + invNum(inv.id, inv.date),
      debit: inv.grand_total || 0,
      credit: 0,
      ts: (inv.date || '') + 'T00:00:00'
    })
  })
  rcptList.forEach(r => {
    transactions.push({
      date: r.date || '',
      description: 'Payment - ' + (r.method || '') + (r.ref ? ' (' + r.ref + ')' : ''),
      debit: 0,
      credit: r.amount || 0,
      ts: (r.date || '') + 'T23:59:59'
    })
  })
  transactions.sort((a, b) => a.ts.localeCompare(b.ts))

  let balance = 0
  const rows = transactions.map(t => {
    balance += t.debit - t.credit
    return { ...t, balance }
  })

  const totalDebit = transactions.reduce((s, t) => s + t.debit, 0)
  const totalCredit = transactions.reduce((s, t) => s + t.credit, 0)

  return (
    <div>
      <div className="ph">
        <div className="pt">Customer Transactions</div>
        <div className="ps">View customer debit and credit transactions</div>
      </div>

      <div className="actb">
        <select
          className="fi"
          style={{ width: 280, padding: '0.375rem 0.625rem' }}
          value={cid}
          onChange={e => setCid(e.target.value)}
        >
          <option value="">Select a customer...</option>
          {custList.map(c => (
            <option key={c.id} value={c.id}>{esc(c.name)}</option>
          ))}
        </select>
        {cid && <div className="vlbl">{rows.length} transaction{rows.length !== 1 ? 's' : ''}</div>}
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : !cid ? (
        <div className="empty">Select a customer to view transactions</div>
      ) : rows.length === 0 ? (
        <div className="empty">No transactions found for this customer</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="money">Debit (&#x20A6;)</th>
                <th className="money">Credit (&#x20A6;)</th>
                <th className="money">Balance (&#x20A6;)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i}>
                  <td>{fd(t.date)}</td>
                  <td style={{ fontSize: '0.8125rem' }}>{esc(t.description)}</td>
                  <td className="money">{t.debit > 0 ? fmt(t.debit) : ''}</td>
                  <td className="money mg">{t.credit > 0 ? fmt(t.credit) : ''}</td>
                  <td className={t.balance > 0 ? 'money mr' : 'money mg'} style={{ fontWeight: 700 }}>{fmt(t.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--color-muted)' }}>
                <td></td>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="money mb" style={{ fontWeight: 700 }}>{fmt(totalDebit)}</td>
                <td className="money mg" style={{ fontWeight: 700 }}>{fmt(totalCredit)}</td>
                <td className="money" style={{ fontWeight: 700 }}>{fmt(rows.length ? rows[rows.length - 1].balance : 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
