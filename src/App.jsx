import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/InvoiceForm'
import Receipts from './pages/Receipts'
import ReceiptForm from './pages/ReceiptForm'
import Production from './pages/Production'
import ProductionForm from './pages/ProductionForm'
import AllJobs from './pages/AllJobs'
import CompletedJobs from './pages/CompletedJobs'
import DatesLog from './pages/DatesLog'
import Payroll from './pages/Payroll'
import Workers from './pages/Workers'
import Performance from './pages/Performance'
import DaysOutstanding from './pages/reports/DaysOutstanding'
import SalesByCustomer from './pages/reports/SalesByCustomer'
import Transactions from './pages/reports/Transactions'
import Settings from './pages/Settings'

const PAGE_MAP = {
  dashboard: { path: '/', label: 'Dashboard' },
  customers: { path: '/customers', label: 'Customer List' },
  cust_new: { path: '/customers/new', label: 'Add Customer' },
  invoices: { path: '/invoices', label: 'All Invoices' },
  invoice_new: { path: '/invoices/new', label: 'Process Invoice' },
  receipts: { path: '/receipts', label: 'All Receipts' },
  receipt_new: { path: '/receipts/new', label: 'New Receipt' },
  production: { path: '/production', label: 'Active Jobs' },
  prod_new: { path: '/production/new', label: 'New Job' },
  prod_all: { path: '/production/all', label: 'All Jobs' },
  prod_log: { path: '/production/completed', label: 'Completed Jobs' },
  dates: { path: '/production/dates', label: 'Dates Log' },
  payroll: { path: '/payroll', label: 'Weekly Payslips' },
  workers: { path: '/workers', label: 'Workers' },
  performance: { path: '/performance', label: 'Performance' },
  r_outstanding: { path: '/reports/outstanding', label: 'Days Outstanding' },
  r_sales: { path: '/reports/sales', label: 'Sales by Customer' },
  r_transactions: { path: '/reports/transactions', label: 'Transactions' },
  settings: { path: '/settings', label: 'General Settings' },
}

function AppContent() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    const page = Object.entries(PAGE_MAP).find(([, v]) => v.path === location.pathname)
    if (page) setCurrentPage(page[0])
  }, [location.pathname])

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 text-sm">Loading...</div>
  if (!user) return <LoginPage />

  function handleNav(pageKey) {
    const entry = PAGE_MAP[pageKey]
    if (entry) navigate(entry.path)
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNav}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceForm />} />
        <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/receipts/new" element={<ReceiptForm />} />
        <Route path="/production" element={<Production />} />
        <Route path="/production/new" element={<ProductionForm />} />
        <Route path="/production/all" element={<AllJobs />} />
        <Route path="/production/completed" element={<CompletedJobs />} />
        <Route path="/production/dates" element={<DatesLog />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/reports/outstanding" element={<DaysOutstanding />} />
        <Route path="/reports/sales" element={<SalesByCustomer />} />
        <Route path="/reports/transactions" element={<Transactions />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
