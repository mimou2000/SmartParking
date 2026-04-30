// ══════════════════════════════════════════════════════
//  src/mock/mockData.js
//  بيانات وهمية لوضع الضيف (Guest Mode)
//  تستخدم بدلاً من Firebase عندما user.isGuest === true
// ══════════════════════════════════════════════════════

// معرّفات ثابتة لتسهيل الربط بين الكيانات
export const GUEST_MANAGER_ZONE_ID = 'zone_demo_01'

const now = new Date()
const hoursAgo  = (h) => new Date(now.getTime() - h * 60 * 60 * 1000)
const daysAgo   = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
const hoursFromNow = (h) => new Date(now.getTime() + h * 60 * 60 * 1000)

// ══════════════════════════════════════════════════════
//  ZONES (5 مواقف متنوعة)
// ══════════════════════════════════════════════════════
export const mockZones = [
    {
        zone_id:     GUEST_MANAGER_ZONE_ID,
        zone_name:   'موقف وسط المدينة',
        location:    'شارع ديدوش مراد، الجزائر العاصمة',
        hourly_rate: 100,
        daily_rate:  800,
        weekly_rate: 4500,
        is_active:   true,
        spot_types:  { STANDARD: 20, VIP: 5, MOTORCYCLE: 8, DISABLED: 2, ELECTRIC: 5 },
        created_at:  daysAgo(120),
    },
    {
        zone_id:     'zone_demo_02',
        zone_name:   'موقف المطار الدولي',
        location:    'مطار هواري بومدين، الدار البيضاء',
        hourly_rate: 150,
        daily_rate:  1200,
        weekly_rate: 7000,
        is_active:   true,
        spot_types:  { STANDARD: 40, VIP: 10, MOTORCYCLE: 5, DISABLED: 4, ELECTRIC: 6 },
        created_at:  daysAgo(95),
    },
    {
        zone_id:     'zone_demo_03',
        zone_name:   'موقف باب الزوار',
        location:    'حي باب الزوار، الجزائر العاصمة',
        hourly_rate: 80,
        daily_rate:  600,
        weekly_rate: null,
        is_active:   true,
        spot_types:  { STANDARD: 25, VIP: 0, MOTORCYCLE: 10, DISABLED: 2, ELECTRIC: 3 },
        created_at:  daysAgo(60),
    },
    {
        zone_id:     'zone_demo_04',
        zone_name:   'موقف وهران المركز',
        location:    'شارع الأمير عبد القادر، وهران',
        hourly_rate: 90,
        daily_rate:  700,
        weekly_rate: 4000,
        is_active:   true,
        spot_types:  { STANDARD: 30, VIP: 6, MOTORCYCLE: 12, DISABLED: 3, ELECTRIC: 4 },
        created_at:  daysAgo(45),
    },
    {
        zone_id:     'zone_demo_05',
        zone_name:   'موقف قسنطينة',
        location:    'وسط قسنطينة',
        hourly_rate: 70,
        daily_rate:  500,
        weekly_rate: null,
        is_active:   false,
        spot_types:  { STANDARD: 15, VIP: 0, MOTORCYCLE: 6, DISABLED: 1, ELECTRIC: 0 },
        created_at:  daysAgo(20),
    },
]

// ══════════════════════════════════════════════════════
//  SPOTS (توليد أماكن لكل موقف)
// ══════════════════════════════════════════════════════
const TYPE_LETTERS = { STANDARD: 'A', VIP: 'B', MOTORCYCLE: 'C', DISABLED: 'D', ELECTRIC: 'E' }
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'AVAILABLE', 'AVAILABLE', 'RESERVED', 'AVAILABLE', 'MAINTENANCE', 'AVAILABLE']

const generateSpots = () => {
    const spots = []
    mockZones.forEach((zone) => {
        Object.entries(zone.spot_types).forEach(([type, count]) => {
            const letter = TYPE_LETTERS[type] || 'X'
            for (let i = 1; i <= count; i++) {
                spots.push({
                    spot_id:     `${zone.zone_id}_${letter}_${i}`,
                    zone_id:     zone.zone_id,
                    spot_number: `${letter}-${i}`,
                    spot_type:   type,
                    status:      STATUSES[(i + letter.charCodeAt(0)) % STATUSES.length],
                    created_at:  zone.created_at,
                })
            }
        })
    })
    return spots
}

export const mockSpots = generateSpots()

