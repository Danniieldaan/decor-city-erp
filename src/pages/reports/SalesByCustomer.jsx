import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, invoices, receipts } from '../../lib/db'
import { fmt, esc } from '../../lib/utils'

export default function SalesByCustomer() {
  const navigate = useNavigate()
  const [custList, setCustList] = useState([])
  const [invList, setInvList] = useState([])
  const [rcptList, setRcptList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [custData, invData, rcptData] = await Promise.all([
          customers.getAll(),
          invoices.getAll(),
          receipts.getAll()
        ])
        setCustList(custData || [])
        setInvList(invData || [])
        setRcptList(rcptData || [])
      } catch (err) {
        console.error('SalesByCustomer load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const rcptByCust = {}
  rcptList.forEach(r => {
    rcptByCust[r.cid] = (rcptByCust[r.cid] || 0) + (r.amount || 0)
  })

  const invByCust = {}
  invList.forEach(inv => {
    if (!invByCust[inv.cid]) invByCust[inv.cid] = { count: 0, total: 0 }
    invByCust[inv.cid].count++
    invByCust[inv.cid].total += (inv.grand_total || 0)
  })

  const rows = Object.keys(invByCust).map(cid => {
    const cust = custList.find(c => c.id === cid)
    const totalSales = invByCust[cid].total
    const totalPaid = rcptByCust[cid] || 0
    return {
      cid,
      name: cust ? cust.name : 'Unknown',
      invCount: invByCust[cid].count,
      totalSales,
      totalPaid,
      balance: totalSales - totalPaid,
      active: cust ? cust.active !== false : false
    }
  }).sort((a, b) => b.totalSales - a.totalSales)

  const totalSales = rows.reduce((s, r) => s + r.totalSales, 0)
  const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0)
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0)

  return (
    <div>
      <div className="ph">
        <div className="pt">Sales by Customer</div>
        <div className="ps">Customer sales summary with balances</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="empty">No customer sales data found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th className="money">No. of Invoices</th>
                <th className="money">Total Sales</th>
                <th className="money">Total Paid</th>
                <th className="money">Outstanding Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.cid}>
                  <td>
                    <a
                      onClick={() => navigate('/customers/' + r.cid + '/edit')}
                      style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      {esc(r.name)}
                    </a>
                  </td>
                  <td className="money">{r.invCount}</td>
                  <td className="money">{fmt(r.totalSales)}</td>
                  <td className="money mg">{fmt(r.totalPaid)}</td>
                  <td className={r.balance > 0 ? 'money mr' : 'money mg'}>{fmt(r.balance)}</td>
                  <td>{r.active ? <span className="sp sco">Active</span> : <span className="sp sdr">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--color-muted)' }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="money" style={{ fontWeight: 700 }}>{rows.reduce((s, r) => s + r.invCount, 0)}</td>
                <td className="money mb" style={{ fontWeight: 700 }}>{fmt(totalSales)}</td>
                <td className="money mg" style={{ fontWeight: 700 }}>{fmt(totalPaid)}</td>
                <td className="money mr" style={{ fontWeight: 700 }}>{fmt(totalBalance)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
