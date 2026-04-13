import React, { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '../context/useData'   // ✅ إصلاح: من useData.js
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

export default function PageReports() {
  const { zones, spots, reservations } = useData()
  const [rType,     setRType]     = useState('')
  const [rStart,    setRStart]    = useState(new Date().toISOString().slice(0, 8) + '01')
  const [rEnd,      setREnd]      = useState(new Date().toISOString().slice(0, 10))
  const [generated, setGenerated] = useState(false)
  const [rData,     setRData]     = useState({})
  const [loading,   setLoading]   = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  // ✅ إصلاح: حساب إحصائيات المناطق من spots (بدل حقول MySQL)
  const zonesWithStats = useMemo(() => {
    return zones
        .filter(z => z.is_active === true || z.is_active === 1)
        .map(z => {
          const zoneSpots     = spots.filter(s => s.zone_id === z.zone_id)
          const total_spots   = zoneSpots.length || parseInt(z.total_spots) || 0
          const available     = zoneSpots.filter(s => s.status === 'available').length
          const occupied      = total_spots - available
          const occ_pct       = total_spots > 0 ? Math.round((occupied / total_spots) * 100) : 0
          return { ...z, total_spots, available_spots: available, occupied, occ_pct }
        })
  }, [zones, spots])

  // ✅ إصلاح: تحويل Firebase Timestamp إلى string للمقارنة
  const toDateStr = (ts) => {
    if (!ts) return ''
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toISOString().slice(0, 10)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!rType) return
    setLoading(true)

    try {
      if (rType === 'MONTHLY_REVENUE') {
        const completed = reservations.filter(r => {
          if (r.status !== 'completed') return false
          const day = toDateStr(r.created_at)
          return day >= rStart && day <= rEnd
        })

        const byDay = {}
        completed.forEach(r => {
          const day = toDateStr(r.created_at)
          if (!day) return
          if (!byDay[day]) byDay[day] = { day, cnt: 0, total: 0 }
          byDay[day].cnt++
          byDay[day].total += parseFloat(r.total_price || r.total_cost || 0)
        })

        const rows    = Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day))
        const total   = rows.reduce((s, r) => s + r.total, 0)
        const total_c = rows.reduce((s, r) => s + r.cnt,   0)
        const avg     = rows.length ? total / rows.length : 0
        const peaks   = rows.filter(r => r.total > avg * 1.5)

        setRData({ rows, total, total_c, avg, res_count: completed.length, peaks })

      } else if (rType === 'OCCUPANCY') {
        const activeZones = zonesWithStats
        const avgOcc = activeZones.length
            ? (activeZones.reduce((s, z) => s + z.occ_pct, 0) / activeZones.length).toFixed(1)
            : 0

        setRData({
          zones:    activeZones.map(z => ({
            zone_name:       z.zone_name,
            total_spots:     z.total_spots,
            available_spots: z.available_spots,
            occupied:        z.occupied,
            occ:             z.occ_pct,
          })),
          avg_occ:  avgOcc,
          max_zone: activeZones.reduce((a, b) => (a.occ_pct > b.occ_pct ? a : b), activeZones[0] || {}),
          min_zone: activeZones.reduce((a, b) => (a.occ_pct < b.occ_pct ? a : b), activeZones[0] || {}),
        })
      }

      setGenerated(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (fmt) => {

    // ════════════════════════════════════════════════
    // 📄 PDF — الحل: html2canvas يحوّل الـ DOM إلى صورة
    //          فلا توجد مشكلة تشفير العربية
    // ════════════════════════════════════════════════
    if (fmt === 'PDF') {

      // 1) إنشاء div مخفي يحتوي محتوى التقرير بشكل صحيح
      const reportDiv = document.createElement('div')
      reportDiv.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 794px;
      padding: 40px;
      background: white;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #111;
    `

      // ── بناء HTML التقرير ──
      let bodyHTML = ''

      if (rType === 'MONTHLY_REVENUE') {
        bodyHTML = `
        <h2 style="text-align:center; color:#6366f1; margin-bottom:4px;">SmartParking — تقرير الإيرادات</h2>
        <p style="text-align:center; color:#555; margin-bottom:24px;">الفترة: ${rStart} — ${rEnd}</p>

        <div style="display:flex; gap:20px; margin-bottom:28px;">
          <div style="flex:1; background:#f0f0ff; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${rData.total?.toFixed(2)} دج</div>
            <div style="color:#555; margin-top:4px;">إجمالي الإيرادات</div>
          </div>
          <div style="flex:1; background:#f0f0ff; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${rData.total_c}</div>
            <div style="color:#555; margin-top:4px;">إجمالي المعاملات</div>
          </div>
          <div style="flex:1; background:#f0f0ff; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${rData.res_count}</div>
            <div style="color:#555; margin-top:4px;">عدد الحجوزات</div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#6366f1; color:white;">
              <th style="padding:10px; border:1px solid #ddd;">اليوم</th>
              <th style="padding:10px; border:1px solid #ddd;">عدد المدفوعات</th>
              <th style="padding:10px; border:1px solid #ddd;">المجموع (دج)</th>
            </tr>
          </thead>
          <tbody>
            ${rData.rows.map((r, i) => `
              <tr style="background:${i % 2 === 0 ? '#f9f9ff' : 'white'};">
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${r.day}</td>
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${r.cnt}</td>
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${r.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      } else if (rType === 'OCCUPANCY') {
        bodyHTML = `
        <h2 style="text-align:center; color:#6366f1; margin-bottom:4px;">SmartParking — تقرير الإشغال</h2>
        <p style="text-align:center; color:#555; margin-bottom:24px;">الفترة: ${rStart} — ${rEnd}</p>

        <div style="display:flex; gap:20px; margin-bottom:28px;">
          <div style="flex:1; background:#f0f0ff; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${rData.avg_occ}%</div>
            <div style="color:#555; margin-top:4px;">متوسط نسبة الإشغال</div>
          </div>
          <div style="flex:1; background:#f0f0ff; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:22px; font-weight:bold; color:#6366f1;">${rData.zones?.length}</div>
            <div style="color:#555; margin-top:4px;">عدد المواقف</div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#6366f1; color:white;">
              <th style="padding:10px; border:1px solid #ddd;">الموقف</th>
              <th style="padding:10px; border:1px solid #ddd;">إجمالي الأماكن</th>
              <th style="padding:10px; border:1px solid #ddd;">مشغول</th>
              <th style="padding:10px; border:1px solid #ddd;">نسبة الإشغال</th>
            </tr>
          </thead>
          <tbody>
            ${rData.zones.map((z, i) => `
              <tr style="background:${i % 2 === 0 ? '#f9f9ff' : 'white'};">
                <td style="padding:9px 10px; border:1px solid #ddd;">${z.zone_name}</td>
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${z.total_spots}</td>
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${z.occupied}</td>
                <td style="padding:9px 10px; border:1px solid #ddd; text-align:center;">${z.occ}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      }

      reportDiv.innerHTML = bodyHTML
      document.body.appendChild(reportDiv)

      // 2) تحويل الـ div إلى صورة
      const canvas = await html2canvas(reportDiv, {
        scale: 2,           // دقة عالية
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      document.body.removeChild(reportDiv) // تنظيف

      // 3) إدراج الصورة في PDF
      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF('p', 'mm', 'a4')

      const pageWidth  = doc.internal.pageSize.getWidth()   // 210mm
      const pageHeight = doc.internal.pageSize.getHeight()  // 297mm
      const imgWidth   = pageWidth
      const imgHeight  = (canvas.height * pageWidth) / canvas.width

      // إذا المحتوى أطول من صفحة واحدة → تقسيم تلقائي
      let yPosition = 0
      while (yPosition < imgHeight) {
        if (yPosition > 0) doc.addPage()
        doc.addImage(imgData, 'PNG', 0, -yPosition, imgWidth, imgHeight)
        yPosition += pageHeight
      }

      doc.save(`تقرير-SmartParking-${rStart}.pdf`)


      // ════════════════════════════════════════════════
      // 📊 Excel — الحل: RTL + تنسيق الخلايا
      // ════════════════════════════════════════════════
    } else if (fmt === 'Excel') {

      let wsData = []

      if (rType === 'MONTHLY_REVENUE') {
        wsData = [
          ['SmartParking — تقرير الإيرادات'],
          [`الفترة: ${rStart} — ${rEnd}`],
          [],
          ['إجمالي الإيرادات (دج)', rData.total?.toFixed(2)],
          ['إجمالي المعاملات',      rData.total_c],
          ['عدد الحجوزات',          rData.res_count],
          [],
          ['اليوم', 'عدد المدفوعات', 'المجموع (دج)'],
          ...rData.rows.map(r => [r.day, r.cnt, parseFloat(r.total.toFixed(2))])
        ]
      } else if (rType === 'OCCUPANCY') {
        wsData = [
          ['SmartParking — تقرير الإشغال'],
          [`الفترة: ${rStart} — ${rEnd}`],
          [],
          ['متوسط نسبة الإشغال', `${rData.avg_occ}%`],
          ['عدد المواقف',         rData.zones?.length],
          [],
          ['الموقف', 'إجمالي الأماكن', 'مشغول', 'نسبة الإشغال'],
          ...rData.zones.map(z => [z.zone_name, z.total_spots, z.occupied, `${z.occ}%`])
        ]
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // ✅ الإصلاح الرئيسي: RTL للشيت كاملاً
      ws['!rightToLeft'] = true

      // ✅ عرض الأعمدة
      ws['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
      ]

      const wb = XLSX.utils.book_new()

      // ✅ خاصية RTL على مستوى الـ workbook أيضاً
      wb.Workbook = {
        Views: [{ RTL: true }]
      }

      XLSX.utils.book_append_sheet(wb, ws, 'التقرير')
      XLSX.writeFile(wb, `تقرير-SmartParking-${rStart}.xlsx`)
    }
  }

  const occColor = (pct) => pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981'

  return (
      <div className="fade-in">
        {/* Filter Form */}
        <div className="card" style={{ marginBottom: 22 }}>
          <div className="section-title"><i className="fas fa-file-chart-bar" /> توليد التقرير</div>
          <form onSubmit={handleGenerate} style={styles.filterRow}>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="form-label">نوع التقرير</label>
              <select className="form-select" value={rType} onChange={e => { setRType(e.target.value); setGenerated(false) }} required>
                <option value="">-- اختر --</option>
                <option value="MONTHLY_REVENUE">الإيرادات الشهرية</option>
                <option value="OCCUPANCY">نسبة الإشغال</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">من تاريخ</label>
              <input className="form-input" type="date" value={rStart} onChange={e => setRStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">إلى تاريخ</label>
              <input className="form-input" type="date" value={rEnd} onChange={e => setREnd(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 18 }} disabled={loading}>
              {loading
                  ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جاري التوليد...</>
                  : <><i className="fas fa-play" /> توليد التقرير</>
              }
            </button>
          </form>
        </div>

        {/* Revenue Report */}
        {generated && rType === 'MONTHLY_REVENUE' && rData.rows && (
            <>
              <div style={styles.kpiRow}>
                {[
                  { v: rData.total?.toLocaleString('ar-DZ', { minimumFractionDigits: 2 }), l: 'إجمالي الإيرادات (دج)',    c: 'var(--primary)' },
                  { v: rData.total_c,                                                        l: 'إجمالي المعاملات',         c: '#10b981' },
                  { v: rData.avg?.toLocaleString('ar-DZ', { minimumFractionDigits: 2 }),    l: 'متوسط الإيراد/يوم (دج)',  c: '#f59e0b' },
                  { v: rData.res_count,                                                      l: 'الحجوزات في الفترة',       c: '#06b6d4' },
                ].map(k => (
                    <div key={k.l} style={{ ...styles.kpiCard, borderTopColor: k.c }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{k.v}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 5 }}>{k.l}</div>
                    </div>
                ))}
              </div>

              {rData.peaks?.length > 0 && (
                  <div className="card" style={{ background: '#fffbeb', border: '1px solid #fcd34d', marginBottom: 20 }}>
                    <div className="section-title" style={{ borderBottomColor: '#fcd34d', color: '#92400e' }}>
                      <i className="fas fa-fire" style={{ color: '#ef4444' }} /> أيام الذروة
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {rData.peaks.map(pk => (
                          <span key={pk.day} style={{ background: '#fef3c7', color: '#92400e', padding: '5px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700 }}>
                    <i className="fas fa-calendar-alt" /> {pk.day} — {pk.total.toLocaleString()} دج
                  </span>
                      ))}
                    </div>
                  </div>
              )}

              <div style={styles.chartsGrid}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={styles.chartTitle}><i className="fas fa-chart-line" style={{ color: 'var(--primary)' }} /> الإيرادات اليومية</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={rData.rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Tajawal' }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v.toLocaleString() + ' دج', 'إيراد']} />
                      <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 20px 0', ...styles.chartTitle }}><i className="fas fa-table" style={{ color: 'var(--primary)' }} /> قائمة المدفوعات</div>
                  <div className="table-wrap" style={{ maxHeight: 240, overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>اليوم</th><th>المدفوعات</th><th>المجموع (دج)</th></tr></thead>
                      <tbody>
                      {rData.rows.map(rw => (
                          <tr key={rw.day}>
                            <td>{rw.day}</td><td>{rw.cnt}</td>
                            <td><strong style={{ color: '#10b981' }}>{rw.total.toLocaleString('ar-DZ', { minimumFractionDigits: 2 })}</strong></td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
        )}

        {/* Occupancy Report */}
        {generated && rType === 'OCCUPANCY' && rData.zones && (
            <>
              <div style={styles.kpiRow}>
                {[
                  { v: `${rData.avg_occ}%`,      l: 'متوسط نسبة الإشغال',                                    c: 'var(--primary)' },
                  { v: rData.zones.length,         l: 'عدد المواقف',                                           c: '#10b981' },
                  { v: rData.max_zone?.zone_name,  l: `الأكثر إشغالاً — ${rData.max_zone?.occ_pct || 0}%`,   c: '#ef4444' },
                  { v: rData.min_zone?.zone_name,  l: `الأقل إشغالاً — ${rData.min_zone?.occ_pct || 0}%`,    c: '#10b981' },
                ].map(k => (
                    <div key={k.l} style={{ ...styles.kpiCard, borderTopColor: k.c }}>
                      <div style={{ fontSize: String(k.v).length > 4 ? '1rem' : '1.8rem', fontWeight: 900, color: '#0f172a' }}>{k.v}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 5 }}>{k.l}</div>
                    </div>
                ))}
              </div>

              <div style={styles.chartsGrid}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={styles.chartTitle}><i className="fas fa-parking" style={{ color: '#ef4444' }} /> نسبة الإشغال لكل موقف</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={rData.zones}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="zone_name" tick={{ fontSize: 9, fontFamily: 'Tajawal' }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, 'الإشغال']} />
                      <Bar dataKey="occ" radius={[6, 6, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 20px 0', ...styles.chartTitle }}><i className="fas fa-table" style={{ color: 'var(--primary)' }} /> تفاصيل الإشغال</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>الموقف</th><th>إجمالي</th><th>مشغول</th><th>نسبة الإشغال</th></tr></thead>
                      <tbody>
                      {rData.zones.map(zr => {
                        const oc   = parseFloat(zr.occ || 0)
                        const oc_c = occColor(oc)
                        return (
                            <tr key={zr.zone_name}>
                              <td><strong>{zr.zone_name}</strong></td>
                              <td>{zr.total_spots}</td>
                              <td>{zr.occupied}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="occ-bar" style={{ flex: 1 }}>
                                    <div className="occ-bar-fill" style={{ width: `${Math.min(oc, 100)}%`, background: oc_c }} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: oc_c, minWidth: 36 }}>{oc}%</span>
                                </div>
                              </td>
                            </tr>
                        )
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
        )}

        {/* Export */}
        {generated && Object.keys(rData).length > 0 && (
            <div className="card" style={{ background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, marginBottom: 12, color: '#0f172a' }}>
                <i className="fas fa-download" style={{ color: 'var(--primary)' }} /> تصدير التقرير
              </div>
              {exportMsg && <div className="notify notify-ok" style={{ marginBottom: 12 }}><i className="fas fa-check-circle" />{exportMsg}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-success" onClick={() => handleExport('PDF')}><i className="fas fa-file-pdf" /> تصدير PDF</button>
                <button className="btn btn-success" onClick={() => handleExport('Excel')}><i className="fas fa-file-excel" /> تصدير Excel</button>
              </div>
            </div>
        )}
      </div>
  )
}

const styles = {
  filterRow:  { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  kpiRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 },
  kpiCard:    { background: 'white', borderRadius: 14, padding: '20px 22px', border: '1px solid var(--border)', borderTop: '4px solid', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 22 },
  chartTitle: { fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
}