// ═══════════════════════════════════════════════════
//  src/mock/mockDataManager.js
//  بيانات وهمية خاصة بوضع المدير الضيف
// ═══════════════════════════════════════════════════

const now = new Date()
const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000)
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
const hoursFromNow = (h) => new Date(now.getTime() + h * 60 * 60 * 1000)

// ─────────────────────────────────────────────────
//  المنطقة الوهمية (موقف المدير)
// ─────────────────────────────────────────────────
export const managerZone = {
    zone_id: 'zone_manager_demo',
    zone_name: 'موقف المدير التجريبي',
    location: 'شارع الحرية، وسط المدينة',
    hourly_rate: 120,
    daily_rate: 900,
    weekly_rate: 5000,
    is_active: true,
    spot_types: {
        STANDARD: 25,
        VIP: 4,
        MOTORCYCLE: 10,
        DISABLED: 2,
        ELECTRIC: 3,
    },
    latitude: 36.7538,
    longitude: 3.0588,
    created_at: daysAgo(90),
}

// ─────────────────────────────────────────────────
//  قائمة المناطق — تُستخدم في DataContext كـ zones[]
//  PageManagers يقرأ: zones[0] كـ effectiveZone
// ─────────────────────────────────────────────────
export const managerZones = [managerZone]

// ─────────────────────────────────────────────────
//  أماكن الوقوف (حسب الأنواع)
// ─────────────────────────────────────────────────
const generateSpots = () => {
    const typeLetters = {
        STANDARD: 'A',
        VIP: 'B',
        MOTORCYCLE: 'C',
        DISABLED: 'D',
        ELECTRIC: 'E',
    }
    const statusPool = [
        'AVAILABLE', 'AVAILABLE', 'AVAILABLE',
        'OCCUPIED', 'OCCUPIED',
        'RESERVED', 'RESERVED',
        'MAINTENANCE',
        'AVAILABLE',
    ]
    let idx = 0
    const spots = []
    Object.entries(managerZone.spot_types).forEach(([type, count]) => {
        const letter = typeLetters[type] || 'X'
        for (let i = 1; i <= count; i++) {
            spots.push({
                spot_id: `${managerZone.zone_id}_${letter}_${i}`,
                zone_id: managerZone.zone_id,
                spot_number: `${letter}-${i}`,
                spot_type: type,
                status: statusPool[idx % statusPool.length],
                created_at: managerZone.created_at,
                latitude: (36.7538 + (i * 0.0001)).toString(),
                longitude: (3.0588 + (i * 0.0001)).toString(),
            })
            idx++
        }
    })
    return spots
}

export const managerSpots = generateSpots()

// ─────────────────────────────────────────────────
//  المديرون — تُستخدم في DataContext كـ managers[]
//  PageManagers يقرأ: managers (مُصفَّاة حسب zone_id)
//  الحقول المطلوبة: user_id, full_name, email, phone,
//                   role, zone_id, status, created_at, zone_name
// ─────────────────────────────────────────────────
export const managerUsers = [
    {
        user_id: 'mgr_demo_01',
        full_name: 'محمد العمري',
        email: 'mohamed.omari@smartparking.dz',
        phone: '0555 12 34 56',
        role: 'MANAGER',
        zone_id: managerZone.zone_id,
        status: 'active',
        created_at: daysAgo(90),
        zone_name: managerZone.zone_name,
    },
    {
        user_id: 'mgr_demo_02',
        full_name: 'خديجة بوعلي',
        email: 'khadija.bouali@smartparking.dz',
        phone: '0666 98 76 54',
        role: 'MANAGER',
        zone_id: managerZone.zone_id,
        status: 'active',
        created_at: daysAgo(30),
        zone_name: managerZone.zone_name,
    },
    {
        user_id: 'mgr_demo_03',
        full_name: 'طارق بن سالم',
        email: 'tarek.bensalem@smartparking.dz',
        phone: '0770 45 67 89',
        role: 'MANAGER',
        zone_id: managerZone.zone_id,
        status: 'active',
        created_at: daysAgo(15),
        zone_name: managerZone.zone_name,
    },
]

// اسم مستعار متوافق مع DataContext الذي يتوقع حقل managers
export const managers = managerUsers

// ─────────────────────────────────────────────────
//  الحجوزات — تُستخدم في DataContext كـ reservations[]
//  PageReservations يقرأ: reservation_id, zone_id, spot_number,
//  full_name / user_name, start_time, end_time,
//  total_cost / total_price, status, created_at
// ─────────────────────────────────────────────────
const driverNames = [
    'رشيد كمال', 'سامية محفوظ', 'أنور بن عيسى', 'ليلى شرفي',
    'فؤاد مرزوق', 'نادية بوليفة', 'إسماعيل قوجيل', 'هدى زرمان',
]