// ══════════════════════════════════════════════════════
//  USERS (مدراء + مسؤولون)
// ══════════════════════════════════════════════════════
export const mockUsers = [
    {
        user_id:    'user_admin_01',
        full_name:  'أحمد بن علي',
        email:      'admin1@smartparking.com',
        phone:      '0555123456',
        role:       'ADMIN',
        status:     'active',
        created_at: daysAgo(180),
    },
    {
        user_id:    'user_admin_02',
        full_name:  'فاطمة الزهراء',
        email:      'admin2@smartparking.com',
        phone:      '0666234567',
        role:       'ADMIN',
        status:     'active',
        created_at: daysAgo(150),
    },
    {
        user_id:    'user_mgr_01',
        full_name:  'محمد بوزيد',
        email:      'mgr.center@smartparking.com',
        phone:      '0555345678',
        role:       'MANAGER',
        zone_id:    GUEST_MANAGER_ZONE_ID,
        status:     'active',
        created_at: daysAgo(120),
    },
    {
        user_id:    'user_mgr_02',
        full_name:  'كريم حمداوي',
        email:      'mgr.airport@smartparking.com',
        phone:      '0666456789',
        role:       'MANAGER',
        zone_id:    'zone_demo_02',
        status:     'active',
        created_at: daysAgo(95),
    },
    {
        user_id:    'user_mgr_03',
        full_name:  'ياسمين قاسمي',
        email:      'mgr.babezzouar@smartparking.com',
        phone:      '0777567890',
        role:       'MANAGER',
        zone_id:    'zone_demo_03',
        status:     'active',
        created_at: daysAgo(60),
    },
    {
        user_id:    'user_mgr_04',
        full_name:  'عبد الرحمان شريف',
        email:      'mgr.oran@smartparking.com',
        phone:      '0555678901',
        role:       'MANAGER',
        zone_id:    'zone_demo_04',
        status:     'active',
        created_at: daysAgo(45),
    },
    {
        user_id:    'user_mgr_05',
        full_name:  'نور الهدى',
        email:      'mgr.constantine@smartparking.com',
        phone:      '0666789012',
        role:       'MANAGER',
        zone_id:    'zone_demo_05',
        status:     'inactive',
        created_at: daysAgo(20),
    },
]

// نسخة managers (نفس بيانات users بدور MANAGER) - مطابقة لما يرجعه firebaseApi
export const mockManagers = mockUsers.filter(u => u.role === 'MANAGER').map(u => ({ ...u }))

// ══════════════════════════════════════════════════════
//  RESERVATIONS (حجوزات متنوعة)
// ══════════════════════════════════════════════════════
const driverNames = [
    'سفيان مرابط', 'ليلى عمراني', 'رشيد بلقاسم', 'سامية حداد', 'يونس بن صالح',
    'مريم بوعلام', 'إلياس قدور', 'هدى زرواطي', 'بلال شعلان', 'أمينة طاهري',
    'ناصر مالك', 'سعاد بن يحيى', 'وليد عيساوي', 'رانية جلال', 'فؤاد بوخريص',
]

const plateNumbers = [
    '12345-116-16', '23456-117-31', '34567-118-19', '45678-119-25',
    '56789-120-16', '67890-121-31', '78901-122-19', '89012-123-25',
]

