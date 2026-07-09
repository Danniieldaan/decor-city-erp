import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers, invoices, invoiceItems, receipts, productions, settings as dbSettings } from '../lib/db'
import { fmt, fd, getWeekEnd, wkRange, isWk, localDate } from '../lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const [s, setS] = useState({})
  const [invList, setInvList] = useState([])
  const [prodList, setProdList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [settingsData, invoicesData, productionsData] = await Promise.all([
          dbSettings.get(),
          invoices.getAll(),
          productions.getAll()
        ])
        setS(settingsData || {})
        setInvList(invoicesData || [])
        setProdList(productionsData || [])
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalRevenue = invList.reduce((sum, inv) => {
    if (inv.status === 'Completed' || inv.status === 'Issued') {
      return sum + (inv.grand_total || 0)
    }
    return sum
  }, 0)

  const outstandingBalance = invList.reduce((sum, inv) => sum + (inv.balance || 0), 0)

  const activeJobs = prodList.filter(p => p.status === 'active' || p.status === 'in_progress').length

  const today = localDate()
  const weekEnd = getWeekEnd(today)
  const overdueJobs = prodList.filter(p => p.due_date && p.due_date < today && p.status !== 'completed' && p.status !== 'done')
  const dueThisWeek = prodList.filter(p => p.due_date && p.due_date >= today && p.due_date <= weekEnd && p.status !== 'completed' && p.status !== 'done')

  const quickActions = [
    { t: 'Process Invoice', i: '\uD83D\uDCCB', p: '/invoices/new', s: 'Create new invoice' },
    { t: 'New Receipt', i: '\uD83D\uDCB3', p: '/receipts/new', s: 'Record a payment' },
    { t: 'Weekly Payroll', i: '\uD83D\uDCB0', p: '/payroll', s: 'Manage payslips' },
    { t: 'Add Customer', i: '\uD83D\uDC64', p: '/customers/new', s: 'New customer' },
    { t: 'Active Jobs', i: '\uD83C\uDFED', p: '/production', s: 'Production floor' },
    { t: 'Commission Matrix', i: '\uD83D\uDCCA', p: '/performance', s: 'Artisan performance' },
    { t: 'All Invoices', i: '\uD83D\uDCC4', p: '/invoices', s: 'View all invoices' },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-slate-400">Loading...</div>
  }

  return (
    <div>
      <div className="ph">
        <div className="pt">{s.company || 'Decor City'}</div>
        <div className="ps">{s.tagline || 'Frame Workshop & Art Studio'}</div>
      </div>

      <div className="kbar">
        <div className="kb g">
          <div className="kl">Total Revenue</div>
          <div className="kv">{fmt(totalRevenue)}</div>
          <div className="ks">All time invoice revenue</div>
        </div>
        <div className="kb r">
          <div className="kl">Outstanding Balance</div>
          <div className="kv">{fmt(outstandingBalance)}</div>
          <div className="ks">Total unpaid balance</div>
        </div>
        <div className="kb o">
          <div className="kl">This Week Payroll</div>
          <div className="kv">{fmt(0)}</div>
          <div className="ks">Current week payroll</div>
        </div>
        <div className="kb">
          <div className="kl">Active Jobs</div>
          <div className="kv">{activeJobs}</div>
          <div className="ks">Jobs in production</div>
        </div>
      </div>

      {(overdueJobs.length > 0 || dueThisWeek.length > 0) && (
        <div className="kbar" style={{ paddingTop: 0 }}>
          {overdueJobs.length > 0 && (
            <div className="kb r">
              <div className="kl">Overdue Jobs</div>
              <div className="kv" style={{ fontSize: '1rem' }}>{overdueJobs.length} job{overdueJobs.length !== 1 ? 's' : ''} overdue</div>
              <div className="ks">Past due date - needs attention</div>
            </div>
          )}
          {dueThisWeek.length > 0 && (
            <div className="kb o">
              <div className="kl">Due This Week</div>
              <div className="kv" style={{ fontSize: '1rem' }}>{dueThisWeek.length} job{dueThisWeek.length !== 1 ? 's' : ''} due</div>
              <div className="ks">Deadlines within this week</div>
            </div>
          )}
        </div>
      )}

      <div className="qvg">
        {quickActions.map((qa, i) => (
          <div key={i} className="qvc" onClick={() => navigate(qa.p)}>
            <div className="qvci">{qa.i}</div>
            <div className="qvct">{qa.t}</div>
            <div className="qvcs">{qa.s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