const plates = [
    '123-456-16', '234-567-31', '345-678-19', '456-789-25',
    '567-890-16', '678-901-31', '789-012-19', '890-123-25',
]

const managerReservations = []
let resId = 100

// ── حجوزات مكتملة (completed) ─────────────────────
for (let i = 0; i < 16; i++) {
    const spot = managerSpots[i % managerSpots.length]
    const start = daysAgo(Math.floor(i % 15) + 1)
    const dur = (i % 6) + 1
    const end = new Date(start.getTime() + dur * 60 * 60 * 1000)
    const cost = dur * managerZone.hourly_rate

    managerReservations.push({
        reservation_id: `res_mgr_${resId++}`,
        zone_id: managerZone.zone_id,
        spot_id: spot.spot_id,
        spot_number: spot.spot_number,
        user_id: `driver_${i}`,
        full_name: driverNames[i % driverNames.length],
        user_name: driverNames[i % driverNames.length],
        email: `driver${i}@mail.com`,
        phone: '055' + String(5000000 + i).slice(0, 7),
        plate_number: plates[i % plates.length],
        vehicle_number: plates[i % plates.length],
        status: 'completed',
        start_time: start,
        end_time: end,
        total_cost: cost,
        total_price: cost,
        created_at: start,
    })
}

// ── حجوزات نشطة (active) ──────────────────────────
for (let i = 0; i < 4; i++) {
    const spot = managerSpots.find(s => s.status === 'OCCUPIED') || managerSpots[i]
    const start = hoursAgo((i % 4) + 1)

    managerReservations.push({
        reservation_id: `res_mgr_${resId++}`,
        zone_id: managerZone.zone_id,
        spot_id: spot.spot_id,
        spot_number: spot.spot_number,
        user_id: `driver_active_${i}`,
        full_name: driverNames[(i + 5) % driverNames.length],
        user_name: driverNames[(i + 5) % driverNames.length],
        email: `active${i}@mail.com`,
        phone: '077' + String(7000000 + i).slice(0, 7),
        plate_number: plates[(i + 2) % plates.length],
        vehicle_number: plates[(i + 2) % plates.length],
        status: 'active',
        start_time: start,
        end_time: null,
        total_cost: 0,
        total_price: 0,
        created_at: start,
    })
}

// ── حجوزات مؤكدة (confirmed) ─────────────────────
for (let i = 0; i < 3; i++) {
    const spot = managerSpots.find(s => s.status === 'RESERVED') || managerSpots[i + 5]
    const start = hoursFromNow(i * 4 + 1)
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000)
    const cost = 3 * managerZone.hourly_rate

    managerReservations.push({
        reservation_id: `res_mgr_${resId++}`,
        zone_id: managerZone.zone_id,
        spot_id: spot.spot_id,
        spot_number: spot.spot_number,
        user_id: `driver_conf_${i}`,
        full_name: driverNames[(i + 2) % driverNames.length],
        user_name: driverNames[(i + 2) % driverNames.length],
        email: `conf${i}@mail.com`,
        phone: '066' + String(6000000 + i).slice(0, 7),
        plate_number: plates[(i + 4) % plates.length],
        vehicle_number: plates[(i + 4) % plates.length],
        status: 'confirmed',
        start_time: start,
        end_time: end,
        total_cost: cost,
        total_price: cost,
        created_at: hoursAgo(1),
    })
}

// ── حجوزات معلقة (pending) ────────────────────────
for (let i = 0; i < 3; i++) {
    const spot = managerSpots[(i + 10) % managerSpots.length]
    const start = hoursFromNow(i * 2 + 0.5)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const cost = 2 * managerZone.hourly_rate

    managerReservations.push({
        reservation_id: `res_mgr_${resId++}`,
        zone_id: managerZone.zone_id,
        spot_id: spot.spot_id,
        spot_number: spot.spot_number,
        user_id: `driver_pend_${i}`,
        full_name: driverNames[(i + 1) % driverNames.length],
        user_name: driverNames[(i + 1) % driverNames.length],
        email: `pend${i}@mail.com`,
        phone: '055' + String(5500000 + i).slice(0, 7),
        plate_number: plates[(i + 1) % plates.length],
        vehicle_number: plates[(i + 1) % plates.length],
        status: 'pending',
        start_time: start,
        end_time: end,
        total_cost: cost,
        total_price: cost,
        created_at: hoursAgo(0.5),
    })
}

