export function fmt(n) {
  if (n == null || isNaN(n)) return '\u20a60.00'
  return '\u20a6' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fd(d) {
  if (!d) return ''
  var p = d.split('-')
  if (p.length !== 3) return d
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return +p[2] + ' ' + months[+p[1] - 1] + ' ' + p[0]
}

export function fdl(d) {
  if (!d) return ''
  var p = d.split('-')
  if (p.length !== 3) return d
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return +p[2] + ' ' + months[+p[1] - 1]
}

export function esc(s) {
  if (typeof s !== 'string') return s || ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function nid(prefix) {
  var n = Date.now() + Math.floor(Math.random() * 1000)
  return prefix + '_' + n
}

export function localDate() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function getWeekStart(d) {
  var date = new Date(d)
  var day = date.getDay()
  var diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date.toISOString().split('T')[0]
}

export function getWeekEnd(d) {
  var start = new Date(getWeekStart(d))
  start.setDate(start.getDate() + 6)
  return start.toISOString().split('T')[0]
}

export function wkRange() {
  var today = new Date()
  var monday = new Date(today)
  var day = today.getDay()
  var diff = today.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  var sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { mo: monday, su: sunday }
}

export function isWk(d) {
  var r = wkRange()
  if (!d) return false
  var date = new Date(d + 'T00:00:00')
  return date >= r.mo && date <= r.su
}

export function invNum(id, date) {
  if (!id) return 'INV-0000'
  var y = date ? date.substring(2, 4) : '00'
  return 'INV-' + y + String(id).slice(-4).padStart(4, '0')
}

export function rcptNum(id) {
  return 'R-' + String(id).padStart(4, '0')
}

export function sTier(w, h) {
  if (!w && !h) return 'Standard'
  var a = (w || 0) * (h || 0)
  if (a <= 800) return 'Economy'
  if (a <= 2400) return 'Standard'
  if (a <= 5000) return 'Premium'
  return 'Luxury'
}

export function tc(tier) {
  var map = { Economy: 'sco', Standard: 'ssn', Premium: 'spr', Luxury: 'sdr' }
  return map[tier] || 'ssn'
}

export function sc(stat) {
  var map = { Completed: 'sco', 'In Progress': 'spr', Issued: 'ssn', Draft: 'sdr' }
  return map[stat] || 'ssn'
}

export function calcPrice(w, h, ft) {
  if (!w || !h || !ft) return 0
  var area = w * h
  var base = 0
  if (ft === 'Single Frame' || ft === 'Poster Frame' || ft === 'A4 Frame') base = 500
  else if (ft === 'Double Frame') base = 800
  else if (ft === 'Triple Frame' || ft === 'Tray Frame') base = 1200
  else if (ft === 'Box Frame' || ft === 'Ribba Style') base = 1500
  else if (ft === 'Deep Box Frame') base = 2000
  else if (ft === 'Canvas Frame') base = 1800
  else if (ft === 'Mirror Frame') base = 1500
  else if (ft === 'Certificate Frame' || ft === 'Bible Frame') base = 400
  else if (ft === 'Collage Frame' || ft === 'Multi-Photo') base = 1500
  else if (ft === 'Custom Shape' || ft === 'Oval Frame' || ft === 'Hexagon Frame') base = 2500
  else if (ft === 'Acrylic Frame') base = 3000
  else if (ft === 'LED Frame') base = 5000
  else if (ft === 'Corner Frame') base = 350
  else if (ft === 'Clip Frame') base = 300
  else if (ft === 'Chassis') base = 2200
  else if (ft === 'Flex Frame') base = 2500
  else base = 500
  var areaFactor = area / 100
  return Math.round(base * Math.max(1, areaFactor))
}

export function isFrameItem(ft) {
  return ft && ft.trim() !== ''
}