const generateReservations = () => {
    const reservations = []
    let id = 1

    // 25 حجز مكتمل (للإيرادات)
    for (let i = 0; i < 25; i++) {
        const zone  = mockZones[i % mockZones.length]
        const spot  = mockSpots.find(s => s.zone_id === zone.zone_id)
        const start = daysAgo(Math.floor(Math.random() * 30) + 1)
        const dur   = Math.floor(Math.random() * 6) + 1
        const end   = new Date(start.getTime() + dur * 60 * 60 * 1000)
        const cost  = dur * zone.hourly_rate

        reservations.push({
            id:           `res_${id++}`,
            zone_id:      zone.zone_id,
            spot_id:      spot?.spot_id || null,
            spot_number:  spot?.spot_number || 'A-1',
            user_id:      `guest_user_${i}`,
            user_name:    driverNames[i % driverNames.length],
            full_name:    driverNames[i % driverNames.length],
            phone:        '055' + (1000000 + i * 7919).toString().slice(0, 7),
            plate_number: plateNumbers[i % plateNumbers.length],
            status:       'completed',
            start_time:   start,
            end_time:     end,
            total_cost:   cost,
            total_price:  cost,
            created_at:   start,
        })
    }

    // 8 حجوزات نشطة (active)
    for (let i = 0; i < 8; i++) {
        const zone = mockZones[i % 4]
        const spot = mockSpots.find(s => s.zone_id === zone.zone_id && s.status === 'OCCUPIED')
        const start = hoursAgo(Math.floor(Math.random() * 5) + 1)

        reservations.push({
            id:           `res_${id++}`,
            zone_id:      zone.zone_id,
            spot_id:      spot?.spot_id || null,
            spot_number:  spot?.spot_number || 'A-2',
            user_id:      `guest_active_${i}`,
            user_name:    driverNames[(i + 5) % driverNames.length],
            full_name:    driverNames[(i + 5) % driverNames.length],
            phone:        '066' + (2000000 + i * 6131).toString().slice(0, 7),
            plate_number: plateNumbers[(i + 2) % plateNumbers.length],
            status:       'active',
            start_time:   start,
            end_time:     null,
            total_cost:   0,
            total_price:  0,
            created_at:   start,
        })
    }

    // 4 حجوزات مؤكدة (confirmed - قادمة)
    for (let i = 0; i < 4; i++) {
        const zone = mockZones[i % 3]
        const spot = mockSpots.find(s => s.zone_id === zone.zone_id && s.status === 'RESERVED')
        const start = hoursFromNow(i * 3 + 2)
        const end   = new Date(start.getTime() + 3 * 60 * 60 * 1000)

        reservations.push({
            id:           `res_${id++}`,
            zone_id:      zone.zone_id,
            spot_id:      spot?.spot_id || null,
            spot_number:  spot?.spot_number || 'A-3',
            user_id:      `guest_conf_${i}`,
            user_name:    driverNames[(i + 10) % driverNames.length],
            full_name:    driverNames[(i + 10) % driverNames.length],
            phone:        '077' + (3000000 + i * 4283).toString().slice(0, 7),
            plate_number: plateNumbers[(i + 4) % plateNumbers.length],
            status:       'confirmed',
            start_time:   start,
            end_time:     end,
            total_cost:   3 * zone.hourly_rate,
            total_price:  3 * zone.hourly_rate,
            created_at:   hoursAgo(1),
        })
    }

    // 3 حجوزات ملغاة
    for (let i = 0; i < 3; i++) {
        const zone = mockZones[i]
        reservations.push({
            id:           `res_${id++}`,
            zone_id:      zone.zone_id,
            spot_id:      null,
            spot_number:  null,
            user_id:      `guest_canc_${i}`,
            user_name:    driverNames[(i + 12) % driverNames.length],
            full_name:    driverNames[(i + 12) % driverNames.length],
            phone:        '055' + (4000000 + i * 9871).toString().slice(0, 7),
            plate_number: plateNumbers[i % plateNumbers.length],
            status:       'cancelled',
            start_time:   daysAgo(i + 1),
            end_time:     null,
            total_cost:   0,
            total_price:  0,
            created_at:   daysAgo(i + 1),
        })
    }

    return reservations.sort((a, b) => b.created_at - a.created_at)
}

export const mockReservations = generateReservations()

// ══════════════════════════════════════════════════════
//  STATS (محسوبة من البيانات الوهمية)
// ══════════════════════════════════════════════════════
export const computeMockStats = (zones = mockZones, reservations = mockReservations) => {
    const totalSpots = zones
        .filter(z => z.is_active && z.spot_types)
        .reduce((s, z) => s + Object.values(z.spot_types).reduce((a, b) => a + b, 0), 0)

    const completed = reservations.filter(r => r.status === 'completed')
    const todayStr  = now.toISOString().slice(0, 10)
    const weekAgo   = daysAgo(7)
    const monthAgo  = daysAgo(30)

    const totalRevenue = completed.reduce((s, r) => s + (r.total_price || 0), 0)
    const todayRevenue = completed
        .filter(r => r.end_time && r.end_time.toISOString().slice(0, 10) === todayStr)
        .reduce((s, r) => s + (r.total_price || 0), 0)
    const weekRevenue = completed
        .filter(r => r.end_time && r.end_time >= weekAgo)
        .reduce((s, r) => s + (r.total_price || 0), 0)
    const monthRevenue = completed
        .filter(r => r.end_time && r.end_time >= monthAgo)
        .reduce((s, r) => s + (r.total_price || 0), 0)

    const occupiedSpots  = reservations.filter(r => r.status === 'active').length
    const availableSpots = Math.max(0, totalSpots - occupiedSpots)
    const occupancyRate  = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0

    return {
        ok:                  true,
        total_spots:         totalSpots,
        available_spots:     availableSpots,
        occupied_spots:      occupiedSpots,
        occupancy_rate:      occupancyRate,
        total_revenue:       totalRevenue,
        today_revenue:       todayRevenue,
        week_revenue:        weekRevenue,
        month_revenue:       monthRevenue,
        recent_reservations: reservations.slice(0, 10),
    }
}

export const mockStats = computeMockStats()