// ── حجوزات ملغاة (cancelled) ─────────────────────
for (let i = 0; i < 4; i++) {
    const spot = managerSpots[(i + 3) % managerSpots.length]
    const start = daysAgo(i + 1)
    const end = new Date(start.getTime() + 1.5 * 60 * 60 * 1000)

    managerReservations.push({
        reservation_id: `res_mgr_${resId++}`,
        zone_id: managerZone.zone_id,
        spot_id: spot.spot_id,
        spot_number: spot.spot_number,
        user_id: `driver_canc_${i}`,
        full_name: driverNames[(i + 3) % driverNames.length],
        user_name: driverNames[(i + 3) % driverNames.length],
        email: `canc${i}@mail.com`,
        phone: '066' + String(6600000 + i).slice(0, 7),
        plate_number: plates[(i + 6) % plates.length],
        vehicle_number: plates[(i + 6) % plates.length],
        status: 'cancelled',
        start_time: start,
        end_time: null,
        total_cost: 0,
        total_price: 0,
        created_at: start,
    })
}

export { managerReservations }

// ─────────────────────────────────────────────────
//  إحصائيات محسوبة
// ─────────────────────────────────────────────────
export const computeManagerStats = (spots = managerSpots, reservations = managerReservations) => {
    const total = spots.length
    const occupied = spots.filter(s => s.status === 'OCCUPIED').length
    const available = spots.filter(s => s.status === 'AVAILABLE').length
    const pct = total > 0 ? Math.round((occupied / total) * 100) : 0

    const completed = reservations.filter(r => r.status === 'completed')
    const todayStr = now.toISOString().slice(0, 10)
    const weekAgo = daysAgo(7)
    const monthStart = now.toISOString().slice(0, 8) + '01'

    const todayRev = completed
        .filter(r => new Date(r.created_at).toISOString().slice(0, 10) === todayStr)
        .reduce((s, r) => s + (r.total_price || 0), 0)
    const weekRev = completed
        .filter(r => new Date(r.created_at) >= weekAgo)
        .reduce((s, r) => s + (r.total_price || 0), 0)
    const monthRev = completed
        .filter(r => new Date(r.created_at).toISOString().slice(0, 10) >= monthStart)
        .reduce((s, r) => s + (r.total_price || 0), 0)
    const totalRev = completed.reduce((s, r) => s + (r.total_price || 0), 0)

    return {
        ok: true,
        total_spots: total,
        occupied_spots: occupied,
        available_spots: available,
        occupancy_rate: pct,
        today_revenue: todayRev,
        week_revenue: weekRev,
        month_revenue: monthRev,
        total_revenue: totalRev,
        recent_reservations: reservations.slice(0, 10),
    }
}

export const managerStats = computeManagerStats()

// ─────────────────────────────────────────────────
//  تقييمات وهمية للمدير
// ─────────────────────────────────────────────────
export const mockFeedbacksManager = [
    {
        feedback_id: 'fb_mgr_01',
        zone_id: managerZone.zone_id,
        user_id: 'driver_0',
        full_name: 'رشيد كمال',
        rating: 5,
        comment: 'موقف ممتاز ونظيف جداً، سهل الوصول إليه',
        created_at: daysAgo(2),
    },
    {
        feedback_id: 'fb_mgr_02',
        zone_id: managerZone.zone_id,
        user_id: 'driver_1',
        full_name: 'سامية محفوظ',
        rating: 4,
        comment: 'خدمة جيدة لكن الإضاءة ليلاً تحتاج تحسين',
        created_at: daysAgo(5),
    },
    {
        feedback_id: 'fb_mgr_03',
        zone_id: managerZone.zone_id,
        user_id: 'driver_2',
        full_name: 'أنور بن عيسى',
        rating: 5,
        comment: 'أفضل موقف في المنطقة، سأعود مجدداً',
        created_at: daysAgo(7),
    },
    {
        feedback_id: 'fb_mgr_04',
        zone_id: managerZone.zone_id,
        user_id: 'driver_3',
        full_name: 'ليلى شرفي',
        rating: 3,
        comment: 'مقبول لكن الأسعار مرتفعة نسبياً',
        created_at: daysAgo(10),
    },
    {
        feedback_id: 'fb_mgr_05',
        zone_id: managerZone.zone_id,
        user_id: 'driver_4',
        full_name: 'فؤاد مرزوق',
        rating: 4,
        comment: 'الموقف آمن والطاقم محترف',
        created_at: daysAgo(14),
    },
]


// ─────────────────────────────────────────────────
//  تصدير موحَّد لـ DataProvider في وضع الضيف
//  استخدام: const GUEST_DATA = getMockGuestData()
//  ثم مرِّر كل حقل لقيمة الـ Context المناسبة
// ─────────────────────────────────────────────────
export const getMockGuestData = () => ({
    zones: managerZones,
    managers: managerUsers,
    reservations: managerReservations,
    spots: managerSpots,
    stats: managerStats,
    feedbacks: mockFeedbacksManager,
})