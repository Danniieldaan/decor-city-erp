import { supabase } from './supabase'

// --- Customers ---
export const customers = {
  async getAll() {
    const { data } = await supabase.from('customers').select('*').order('name')
    return data || []
  },
  async getById(id) {
    const { data } = await supabase.from('customers').select('*').eq('id', id).single()
    return data
  },
  async create(c) {
    const { data } = await supabase.from('customers').insert(c).select().single()
    return data
  },
  async update(id, updates) {
    const { data } = await supabase.from('customers').update(updates).eq('id', id).select().single()
    return data
  },
  async remove(id) {
    await supabase.from('customers').delete().eq('id', id)
  }
}

// --- Invoices ---
export const invoices = {
  async getAll() {
    const { data } = await supabase.from('invoices').select('*').order('id', { ascending: false })
    return data || []
  },
  async getById(id) {
    const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
    return data
  },
  async getByCustomer(cid) {
    const { data } = await supabase.from('invoices').select('*').eq('cid', cid)
    return data || []
  },
  async create(inv) {
    const { data } = await supabase.from('invoices').insert(inv).select().single()
    return data
  },
  async update(id, updates) {
    const { data } = await supabase.from('invoices').update(updates).eq('id', id).select().single()
    return data
  },
  async remove(id) {
    await supabase.from('invoices').delete().eq('id', id)
  }
}

// --- Invoice Items ---
export const invoiceItems = {
  async getByInvoice(qid) {
    const { data } = await supabase.from('invoice_items').select('*').eq('qid', qid)
    return data || []
  },
  async bulkSave(qid, items) {
    await supabase.from('invoice_items').delete().eq('qid', qid)
    if (items.length) {
      const { data } = await supabase.from('invoice_items').insert(
        items.map(it => ({ ...it, qid }))
      ).select()
      return data
    }
    return []
  },
  async removeByInvoice(qid) {
    await supabase.from('invoice_items').delete().eq('qid', qid)
  }
}

// --- Receipts ---
export const receipts = {
  async getAll() {
    const { data } = await supabase.from('receipts').select('*').order('id', { ascending: false })
    return data || []
  },
  async getById(id) {
    const { data } = await supabase.from('receipts').select('*').eq('id', id).single()
    return data
  },
  async getByInvoice(qid) {
    const { data } = await supabase.from('receipts').select('*').eq('qid', qid)
    return data || []
  },
  async getByCustomer(cid) {
    const { data } = await supabase.from('receipts').select('*').eq('cid', cid)
    return data || []
  },
  async create(r) {
    const { data } = await supabase.from('receipts').insert(r).select().single()
    return data
  },
  async remove(id) {
    await supabase.from('receipts').delete().eq('id', id)
  }
}

// --- Productions ---
export const productions = {
  async getAll() {
    const { data } = await supabase.from('productions').select('*').order('id', { ascending: false })
    return data || []
  },
  async getById(id) {
    const { data } = await supabase.from('productions').select('*').eq('id', id).single()
    return data
  },
  async getByStatus(status) {
    const { data } = await supabase.from('productions').select('*').eq('status', status)
    return data || []
  },
  async getActive() {
    const { data } = await supabase.from('productions').select('*').eq('status', 'active')
    return data || []
  },
  async getCompleted() {
    const { data } = await supabase.from('productions').select('*').eq('status', 'completed')
    return data || []
  },
  async create(p) {
    const { data } = await supabase.from('productions').insert(p).select().single()
    return data
  },
  async update(id, updates) {
    const { data } = await supabase.from('productions').update(updates).eq('id', id).select().single()
    return data
  },
  async remove(id) {
    await supabase.from('productions').delete().eq('id', id)
  }
}

// --- Production Stages ---
export const prodStages = {
  async getByProduction(pid) {
    const { data } = await supabase.from('production_stages').select('*').eq('pid', pid).order('idx')
    return data || []
  },
  async bulkSave(pid, stages) {
    await supabase.from('production_stages').delete().eq('pid', pid)
    if (stages.length) {
      const { data } = await supabase.from('production_stages').insert(
        stages.map((s, i) => ({ ...s, pid, idx: i }))
      ).select()
      return data
    }
    return []
  },
  async update(id, updates) {
    const { data } = await supabase.from('production_stages').update(updates).eq('id', id).select().single()
    return data
  },
  async removeByProduction(pid) {
    await supabase.from('production_stages').delete().eq('pid', pid)
  }
}

// --- Outstanding ---
export const outstanding = {
  async getAll() {
    const { data } = await supabase.from('outstanding').select('*').order('id', { ascending: false })
    return data || []
  },
  async getByArtisan(artisan) {
    const { data } = await supabase.from('outstanding').select('*').eq('artisan', artisan).eq('paid', false)
    return data || []
  },
  async create(o) {
    const { data } = await supabase.from('outstanding').insert(o).select().single()
    return data
  },
  async markPaid(id, paidDate) {
    const { data } = await supabase.from('outstanding').update({ paid: true, paidDate }).eq('id', id).select().single()
    return data
  },
  async markAllPaid(paidDate) {
    await supabase.from('outstanding').update({ paid: true, paidDate }).eq('paid', false)
  },
  async remove(id) {
    await supabase.from('outstanding').delete().eq('id', id)
  }
}

// --- Settings ---
export const settings = {
  async get() {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    return data || {}
  },
  async save(s) {
    const { data: existing } = await supabase.from('settings').select('id').limit(1)
    if (existing && existing.length) {
      const { data } = await supabase.from('settings').update(s).eq('id', existing[0].id).select().single()
      return data
    }
    const { data } = await supabase.from('settings').insert(s).select().single()
    return data
  }
}

// --- Profiles ---
export const profiles = {
  async get(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  },
  async upsert(profile) {
    const { data } = await supabase.from('profiles').upsert(profile).select().single()
    return data
  }
}
