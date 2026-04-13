import React, { useState, useMemo, useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '../context/useData'

export default function PageMap({ isVisible = true }) {
  const { zones, spots } = useData()
  const [mapReady, setMapReady] = useState(false)
  const mapRef        = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef    = useRef([])
  const hasFitRef     = useRef(false)
  const initCalledRef = useRef(false)

  const zonesWithStats = useMemo(() => {
    return zones
        .filter(z => z.is_active === true || z.is_active === 1 || z.is_active === '1')
        .map(z => {
          const zoneSpots     = spots.filter(s => s.zone_id === z.zone_id)
          const total_spots   = zoneSpots.length || parseInt(z.total_spots) || 0
          const available     = zoneSpots.filter(s => s.status === 'available').length
          const occupied      = total_spots - available
          const occ_pct       = total_spots > 0 ? Math.round((occupied / total_spots) * 100) : 0
          return { ...z, total_spots, available_spots: available, occupied, occ_pct }
        })
  }, [zones, spots])

  const activeZones = zonesWithStats

  const spotTypeData = useMemo(() => {
    const total = activeZones.reduce((s, z) => s + (z.total_spots || 0), 0)
    if (!total) return []
    return [
      { name: 'عادي',          value: Math.round(total * 0.60), fill: '#6366f1' },
      { name: 'VIP',           value: Math.round(total * 0.10), fill: '#a855f7' },
      { name: 'ذوي احتياجات', value: Math.round(total * 0.08), fill: '#10b981' },
      { name: 'كهربائي',       value: Math.round(total * 0.12), fill: '#f59e0b' },
      { name: 'دراجة',         value: Math.round(total * 0.10), fill: '#06b6d4' },
    ].filter(d => d.value > 0)
  }, [activeZones])

  const hourlyRates = activeZones.map(z => parseFloat(z.hourly_rate) || 0).filter(r => r > 0)
  const hourlyMin   = hourlyRates.length ? Math.min(...hourlyRates) : 0
  const hourlyMax   = hourlyRates.length ? Math.max(...hourlyRates) : 0
  const hourlyAvg   = hourlyRates.length ? hourlyRates.reduce((s, r) => s + r, 0) / hourlyRates.length : 0

  const occColor = (pct) => pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'

  const popupRow = (bg, color, icon, label, value, valColor = '#0f172a') => `
    <div style="display:flex;align-items:center;justify-content:space-between;
      padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
      <span style="color:#64748b;display:flex;align-items:center;gap:7px;">
        <span style="background:${bg};border-radius:6px;width:24px;height:24px;
          display:inline-flex;align-items:center;justify-content:center;">
          <i class="fas ${icon}" style="color:${color};font-size:11px;"></i>
        </span>${label}
      </span>
      <span style="font-weight:700;font-size:13px;color:${valColor};">${value}</span>
    </div>`

  const addMarkers = (L, map) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // ✅ إصلاح: تنظيف الإحداثيات والتحقق من صحتها
    const withCoords = activeZones.filter(z => {
      const lat = parseFloat(z.latitude)
      const lng = parseFloat(z.longitude)
      return !isNaN(lat) && !isNaN(lng) &&
          lat >= -90  && lat <= 90  &&
          lng >= -180 && lng <= 180 &&
          !(lat === 0 && lng === 0)
    })

    if (!withCoords.length) return

    withCoords.forEach(z => {
      const oc     = z.occ_pct || 0
      const color  = occColor(oc)
      const status = oc >= 90 ? 'ممتلئ' : oc >= 50 ? 'شبه ممتلئ' : 'متاح'
      const daily  = parseFloat(z.daily_rate  || 0)
      const weekly = parseFloat(z.weekly_rate || 0)

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;width:40px;">
            <div style="background:${color};width:40px;height:40px;border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
              box-shadow:0 4px 14px rgba(0,0,0,0.3);border:3px solid white;cursor:pointer;">
              <span style="transform:rotate(45deg);color:white;font-size:14px;font-weight:900;">P</span>
            </div>
            <div style="position:absolute;top:44px;left:50%;transform:translateX(-50%);
              background:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;
              color:#0f172a;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);
              font-family:'Cairo','Segoe UI',sans-serif;border:1px solid #e2e8f0;">
              ${z.zone_name}
            </div>
          </div>`,
        iconSize:    [40, 65],
        iconAnchor:  [20, 40],
        popupAnchor: [0, -50],
      })

      const marker = L.marker(
          [parseFloat(z.latitude), parseFloat(z.longitude)],
          { icon }
      )

      marker.bindPopup(`
        <div style="width:260px;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;direction:rtl;border-radius:14px;overflow:hidden;">
          <div style="background:${color};padding:12px 16px;display:flex;align-items:center;gap:10px;">
            <div style="background:rgba(255,255,255,0.25);width:34px;height:34px;border-radius:10px;
              display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:white;">P</div>
            <div>
              <div style="font-weight:800;font-size:15px;color:white;">${z.zone_name}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">${status}</div>
            </div>
          </div>
          <div style="background:white;padding:14px 16px;">
            ${popupRow('#fef2f2','#ef4444','fa-map-marker-alt','الموقع',   z.location || '—')}
            ${popupRow('#f0f9ff','#3b82f6','fa-layer-group',  'إجمالي',   z.total_spots)}
            ${popupRow('#f0fdf4','#10b981','fa-check-circle', 'متاح',     z.available_spots, '#10b981')}
            ${popupRow('#fef2f2','#ef4444','fa-lock',         'مشغول',    z.occupied, '#ef4444')}
            ${popupRow('#eef2ff','#6366f1','fa-clock',        'بالساعة',  parseFloat(z.hourly_rate||0).toFixed(2)+' دج', '#6366f1')}
            ${daily  ? popupRow('#fffbeb','#f59e0b','fa-sun',           'باليوم',    daily.toFixed(2)+' دج', '#f59e0b') : ''}
            ${weekly ? popupRow('#f5f3ff','#8b5cf6','fa-calendar-week','بالأسبوع',  weekly.toFixed(2)+' دج','#8b5cf6') : ''}
            <div style="margin-top:10px;">
              <div style="background:#f1f5f9;border-radius:20px;height:10px;overflow:hidden;">
                <div style="background:${color};width:${Math.min(oc,100)}%;height:100%;border-radius:20px;"></div>
              </div>
              <div style="text-align:center;margin-top:6px;font-weight:800;font-size:13px;
                color:${color};background:${color}15;border-radius:8px;padding:4px;">إشغال ${oc}%</div>
            </div>
          </div>
        </div>
      `, { maxWidth: 300, className: 'custom-leaflet-popup' })

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    // ✅ الإصلاح الرئيسي: setTimeout لضمان تنفيذ fitBounds بعد رسم الـ markers
    if (!hasFitRef.current && markersRef.current.length) {
      hasFitRef.current = true
      setTimeout(() => {
        if (!leafletMapRef.current) return
        if (markersRef.current.length > 1) {
          const group = L.featureGroup(markersRef.current)
          map.fitBounds(group.getBounds().pad(0.3))
        } else {
          const lat = parseFloat(withCoords[0].latitude)
          const lng = parseFloat(withCoords[0].longitude)
          map.setView([lat, lng], 15)
        }
      }, 150)
    }
  }

  const injectCSS = () => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.getElementById('leaflet-popup-css')) {
      const style = document.createElement('style')
      style.id = 'leaflet-popup-css'
      style.textContent = `
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          padding:0!important;border-radius:14px!important;
          overflow:hidden!important;box-shadow:0 10px 40px rgba(0,0,0,.18)!important;border:none!important; }
        .custom-leaflet-popup .leaflet-popup-content { margin:0!important;width:auto!important; }
        .custom-leaflet-popup .leaflet-popup-tip-container { display:none!important; }
        .custom-leaflet-popup .leaflet-popup-close-button { color:white!important;font-size:18px!important;padding:8px 10px!important;z-index:10; }
        .leaflet-container { z-index:1!important; }
        .leaflet-pane      { z-index:1!important; }
        .leaflet-top,.leaflet-bottom { z-index:2!important; }
        .leaflet-popup-pane { z-index:3!important; }
      `
      document.head.appendChild(style)
    }
  }

  const initMap = () => {
    if (!mapRef.current || leafletMapRef.current || initCalledRef.current) return
    initCalledRef.current = true
    const L = window.L

    // ✅ إصلاح: بدء بـ zoom معقول على الجزائر بدل العالم كله
    const map = L.map(mapRef.current, {
      center: [28.0339, 1.6596],
      zoom: 5,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    leafletMapRef.current = map
    setTimeout(() => setMapReady(true), 0)
  }

  useEffect(() => {
    injectCSS()
    if (window.L) {
      initMap()
    } else if (!document.getElementById('leaflet-js')) {
      const script  = document.createElement('script')
      script.id     = 'leaflet-js'
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = initMap
      document.head.appendChild(script)
    } else {
      const wait = setInterval(() => {
        if (window.L) { clearInterval(wait); initMap() }
      }, 100)
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        hasFitRef.current     = false
        initCalledRef.current = false
      }
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || !window.L) return
    const withCoords = activeZones.filter(z => {
      const lat = parseFloat(z.latitude)
      const lng = parseFloat(z.longitude)
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    })
    if (!withCoords.length) return
    addMarkers(window.L, leafletMapRef.current)
  }, [mapReady, activeZones.length]) // eslint-disable-line

  useEffect(() => {
    if (!isVisible || !leafletMapRef.current) return
    setTimeout(() => {
      leafletMapRef.current.invalidateSize()
      // ✅ إصلاح: إعادة fitBounds عند ظهور الصفحة بعد display:none
      if (markersRef.current.length) {
        const L = window.L
        if (markersRef.current.length > 1) {
          const group = L.featureGroup(markersRef.current)
          leafletMapRef.current.fitBounds(group.getBounds().pad(0.3))
        } else {
          const firstWithCoords = activeZones.find(z => z.latitude && z.longitude)
          if (firstWithCoords) {
            leafletMapRef.current.setView(
                [parseFloat(firstWithCoords.latitude), parseFloat(firstWithCoords.longitude)],
                15
            )
          }
        }
      }
    }, 100)
  }, [isVisible]) // eslint-disable-line

  return (
      <div className="fade-in">

        {/* ── الخريطة ── */}
        <div className="card" style={{ marginBottom: 22, padding: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-map-marked-alt" style={{ color: 'var(--primary)' }} />
              خريطة المواقف التفاعلية
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {activeZones.filter(z => !z.latitude || !z.longitude).length > 0 && (
                  <span style={{ background: '#fefce8', color: '#92400e', padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>
                <i className="fas fa-exclamation-triangle" style={{ marginLeft: 4 }} />
                    {activeZones.filter(z => !z.latitude || !z.longitude).length} موقف بدون إحداثيات
              </span>
              )}
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 12px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
              <span className="live-dot" style={{ marginLeft: 4 }} />
                {activeZones.length} موقف نشط
            </span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {!mapReady && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10, height: 420,
                  background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🗺️</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>جاري تحميل الخريطة...</div>
                  </div>
                </div>
            )}
            <div ref={mapRef} style={{ height: 420, width: '100%' }} />
            <div style={styles.legend}>
              {[
                { c: '#10b981', l: 'متاح (< 50%)' },
                { c: '#f59e0b', l: 'شبه ممتلئ (50–80%)' },
                { c: '#ef4444', l: 'ممتلئ (> 80%)' },
              ].map(item => (
                  <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.c, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', color: '#475569' }}>{item.l}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── جدول المواقف ── */}
        <div className="card" style={{ marginBottom: 22, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-tags" style={{ color: 'var(--primary)' }} />
              جدول المواقف والأسعار
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{activeZones.length} موقف نشط</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
              <tr>
                <th>اسم الموقف</th><th>الموقع</th><th>الأماكن</th><th>نسبة الإشغال</th>
                <th><i className="fas fa-clock"         style={{ marginLeft: 5, color: '#6366f1' }} />بالساعة</th>
                <th><i className="fas fa-sun"            style={{ marginLeft: 5, color: '#f59e0b' }} />باليوم</th>
                <th><i className="fas fa-calendar-week"  style={{ marginLeft: 5, color: '#8b5cf6' }} />بالأسبوع</th>
                <th>الحالة</th>
              </tr>
              </thead>
              <tbody>
              {activeZones.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty-state"><i className="fas fa-parking" /><p>لا توجد مواقف نشطة</p></div></td></tr>
              ) : activeZones.map(z => {
                const oc        = z.occ_pct || 0
                const oc_c      = occColor(oc)
                const status    = oc >= 90 ? 'ممتلئ' : oc >= 50 ? 'شبه ممتلئ' : 'متاح'
                const statusCls = oc >= 90
                    ? { bg: '#fef2f2', c: '#dc2626' }
                    : oc >= 50
                        ? { bg: '#fefce8', c: '#92400e' }
                        : { bg: '#f0fdf4', c: '#15803d' }
                return (
                    <tr key={z.zone_id}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{z.zone_name}</strong>
                        {z.latitude && (
                            <div style={{ fontSize: '0.68rem', color: '#10b981', marginTop: 2 }}>
                              <i className="fas fa-crosshairs" style={{ marginLeft: 3 }} />
                              {parseFloat(z.latitude).toFixed(4)}, {parseFloat(z.longitude).toFixed(4)}
                            </div>
                        )}
                      </td>
                      <td><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i className="fas fa-map-marker-alt" style={{ color: '#ef4444', fontSize: '0.75rem' }} />{z.location || '—'}</span></td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 700 }}>{z.total_spots}</span> إجمالي<br />
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{z.available_spots}</span> متاح /
                          <span style={{ color: '#ef4444', fontWeight: 600 }}> {z.occupied}</span> مشغول
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="occ-bar" style={{ width: 80 }}>
                            <div className="occ-bar-fill" style={{ width: `${Math.min(oc, 100)}%`, background: oc_c }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: oc_c }}>{oc}%</span>
                        </div>
                      </td>
                      <td><span className="price-tag price-hourly"><i className="fas fa-clock" style={{ fontSize: '0.65rem' }} /> {parseFloat(z.hourly_rate || 0).toFixed(2)} دج</span></td>
                      <td>{z.daily_rate  ? <span className="price-tag price-daily"><i className="fas fa-sun" style={{ fontSize: '0.65rem' }} /> {parseFloat(z.daily_rate).toFixed(2)} دج</span>   : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td>{z.weekly_rate ? <span className="price-tag price-weekly"><i className="fas fa-calendar-week" style={{ fontSize: '0.65rem' }} /> {parseFloat(z.weekly_rate).toFixed(2)} دج</span> : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td><span style={{ ...styles.statusBadge, background: statusCls.bg, color: statusCls.c }}>{status}</span></td>
                    </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── الرسوم البيانية ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={styles.chartTitle}>
              <i className="fas fa-parking" style={{ color: 'var(--primary)' }} /> توزيع الأماكن حسب النوع (تقديري)
            </div>
            {spotTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={spotTypeData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                         label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {spotTypeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v + ' مكان', n]} />
                  </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="empty-state" style={{ height: 200 }}><i className="fas fa-chart-pie" /><p>لا توجد بيانات</p></div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={styles.chartTitle}>
              <i className="fas fa-info-circle" style={{ color: 'var(--primary)' }} /> ملخص الأسعار
            </div>
            {hourlyRates.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {[
                    { label: 'أقل سعر بالساعة',      value: `${hourlyMin.toFixed(2)} دج`, bg: '#eff6ff', c: '#1d4ed8', icon: 'fa-arrow-down' },
                    { label: 'متوسط السعر بالساعة',   value: `${hourlyAvg.toFixed(2)} دج`, bg: '#fdf4ff', c: '#7e22ce', icon: 'fa-calculator' },
                    { label: 'أعلى سعر بالساعة',      value: `${hourlyMax.toFixed(2)} دج`, bg: '#fff7ed', c: '#c2410c', icon: 'fa-arrow-up'  },
                    { label: 'إجمالي المواقف النشطة', value: `${activeZones.length} موقف`, bg: '#f0fdf4', c: '#15803d', icon: 'fa-parking'  },
                  ].map(r => (
                      <div key={r.label} style={{ padding: '13px 16px', background: r.bg, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', color: r.c, fontWeight: 600 }}>
                    <i className={`fas ${r.icon}`} style={{ marginLeft: 6 }} />{r.label}
                  </span>
                        <strong style={{ fontSize: '1.1rem', color: r.c }}>{r.value}</strong>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="empty-state" style={{ height: 200 }}><i className="fas fa-tags" /><p>لا توجد مواقف نشطة</p></div>
            )}
          </div>
        </div>
      </div>
  )
}

const styles = {
  legend: {
    position: 'absolute', bottom: 30, right: 10,
    background: 'white', borderRadius: 10, padding: '10px 14px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    display: 'flex', flexDirection: 'column', gap: 6, zIndex: 999,
  },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 },
  chartTitle:  { fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
}