import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { customers } from '../lib/db'
import { esc } from '../lib/utils'

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [form, setForm] = useState({
    name: '',
    category: '',
    credit_limit: '',
    balance: 0,
    vat: '',
    rep: '',
    active: true,
    email: '',
    telephone: '',
    mobile: '',
    street: '',
    area: '',
    city_state: '',
    postal_code: ''
  })

  useEffect(() => {
    if (isEdit && id) {
      async function load() {
        try {
          const cust = await customers.getById(id)
          if (cust) {
            setForm({
              name: cust.name || '',
              category: cust.category || '',
              credit_limit: cust.credit_limit || '',
              balance: cust.balance || 0,
              vat: cust.vat || '',
              rep: cust.rep || '',
              active: cust.active !== false,
              email: cust.email || '',
              telephone: cust.telephone || '',
              mobile: cust.mobile || '',
              street: cust.street || '',
              area: cust.area || '',
              city_state: cust.city_state || '',
              postal_code: cust.postal_code || ''
            })
          }
        } catch (err) {
          console.error('Load customer error:', err)
        } finally {
          setLoading(false)
        }
      }
      load()
    }
  }, [id, isEdit])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) return alert('Customer name is required.')
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        category: form.category || null,
        credit_limit: form.credit_limit ? +form.credit_limit : null,
        balance: +form.balance || 0,
        vat: form.vat || null,
        rep: form.rep || null,
        active: form.active,
        email: form.email || null,
        telephone: form.telephone || null,
        mobile: form.mobile || null,
        street: form.street || null,
        area: form.area || null,
        city_state: form.city_state || null,
        postal_code: form.postal_code || null
      }
      if (isEdit) {
        await customers.update(id, data)
      } else {
        await customers.create(data)
      }
      navigate('/customers')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save customer: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty">Loading...</div>

  return (
    <div>
      <div className="ph">
        <div className="pt">{isEdit ? 'Edit Customer' : 'New Customer'}</div>
        <div className="ps">{isEdit ? 'Update customer details' : 'Create a new customer'}</div>
        <div className="ptb">
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => navigate('/customers')} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 text-xs font-semibold transition-all cursor-pointer bg-transparent active:scale-[0.98]">
            Cancel
          </button>
        </div>
      </div>

      <div style={{ padding: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="pnl" style={{ margin: 0 }}>
            <div className="pnlh">Customer Info</div>
            <div style={{ padding: '0.75rem' }}>
              <table className="ft">
                <tbody>
                  <tr>
                    <td className="lb">Name</td>
                    <td><input className="qi" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="Customer name" /></td>
                  </tr>
                  <tr>
                    <td className="lb">Category</td>
                    <td><input className="qi" value={form.category} onChange={e => handleChange('category', e.target.value)} placeholder="e.g. Retail, Wholesale" /></td>
                  </tr>
                  <tr>
                    <td className="lb">Credit Limit</td>
                    <td><input className="qi" type="number" min="0" step="0.01" value={form.credit_limit} onChange={e => handleChange('credit_limit', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">Balance</td>
                    <td><input className="qi" type="number" min="0" step="0.01" value={form.balance} onChange={e => handleChange('balance', e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="lb">VAT</td>
                    <td><input className="qi" value={form.vat} onChange={e => handleChange('vat', e.target.value)} placeholder="VAT number" /></td>
                  </tr>
                  <tr>
                    <td className="lb">Sales Rep</td>
                    <td><input className="qi" value={form.rep} onChange={e => handleChange('rep', e.target.value)} placeholder="Sales rep name" /></td>
                  </tr>
                  <tr>
                    <td className="lb">Active</td>
                    <td>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input type="checkbox" checked={form.active} onChange={e => handleChange('active', e.target.checked)} style={{ cursor: 'pointer' }} />
                        Active
                      </label>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="pnl" style={{ margin: '0 0 0.75rem' }}>
              <div className="pnlh">Contact</div>
              <div style={{ padding: '0.75rem' }}>
                <table className="ft">
                  <tbody>
                    <tr>
                      <td className="lb">Email</td>
                      <td><input className="qi" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="email@example.com" /></td>
                    </tr>
                    <tr>
                      <td className="lb">Telephone</td>
                      <td><input className="qi" value={form.telephone} onChange={e => handleChange('telephone', e.target.value)} placeholder="Phone number" /></td>
                    </tr>
                    <tr>
                      <td className="lb">Mobile</td>
                      <td><input className="qi" value={form.mobile} onChange={e => handleChange('mobile', e.target.value)} placeholder="Mobile number" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pnl" style={{ margin: 0 }}>
              <div className="pnlh">Address</div>
              <div style={{ padding: '0.75rem' }}>
                <table className="ft">
                  <tbody>
                    <tr>
                      <td className="lb">Street</td>
                      <td><input className="qi" value={form.street} onChange={e => handleChange('street', e.target.value)} placeholder="Street address" /></td>
                    </tr>
                    <tr>
                      <td className="lb">Area</td>
                      <td><input className="qi" value={form.area} onChange={e => handleChange('area', e.target.value)} placeholder="Area / district" /></td>
                    </tr>
                    <tr>
                      <td className="lb">City/State</td>
                      <td><input className="qi" value={form.city_state} onChange={e => handleChange('city_state', e.target.value)} placeholder="City / State" /></td>
                    </tr>
                    <tr>
                      <td className="lb">Postal Code</td>
                      <td><input className="qi" value={form.postal_code} onChange={e => handleChange('postal_code', e.target.value)} placeholder="Postal code" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
