import { useState, useEffect } from 'react'
import { settings as dbSettings, profiles } from '../lib/db'
import { esc } from '../lib/utils'
import { STAGES, ALL_PERMS, PERM_LABELS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsData, setSettingsData] = useState({})
  const [form, setForm] = useState({
    company: '',
    tagline: '',
    logo_url: '',
    address: '',
    default_disc: 0,
    terms: '',
    vat_rate: 0,
    banking: '',
    custom_data: {}
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [newFT, setNewFT] = useState('')
  const [newFTStages, setNewFTStages] = useState('')
  const [newRep, setNewRep] = useState('')
  const [newArtisan, setNewArtisan] = useState('')
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'staff', grants: [] })
  const [editingUserId, setEditingUserId] = useState(null)
  const [showAddFrameType, setShowAddFrameType] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [s, u] = await Promise.all([
          dbSettings.get(),
          supabase.from('profiles').select('*').order('name')
        ])
        const data = s || {}
        setSettingsData(data)
        setForm({
          company: data.company || '',
          tagline: data.tagline || '',
          logo_url: data.logo_url || '',
          address: data.address || '',
          default_disc: data.default_disc || 0,
          terms: data.terms || '',
          vat_rate: data.vat_rate || 0,
          banking: data.banking || '',
          custom_data: data.custom_data || {}
        })
        if (data.logo_url) setLogoPreview(data.logo_url)
        setUsers(u.data || [])
      } catch (err) {
        console.error('Settings load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCustom(field, value) {
    setForm(prev => ({ ...prev, custom_data: { ...prev.custom_data, [field]: value } }))
  }

  function getCustom(field, def) {
    const cd = form.custom_data || {}
    return cd[field] !== undefined ? cd[field] : def
  }

  const ftList = [...(getCustom('frameTypes', []))]
  const artList = getCustom('artisans', [])
  const repList = getCustom('salesReps', [])
  const stageCommissions = getCustom('stageCommissions', {})

  async function handleLogoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop()
    const path = 'logos/' + Date.now() + '.' + ext
    const { error } = await supabase.storage.from('public').upload(path, file)
    if (error) {
      console.error('Logo upload error:', error)
      return alert('Failed to upload logo')
    }
    const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(path)
    setLogoPreview(publicUrl)
    handleChange('logo_url', publicUrl)
  }

  function handleRemoveLogo() {
    setLogoPreview(null)
    handleChange('logo_url', '')
  }

  function addFrameType() {
    if (!newFT.trim()) return
    const current = getCustom('frameTypes', [])
    if (current.find(f => f.name === newFT.trim())) return alert('Frame type already exists')
    const stages = newFTStages.split(',').map(s => s.trim()).filter(Boolean)
    handleCustom('frameTypes', [...current, { name: newFT.trim(), stages }])
    setNewFT('')
    setNewFTStages('')
    setShowAddFrameType(false)
  }

  function removeFrameType(name) {
    const current = getCustom('frameTypes', [])
    handleCustom('frameTypes', current.filter(f => f.name !== name))
  }

  function addRep() {
    if (!newRep.trim()) return
    const current = getCustom('salesReps', [])
    if (current.includes(newRep.trim())) return
    handleCustom('salesReps', [...current, newRep.trim()])
    setNewRep('')
  }

  function removeRep(name) {
    const current = getCustom('salesReps', [])
    handleCustom('salesReps', current.filter(r => r !== name))
  }

  function addArtisan() {
    if (!newArtisan.trim()) return
    const current = getCustom('artisans', [])
    if (current.includes(newArtisan.trim())) return
    handleCustom('artisans', [...current, newArtisan.trim()])
    setNewArtisan('')
  }

  function removeArtisan(name) {
    const current = getCustom('artisans', [])
    handleCustom('artisans', current.filter(a => a !== name))
  }

  function handleCommChange(stage, value) {
    const current = { ...stageCommissions }
    current[stage] = value ? +value : 0
    handleCustom('stageCommissions', current)
  }

  function toggleUserPerm(perm) {
    setUserForm(prev => ({
      ...prev,
      grants: prev.grants.includes(perm)
        ? prev.grants.filter(p => p !== perm)
        : [...prev.grants, perm]
    }))
  }

  async function handleSaveUser() {
    if (!userForm.name.trim() || !userForm.username.trim()) return alert('Name and username are required.')
    try {
      if (editingUserId) {
        const { error } = await supabase.from('profiles').update({
          name: userForm.name.trim(),
          role: userForm.role,
          grants: userForm.grants
        }).eq('id', editingUserId)
        if (error) throw error
        setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, name: userForm.name.trim(), role: userForm.role, grants: userForm.grants } : u))
      } else {
        if (!userForm.password) return alert('Password is required for new users.')
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userForm.username + '@decorcity.local',
          password: userForm.password
        })
        if (authError) throw authError
        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            name: userForm.name.trim(),
            username: userForm.username.trim(),
            role: userForm.role,
            grants: userForm.grants
          })
          if (profileError) throw profileError
          setUsers(prev => [...prev, { id: authData.user.id, name: userForm.name.trim(), username: userForm.username.trim(), role: userForm.role, grants: userForm.grants }])
        }
      }
      setShowUserModal(false)
      setEditingUserId(null)
      setUserForm({ name: '', username: '', password: '', role: 'staff', grants: [] })
    } catch (err) {
      console.error('Save user error:', err)
      alert('Failed to save user: ' + (err.message || 'Unknown error'))
    }
  }

  async function handleEditUser(u) {
    setEditingUserId(u.id)
    setUserForm({ name: u.name || '', username: u.username || '', password: '', role: u.role || 'staff', grants: u.grants || [] })
    setShowUserModal(true)
  }

  async function handleDeleteUser(id) {
    if (!confirm('Delete this user?')) return
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      console.error('Delete user error:', err)
      alert('Failed to delete user')
    }
  }

  function handleAddUser() {
    setEditingUserId(null)
    setUserForm({ name: '', username: '', password: '', role: 'staff', grants: [] })
    setShowUserModal(true)
  }

  async function handleSave() {
    if (!form.company.trim()) return alert('Company name is required.')
    setSaving(true)
    try {
      const payload = {
        company: form.company.trim(),
        tagline: form.tagline || null,
        logo_url: form.logo_url || null,
        address: form.address || null,
        default_disc: +form.default_disc || 0,
        terms: form.terms || null,
        vat_rate: +form.vat_rate || 0,
        banking: form.banking || null,
        custom_data: form.custom_data || {}
      }
      await dbSettings.save(payload)
      alert('Settings saved successfully!')
    } catch (err) {
      console.error('Save settings error:', err)
      alert('Failed to save settings: ' + (err.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="empty">Loading...</div>

  return (
    <div>
      <div className="ph">
        <div className="pt">Settings</div>
        <div className="ps">Manage application settings</div>
        <div className="ptb">
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white text-xs font-semibold transition-all cursor-pointer border-0 active:scale-[0.98]">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Company Info</div>
          <div style={{ padding: '0.75rem' }}>
            <table className="ft">
              <tbody>
                <tr>
                  <td className="lb">Company Name</td>
                  <td><input className="qi" value={form.company} onChange={e => handleChange('company', e.target.value)} placeholder="Company name" /></td>
                </tr>
                <tr>
                  <td className="lb">Tagline</td>
                  <td><input className="qi" value={form.tagline} onChange={e => handleChange('tagline', e.target.value)} placeholder="Tagline" /></td>
                </tr>
                <tr>
                  <td className="lb">Logo</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ fontSize: '0.75rem' }} />
                      {logoPreview && (
                        <>
                          <img src={logoPreview} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)' }} />
                          <button onClick={handleRemoveLogo} className="h-6 px-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Remove</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="lb">Address</td>
                  <td><input className="qi" value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Company address" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Financial</div>
          <div style={{ padding: '0.75rem' }}>
            <table className="ft">
              <tbody>
                <tr>
                  <td className="lb">Default Discount %</td>
                  <td><input className="qi" type="number" min="0" max="100" step="0.01" value={form.default_disc} onChange={e => handleChange('default_disc', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="lb">Terms &amp; Conditions</td>
                  <td><textarea className="qi" rows={3} value={form.terms} onChange={e => handleChange('terms', e.target.value)} placeholder="Payment terms and conditions" style={{ resize: 'vertical' }} /></td>
                </tr>
                <tr>
                  <td className="lb">VAT Rate</td>
                  <td><input className="qi" type="number" min="0" max="100" step="0.01" value={form.vat_rate} onChange={e => handleChange('vat_rate', e.target.value)} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">
            Frame Types
            <span style={{ float: 'right' }}>
              <button onClick={() => setShowAddFrameType(!showAddFrameType)} className="h-6 px-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">+ Add</button>
            </span>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {showAddFrameType && (
              <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--color-muted)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <input className="qi" value={newFT} onChange={e => setNewFT(e.target.value)} placeholder="Frame type name" />
                  <input className="qi" value={newFTStages} onChange={e => setNewFTStages(e.target.value)} placeholder="Stages (comma separated)" />
                  <button onClick={addFrameType} className="h-7 px-3 rounded-lg bg-success hover:bg-success/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Add Frame Type</button>
                </div>
              </div>
            )}
            {ftList.length === 0 ? (
              <div className="empty" style={{ padding: '0.5rem' }}>No custom frame types</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {ftList.map((ft, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'var(--color-muted)', borderRadius: '0.375rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{esc(ft.name)}</span>
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: 2, flexWrap: 'wrap' }}>
                        {(ft.stages || []).map((st, j) => (
                          <span key={j} className="sp ssn" style={{ fontSize: '0.625rem' }}>{esc(st)}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => removeFrameType(ft.name)} className="h-6 px-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Stage Commission Defaults</div>
          <div style={{ padding: '0.75rem', overflowX: 'auto' }}>
            <table className="ft" style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--color-muted)' }}>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.75rem' }}>Stage</th>
                  <th style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontSize: '0.75rem' }}>Default Commission (&#x20A6;)</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map(st => (
                  <tr key={st}>
                    <td style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>{st}</td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      <input
                        className="qi"
                        type="number"
                        min="0"
                        step="0.01"
                        value={stageCommissions[st] || ''}
                        onChange={e => handleCommChange(st, e.target.value)}
                        style={{ width: 120, textAlign: 'right', padding: '0.25rem 0.5rem' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Sales Reps</div>
          <div style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <input className="qi" value={newRep} onChange={e => setNewRep(e.target.value)} placeholder="Rep name" style={{ flex: 1 }} />
              <button onClick={addRep} className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Add</button>
            </div>
            {repList.length === 0 ? (
              <div className="empty" style={{ padding: '0.5rem' }}>No sales reps</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {repList.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'var(--color-muted)', borderRadius: '0.375rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{esc(r)}</span>
                    <button onClick={() => removeRep(r)} className="h-6 px-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Artisans</div>
          <div style={{ padding: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <input className="qi" value={newArtisan} onChange={e => setNewArtisan(e.target.value)} placeholder="Artisan name" style={{ flex: 1 }} />
              <button onClick={addArtisan} className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Add</button>
            </div>
            {artList.length === 0 ? (
              <div className="empty" style={{ padding: '0.5rem' }}>No artisans</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {artList.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0.5rem', background: 'var(--color-muted)', borderRadius: '0.375rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{esc(a)}</span>
                    <button onClick={() => removeArtisan(a)} className="h-6 px-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">User Management</div>
          <div style={{ padding: '0.75rem' }}>
            {users.length === 0 ? (
              <div className="empty" style={{ padding: '0.5rem' }}>No users</div>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: '0.5rem' }}>
                <table className="ft" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-muted)' }}>
                      <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.6875rem' }}>Name</th>
                      <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.6875rem' }}>Username</th>
                      <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.6875rem' }}>Role</th>
                      <th style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontSize: '0.6875rem' }}>Permissions</th>
                      <th style={{ padding: '0.375rem 0.5rem', fontSize: '0.6875rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem', fontWeight: 600 }}>{esc(u.name || u.username || '')}</td>
                        <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>{esc(u.username || '')}</td>
                        <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}><span className={'sp ' + (u.role === 'admin' ? 'spr' : 'ssn')}>{esc(u.role || '')}</span></td>
                        <td style={{ padding: '0.375rem 0.5rem', fontSize: '0.8125rem' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {(!u.grants || u.grants.length === 0) && <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>None</span>}
                            {(u.grants || []).map(p => (
                              <span key={p} className="sp sco" style={{ fontSize: '0.625rem' }}>{esc(p)}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '0.375rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <button onClick={() => handleEditUser(u)} className="h-6 px-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0 mr-1">Edit</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="h-6 px-2 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={handleAddUser} className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">+ Add User</button>
          </div>
        </div>

        <div className="pnl" style={{ margin: 0 }}>
          <div className="pnlh">Banking Terms</div>
          <div style={{ padding: '0.75rem' }}>
            <textarea
              className="qi"
              rows={4}
              value={form.banking}
              onChange={e => handleChange('banking', e.target.value)}
              placeholder="Bank name, account name, account number, sort code, etc."
              style={{ resize: 'vertical', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {showUserModal && (
        <Modal
          title={editingUserId ? 'Edit User' : 'Add User'}
          onClose={() => { setShowUserModal(false); setEditingUserId(null) }}
          footer={
            <div className="flex gap-2">
              <button onClick={handleSaveUser} className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all cursor-pointer border-0">
                {editingUserId ? 'Update' : 'Add'}
              </button>
              <button onClick={() => { setShowUserModal(false); setEditingUserId(null) }} className="h-8 px-4 rounded-xl border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer bg-transparent hover:bg-muted dark:hover:bg-slate-700">Cancel</button>
            </div>
          }
        >
          <div style={{ padding: '1rem' }}>
            <table className="ft">
              <tbody>
                <tr>
                  <td className="lb">Name</td>
                  <td><input className="qi" value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" /></td>
                </tr>
                <tr>
                  <td className="lb">Username</td>
                  <td><input className="qi" value={userForm.username} onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" /></td>
                </tr>
                {!editingUserId && (
                  <tr>
                    <td className="lb">Password</td>
                    <td><input className="qi" type="password" value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Password" /></td>
                  </tr>
                )}
                <tr>
                  <td className="lb">Role</td>
                  <td>
                    <select className="qi" value={userForm.role} onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="lb" style={{ verticalAlign: 'top' }}>Permissions</td>
                  <td>
                    {ALL_PERMS.map(p => (
                      <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input
                          type="checkbox"
                          checked={userForm.grants.includes(p)}
                          onChange={() => toggleUserPerm(p)}
                          style={{ cursor: 'pointer' }}
                        />
                        {PERM_LABELS[p] || p}
                      </label>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
