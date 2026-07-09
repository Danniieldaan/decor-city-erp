import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const SIDEBAR_MAP = {
  dashboard: [
    { lbl: 'Overview', items: [{ t: 'Dashboard', i: '\u229e', p: 'dashboard' }] },
    { lbl: 'Quick Actions', items: [
      { t: 'Process Invoice', i: '\ud83d\udccb', p: 'invoice_new' },
      { t: 'New Receipt', i: '\ud83d\udcb3', p: 'receipt_new' },
      { t: 'Add Customer', i: '\ud83d\udc64', p: 'cust_new' },
    ]}
  ],
  customers: [
    { lbl: 'Customers', items: [
      { t: 'Customer List', i: '\ud83d\udc65', p: 'customers' },
      { t: 'Add Customer', i: '\u2795', p: 'cust_new' },
    ]}
  ],
  invoices: [
    { lbl: 'Invoices', items: [
      { t: 'All Invoices', i: '\ud83d\udcc4', p: 'invoices' },
      { t: 'Process Invoice', i: '\u2795', p: 'invoice_new' },
    ]}
  ],
  receipts: [
    { lbl: 'Receipts', items: [
      { t: 'All Receipts', i: '\ud83d\udcb5', p: 'receipts' },
      { t: 'New Receipt', i: '\u2795', p: 'receipt_new' },
    ]}
  ],
  production: [
    { lbl: 'Production', items: [
      { t: 'Active Jobs', i: '\ud83c\udfed', p: 'production' },
      { t: 'New Job', i: '\u2795', p: 'prod_new' },
      { t: 'All Jobs', i: '\ud83d\udcca', p: 'prod_all' },
      { t: 'Completed Jobs', i: '\u2705', p: 'prod_log' },
      { t: 'Dates Log', i: '\ud83d\udcc5', p: 'dates' },
    ]}
  ],
  payroll: [
    { lbl: 'Payroll', items: [
      { t: 'Weekly Payslips', i: '\u20a6', p: 'payroll' },
      { t: 'Workers', i: '\ud83d\udc77', p: 'workers' },
      { t: 'Performance', i: '\ud83d\udcca', p: 'performance' },
    ]}
  ],
  reports: [
    { lbl: 'Reports', items: [
      { t: 'Days Outstanding', i: '\u23f0', p: 'r_outstanding' },
      { t: 'Sales by Customer', i: '\ud83d\udcca', p: 'r_sales' },
      { t: 'Transactions', i: '\ud83d\udccb', p: 'r_transactions' },
    ]}
  ],
  settings: [
    { lbl: 'System', items: [
      { t: 'General Settings', i: '\u2699\ufe0f', p: 'settings' },
    ]}
  ]
}

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, profile, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('darkMode') === 'true')

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem('darkMode', next)
    document.documentElement.classList.toggle('dark', next)
  }

  function handleNav(page) {
    setSidebarOpen(false)
    if (onNavigate) onNavigate(page)
  }

  const sidebarGroups = SIDEBAR_MAP[currentPage] || SIDEBAR_MAP.dashboard

  return (
    <div className="h-screen flex flex-col">
      {/* Top Nav */}
      <header className="h-11 bg-white dark:bg-slate-900 border-b border-border dark:border-slate-700 flex items-stretch px-1 flex-shrink-0 shadow-sm z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center w-10 h-10 my-auto rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border-0 lg:hidden"
          title="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center px-4 text-base font-extrabold text-primary dark:text-primary-400 border-r border-border dark:border-slate-700 tracking-tight">
          <span className="text-destructive">Decor</span>City
        </div>
        <nav className="flex items-stretch">
          {[
            { l: 'Dashboard', p: 'dashboard' },
            { l: 'Invoices', p: 'invoices' },
            { l: 'Receipts', p: 'receipts' },
            { l: 'Reports', p: 'r_outstanding' },
            { l: 'Production', p: 'production' },
            { l: 'Payroll', p: 'payroll' },
            { l: 'Settings', p: 'settings' },
          ].map(n => (
            <button
              key={n.p}
              onClick={() => handleNav(n.p)}
              className={`ti flex items-center px-3.5 text-xs font-semibold cursor-pointer border-0 whitespace-nowrap transition-all duration-150 border-b-2 ${
                currentPage === n.p
                  ? 'on text-primary dark:text-primary-400 border-primary'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-transparent hover:border-primary'
              }`}
            >
              {n.l}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 px-3">
          <button onClick={toggleDark} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer border-0" title="Toggle dark mode">
            {dark ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          {profile && (
            <span className="text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 px-2.5 py-1 rounded-md">{profile.name}</span>
          )}
          {user && (
            <button onClick={signOut} className="h-7 px-2.5 rounded-lg bg-destructive/90 hover:bg-destructive text-white text-xs font-semibold transition-colors cursor-pointer border-0">
              Logout
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`w-48 bg-slate-900 dark:bg-slate-950 text-white border-r border-slate-700 overflow-y-auto flex-shrink-0 transition-transform duration-200 z-40
            fixed lg:static inset-y-0 left-0 pt-11 lg:pt-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          <div className="pt-2 lg:pt-1">
            {sidebarGroups.map((group, gi) => (
              <div key={gi}>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[1.5px] px-4 pt-4 pb-1">
                  {group.lbl}
                </div>
                {group.items.map((item, ii) => (
                  <div
                    key={ii}
                    onClick={() => handleNav(item.p)}
                    className={`si flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer border-l-[3px] transition-all duration-150 ${
                      currentPage === item.p
                        ? 'on text-white font-semibold'
                        : 'text-slate-300 dark:text-slate-400 hover:text-white hover:bg-white/5 dark:hover:bg-white/5 border-transparent hover:border-accent'
                    }`}
                  >
                    <span className="text-base">{item.i}</span>
                    <span>{item.t}</span>
                  </div>
                ))}
                <div className="h-px bg-slate-700/50 dark:bg-slate-700/30 mx-3 my-1.5" />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  )
}
