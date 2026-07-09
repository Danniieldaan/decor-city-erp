export const FTYPES = [
  'Single Frame', 'Double Frame', 'Triple Frame', 'Multi-Photo',
  'Box Frame', 'Deep Box Frame', 'Tray Frame', 'Float Frame',
  'Canvas Frame', 'Mirror Frame', 'Certificate Frame', 'Ribba Style',
  'Collage Frame', 'Custom Shape', 'Oval Frame', 'Hexagon Frame',
  'Acrylic Frame', 'LED Frame', 'Corner Frame', 'Poster Frame',
  'Bible Frame', 'A4 Frame', 'Clip Frame', 'Chassis', 'Flex Frame'
]

export const STAGES_MAP = {
  'Single Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Double Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Triple Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Multi-Photo': ['Cutting', 'Join & Glue', 'Mounting', 'Fitting'],
  'Box Frame': ['Cutting', 'Join & Glue', 'Box Assembly', 'Backing', 'Fitting'],
  'Deep Box Frame': ['Cutting', 'Join & Glue', 'Box Assembly', 'Backing', 'Fitting'],
  'Tray Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Canvas Frame': ['Cutting', 'Join & Glue', 'Canvas Stretch', 'Backing', 'Fitting'],
  'Mirror Frame': ['Cutting', 'Join & Glue', 'Mirror Fit', 'Backing'],
  'Certificate Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Ribba Style': ['Cutting', 'Join & Glue', 'Box Assembly', 'Backing', 'Fitting'],
  'Collage Frame': ['Cutting', 'Join & Glue', 'Mounting', 'Fitting'],
  'Custom Shape': ['Cutting', 'Shaping', 'Join & Glue', 'Backing', 'Fitting'],
  'Oval Frame': ['Cutting', 'Oval Join', 'Backing', 'Fitting'],
  'Hexagon Frame': ['Cutting', 'Hex Join', 'Backing', 'Fitting'],
  'Acrylic Frame': ['Cutting', 'Polish', 'Join', 'Backing'],
  'LED Frame': ['Cutting', 'Join & Glue', 'LED Install', 'Backing', 'Fitting'],
  'Corner Frame': ['Corner Cut', 'Join', 'Backing'],
  'Poster Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Bible Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'A4 Frame': ['Cutting', 'Join & Glue', 'Backing', 'Fitting'],
  'Clip Frame': ['Cutting', 'Join', 'Backing'],
  'Chassis': ['Cutting', 'Join & Glue', 'Chassis Assembly', 'Backing'],
  'Flex Frame': ['Cutting', 'Flex Join', 'Backing', 'Fitting']
}

export const SL = {
  'Cutting': 'Cutting',
  'Join & Glue': 'Join & Glue',
  'Join': 'Join',
  'Backing': 'Backing',
  'Fitting': 'Fitting',
  'Mounting': 'Mounting',
  'Box Assembly': 'Box Assembly',
  'Canvas Stretch': 'Canvas Stretch',
  'Mirror Fit': 'Mirror Fit',
  'Shaping': 'Shaping',
  'Oval Join': 'Oval Join',
  'Hex Join': 'Hex Join',
  'Polish': 'Polish',
  'LED Install': 'LED Install',
  'Corner Cut': 'Corner Cut',
  'Chassis Assembly': 'Chassis Assembly',
  'Flex Join': 'Flex Join'
}

export const STAGES = [
  'Cutting', 'Join & Glue', 'Join', 'Backing', 'Fitting',
  'Mounting', 'Box Assembly', 'Canvas Stretch', 'Mirror Fit',
  'Shaping', 'Oval Join', 'Hex Join', 'Polish', 'LED Install',
  'Corner Cut', 'Chassis Assembly', 'Flex Join'
]

export const REPS = []

export const TIERS = ['Economy', 'Standard', 'Premium', 'Luxury']

export const TIER_COLORS = { 'Economy': 'sco', 'Standard': 'ssn', 'Premium': 'spr', 'Luxury': 'sdr' }

export const ALL_PERMS = [
  'reports', 'production', 'payroll', 'settings',
  'edit_receipts', 'delete_customers', 'delete_invoices', 'delete_receipts'
]

export const PERM_LABELS = {
  reports: 'Access Reports',
  production: 'Access Production',
  payroll: 'Access Payroll',
  settings: 'Access Settings',
  edit_receipts: 'Edit Receipts',
  delete_customers: 'Delete Customers',
  delete_invoices: 'Delete Invoices',
  delete_receipts: 'Delete Receipts'
}

export const PAY_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'POS', 'USSD']
export const PRIORITIES = ['normal', 'high', 'urgent']
