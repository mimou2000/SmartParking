/**
 * SmartParking — Firebase Cloud Function
 * إعادة تعيين كلمة السر المؤقتة + إرسال إيميل عبر MailerSend
 *
 * Deploy: firebase deploy --only functions
 */

const { onRequest } = require('firebase-functions/v2/https')
const admin         = require('firebase-admin')
const nodemailer    = require('nodemailer')

admin.initializeApp()

// ── SMTP Config (MailerSend) ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host:   'smtp.mailersend.net',
    port:   587,
    secure: false,
    auth: {
        user: 'MS_BIsGCu@test-51ndgwvm6q5lzqx8.mlsender.net',
        pass: 'mssp.PBPGeQk.pq3enl6mn38g2vwr.E08sZ55',   // ⚠️ استبدل بـ env variable
    },
})

// ── توليد كلمة سر مؤقتة ──────────────────────────────────────────────────────
function generateTempPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789@#'
    let pass = 'SP@'  // prefix ثابت مثل الصورة
    for (let i = 0; i < length - 3; i++) {
        pass += chars[Math.floor(Math.random() * chars.length)]
    }
    return pass
}

// ── Cloud Function ─────────────────────────────────────────────────────────────
exports.sendTempPassword = onRequest(
    {
        region: 'europe-west1',   // غيّر للمنطقة الأقرب لك
        cors: true,
    },
    async (req, res) => {

        // فقط POST
        if (req.method !== 'POST') {
            return res.status(405).json({ ok: false, message: 'Method Not Allowed' })
        }

        const { email } = req.body

        // تحقق من البريد
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ ok: false, message: 'البريد الإلكتروني غير صالح' })
        }

        try {
            // 1️⃣ تحقق أن المستخدم موجود في Firebase Auth
            let userRecord
            try {
                userRecord = await admin.auth().getUserByEmail(email)
            } catch {
                // لا تكشف إن كان البريد موجوداً أم لا (أمان)
                return res.status(200).json({
                    ok: true,
                    message: 'إذا كان البريد مسجّلاً، ستصلك كلمة السر المؤقتة خلال دقائق'
                })
            }

            // 2️⃣ ولّد كلمة سر مؤقتة
            const tempPassword = generateTempPassword()

            // 3️⃣ حدّث كلمة السر في Firebase Auth
            await admin.auth().updateUser(userRecord.uid, {
                password: tempPassword,
            })

            // 4️⃣ احفظ وقت انتهاء الصلاحية في Firestore (30 دقيقة)
            const expiresAt = Date.now() + 30 * 60 * 1000
            await admin.firestore()
                .collection('tempPasswords')
                .doc(userRecord.uid)
                .set({ tempPassword, expiresAt, used: false })

            // 5️⃣ أرسل الإيميل
            const displayName = userRecord.displayName || email.split('@')[0]
            await transporter.sendMail({
                from:    '"SmartParking" <MS_BIsGCu@test-51ndgwvm6q5lzqx8.mlsender.net>',
                to:      email,
                subject: '🔑 كلمة السر المؤقتة — SmartParking',
                html:    buildEmailHTML(displayName, tempPassword),
                text:    `كلمة السر المؤقتة: ${tempPassword} — صالحة 30 دقيقة فقط`,
            })

            return res.status(200).json({
                ok: true,
                message: 'تم إرسال كلمة السر المؤقتة إلى بريدك الإلكتروني ✅'
            })

        } catch (err) {
            console.error('sendTempPassword error:', err)
            return res.status(500).json({ ok: false, message: 'حدث خطأ، حاول مرة أخرى' })
        }
    }
)

// ── قالب الإيميل HTML ─────────────────────────────────────────────────────────
function buildEmailHTML(name, tempPass) {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4c1d95,#6366f1);padding:36px 40px;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:28px;line-height:64px;">
              🅿️
            </div>
            <div style="color:white;font-size:22px;font-weight:900;letter-spacing:-0.5px;">SmartParking</div>
            <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px;">نظام الإدارة الذكي</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#1e1b4b;padding:36px 40px;">

            <!-- Greeting -->
            <p style="color:#e2e8f0;font-size:17px;font-weight:700;margin:0 0 6px;">
              مرحباً ${name} 👋
            </p>
            <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.7;">
              تلقّينا طلب إعادة تعيين كلمة المرور لحسابك في SmartParking.<br>
              كلمة السر المؤقتة الخاصة بك هي:
            </p>

            <!-- Password Box -->
            <div style="background:#0f172a;border:2px dashed #6366f1;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="color:#94a3b8;font-size:12px;margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;">كلمة السر المؤقتة</div>
              <div style="color:#818cf8;font-size:28px;font-weight:900;letter-spacing:4px;font-family:monospace;">
                ${tempPass}
              </div>
            </div>

            <!-- Warning -->
            <div style="background:#292524;border:1px solid #78350f;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <div style="color:#fbbf24;font-size:13px;font-weight:700;margin-bottom:6px;">⚠️ انتبه</div>
              <p style="color:#fcd34d;font-size:13px;margin:0;line-height:1.7;">
                هذه الكلمة صالحة لمدة <strong>30 دقيقة</strong> فقط.<br>
                بعد تسجيل الدخول، غيّر كلمة السر فوراً من إعدادات الحساب.
              </p>
            </div>

            <hr style="border:none;border-top:1px solid #312e81;margin:0 0 20px;">

            <p style="color:#64748b;font-size:12px;margin:0;text-align:center;line-height:1.6;">
              إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة بأمان.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:18px 40px;text-align:center;">
            <p style="color:#334155;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} SmartParking — كل الحقوق محفوظة
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}