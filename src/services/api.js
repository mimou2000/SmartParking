// ═══════════════════════════════════════════
//  src/services/firebaseApi.js
//  طبقة التواصل مع PHP API
// ═══════════════════════════════════════════

const BASE = 'http://localhost:80/smartparking/api'

// ── مساعد طلبات ──────────────────────────────
async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`)
  }
  return json
}

// ══════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════
export const usersAPI = {
  getAll:  ()         => request(`${BASE}/users.php`),
  create:  (data)     => request(`${BASE}/users.php`,         { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data) => request(`${BASE}/users.php?id=${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
  remove:  (id)       => request(`${BASE}/users.php?id=${id}`, { method: 'DELETE' }),
}

// ══════════════════════════════════════════════
//  ZONES
// ══════════════════════════════════════════════
export const zonesAPI = {
  getAll:  ()         => request(`${BASE}/zones.php`),
  create:  (data)     => request(`${BASE}/zones.php`,         { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data) => request(`${BASE}/zones.php?id=${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
  remove:  (id)       => request(`${BASE}/zones.php?id=${id}`, { method: 'DELETE' }),
}

// ══════════════════════════════════════════════
//  SPOTS
// ══════════════════════════════════════════════
export const spotsAPI = {
  getAll:        ()             => request(`${BASE}/spots.php`),
  updateStatus:  (id, status)   => request(`${BASE}/spots.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}

// ══════════════════════════════════════════════
//  RESERVATIONS
// ══════════════════════════════════════════════
export const reservationsAPI = {
  getAll:        ()             => request(`${BASE}/reservations.php`),
  updateStatus:  (id, status)   => request(`${BASE}/reservations.php?id=${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
}
