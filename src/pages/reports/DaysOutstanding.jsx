import { useState, useEffect } from 'react'
import { outstanding } from '../../lib/db'
import { fmt, fd, esc, localDate } from '../../lib/utils'

export default function DaysOutstanding() {
  const [outList, setOutList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await outstanding.getAll()
        setOutList(data || [])
      } catch (err) {
        console.error('DaysOutstanding load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = new Date()
  const unpaid = outList.filter(o => !o.paid).map(o => {
    const created = o.created_at ? new Date(o.created_at) : new Date()
    const daysOverdue = Math.max(0, Math.floor((today - created) / (1000 * 60 * 60 * 24)))
    return { ...o, daysOverdue }
  }).sort((a, b) => (b.amount || 0) - (a.amount || 0))

  const totalOutstanding = unpaid.reduce((s, o) => s + (o.amount || 0), 0)

  return (
    <div>
      <div className="ph">
        <div className="pt">Days Outstanding</div>
        <div className="ps">Unpaid artisan outstanding amounts and overdue days</div>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : unpaid.length === 0 ? (
        <div className="empty">No outstanding items found</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dt">
            <thead>
              <tr>
                <th>Artisan Name</th>
                <th className="money">Outstanding Amount</th>
                <th className="money">Days Overdue</th>
                <th>Invoice / Job Reference</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{esc(o.artisan)}</td>
                  <td className="money mr">{fmt(o.amount)}</td>
                  <td className="money" style={{ color: o.daysOverdue > 30 ? 'var(--color-destructive)' : o.daysOverdue > 7 ? '#d97706' : undefined, fontWeight: 700 }}>{o.daysOverdue}</td>
                  <td>{esc(o.ref || '—')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--color-muted)' }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="money mb">{fmt(totalOutstanding)}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
