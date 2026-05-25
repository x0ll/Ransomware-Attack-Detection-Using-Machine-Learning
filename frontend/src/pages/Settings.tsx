import { useState, useEffect } from 'react'
import { clearScansDB } from '../lib/store'
import { getLang, t, Lang } from '../lib/language'
import { getTheme, setThemeStorage, Theme } from '../lib/theme'
import {
  Sun, Moon, Languages, Shield, Trash2, Save, CheckCircle,
  Loader2, ChevronDown, Send, MessageSquare, AlertTriangle, Download, Zap,
  FileText, X, ShieldCheck, Eye, Lock
} from 'lucide-react'
import { API_BASE_URL } from '../lib/api-config'

const KEY = "ransomguard_settings"
interface Settings {
  lang: Lang; realtimeProtection: boolean; autoQuarantine: boolean;
  autoUpdate: boolean; scheduledScan: boolean; cloudBackup: boolean;
  sensitivity: number; scanOnStartup: boolean; notifications: boolean; antiTamper: boolean
}
const DEFAULT: Settings = {
  lang: "en", realtimeProtection: false, autoQuarantine: true, autoUpdate: true,
  scheduledScan: true, cloudBackup: false, sensitivity: 75,
  scanOnStartup: false, notifications: true, antiTamper: false
}

/* ── Toggle Component ── */
function Toggle({ value, onChange, isLight, disabled }: { value: boolean; onChange: () => void; isLight: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
        disabled
          ? (isLight ? "bg-slate-200 opacity-40 cursor-not-allowed" : "bg-[#1e2a3a] opacity-30 cursor-not-allowed")
          : value
            ? "bg-green-500"
            : isLight ? "bg-slate-200" : "bg-[#1e2a3a]"
      }`}
      style={value && !disabled ? { boxShadow: '0 0 10px rgba(34,197,94,0.5)' } : {}}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${value ? "left-6" : "left-1"}`} />
    </button>
  )
}

/* ── Live EDR Pulse Badge ── */
function EdrPulseBadge({ active, isAr }: { active: boolean; isAr: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all duration-500"
      style={active ? {
        color: '#22c55e',
        background: 'rgba(34,197,94,0.08)',
        borderColor: 'rgba(34,197,94,0.3)',
        boxShadow: '0 0 8px rgba(34,197,94,0.25)',
      } : {
        color: '#6b7280',
        background: 'rgba(107,114,128,0.08)',
        borderColor: 'rgba(107,114,128,0.2)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={active ? {
          background: '#22c55e',
          boxShadow: '0 0 6px #22c55e',
          animation: 'edrPulse 1.4s ease-in-out infinite',
        } : { background: '#6b7280' }}
      />
      {active
        ? (isAr ? 'العميل نشط · متصل' : 'AGENT LIVE · CONNECTED')
        : (isAr ? 'غير متصل' : 'OFFLINE')
      }
    </span>
  )
}

/* ── EULA Terms Modal ── */
function EulaModal({ onClose, isAr }: { onClose: () => void; isAr: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d1117, #060d1a)',
          border: '1px solid rgba(59,130,246,0.25)',
          boxShadow: '0 0 0 1px rgba(59,130,246,0.1), 0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(59,130,246,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)', borderBottom: '1px solid rgba(59,130,246,0.15)' }} className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-wide">SARMZ RansomGuard EULA</h2>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest">{isAr ? 'اتفاقية ترخيص المستخدم النهائي' : 'End-User License Agreement'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e2a3a transparent' }}>
          <p className="text-gray-400 text-xs leading-relaxed">
            {isAr
              ? 'بتثبيت أو تفعيل عميل SARMZ RansomGuard، فإنك توافق على الشروط والأحكام التالية:'
              : 'By installing or activating the SARMZ RansomGuard Agent, you agree to the following terms and conditions:'}
          </p>

          {/* Clause 1 */}
          <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-green-400 font-bold text-xs uppercase tracking-wider">{isAr ? 'خصوصية البيانات' : 'Data Privacy'}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              {isAr
                ? 'جميع عمليات المراقبة السلوكية تتم معالجتها محلياً على الجهاز النهائي. لا يتم إرسال أي بيانات شخصية أو ملفات إلى خوادم خارجية.'
                : 'All behavioral monitoring is processed locally on the endpoint. No personal data or files are transmitted to external servers.'}
            </p>
          </div>

          {/* Clause 2 */}
          <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">{isAr ? 'التفويض والصلاحيات' : 'Authorization'}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              {isAr
                ? 'بتثبيت العميل، فإنك تمنح SARMZ RansomGuard صلاحية مراقبة التغييرات الفورية في المجلدات والعمليات على جهازك لأغراض الحماية من برامج الفدية.'
                : 'By installing the agent, you grant SARMZ RansomGuard permission to monitor real-time folder changes and processes on your device for ransomware protection purposes.'}
            </p>
          </div>

          {/* Clause 3 */}
          <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-red-400 font-bold text-xs uppercase tracking-wider">{isAr ? 'المسؤولية والضمان' : 'Liability'}</span>
            </div>
            <p className="text-gray-300 text-xs leading-relaxed">
              {isAr
                ? 'صُمِّم SARMZ RansomGuard للكشف عن التهديدات وإيقافها مع عدم تسجيل أي بيانات. لا تتحمل SARMZ مسؤولية أي خسارة في البيانات ناتجة عن هجمات سابقة للتثبيت.'
                : 'SARMZ RansomGuard is designed to detect and block threats with zero data logging. SARMZ bears no liability for data loss resulting from attacks prior to installation.'}
            </p>
          </div>

          <p className="text-gray-600 text-[10px] text-center pt-1">
            {isAr ? 'الإصدار 1.0 · مايو 2026 · جميع الحقوق محفوظة لـ SARMZ' : 'Version 1.0 · May 2026 · All rights reserved by SARMZ'}
          </p>
        </div>

        {/* Modal Footer */}
        <div style={{ borderTop: '1px solid rgba(59,130,246,0.12)', background: 'rgba(6,13,26,0.8)' }} className="px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)', boxShadow: '0 0 15px rgba(59,130,246,0.15)' }}
          >
            <CheckCircle className="w-4 h-4" />
            {isAr ? 'فهمت وأوافق' : 'Understood & Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Severity Badge ── */
const SEVERITY_CONFIG: Record<string, { label: string; labelAr: string; color: string; bg: string; border: string }> = {
  low:      { label: 'Low',      labelAr: 'منخفض',   color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'   },
  medium:   { label: 'Medium',   labelAr: 'متوسط',   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)'  },
  critical: { label: 'Critical', labelAr: 'حرج',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)'    },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [saved, setSaved] = useState(false)
  const [lang, setLang] = useState<Lang>(getLang())
  const [theme, setTheme] = useState<Theme>(getTheme())
  const [supportSubjectText, setSupportSubjectText] = useState('')
  const [supportMessageText, setSupportMessageText] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)
  const [supportSuccessMsg, setSupportSuccessMsg] = useState('')
  const [isAgentDownloaded, setIsAgentDownloaded] = useState(false)
  const [severity, setSeverity] = useState<'low' | 'medium' | 'critical'>('low')
  const [eulaAccepted, setEulaAccepted] = useState(false)
  const [showEulaModal, setShowEulaModal] = useState(false)

  useEffect(() => {
    const downloaded = localStorage.getItem('rg_agent_downloaded') === 'true'
    setIsAgentDownloaded(downloaded)
    try {
      const s = localStorage.getItem(KEY)
      if (s) {
        const p = JSON.parse(s)
        if (!downloaded) {
          p.realtimeProtection = false
          p.antiTamper = false
          localStorage.setItem(KEY, JSON.stringify(p))
        }
        setSettings(p)
        setLang(p.lang || 'en')
        setTheme(p.theme || 'dark')
      } else {
        localStorage.setItem(KEY, JSON.stringify(DEFAULT))
      }
    } catch {}
    window.addEventListener('theme-changed', () => setTheme(getTheme()))
  }, [])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
    if (key === 'lang') {
      setLang(value as Lang)
      try {
        const stored = localStorage.getItem(KEY)
        const parsed = stored ? JSON.parse(stored) : DEFAULT
        parsed.lang = value
        localStorage.setItem(KEY, JSON.stringify(parsed))
      } catch (e) {
        localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT, lang: value }))
      }
      window.dispatchEvent(new Event('lang-changed'))
    }
    setSaved(false)
  }

  const toggle = (key: keyof Settings) => { setSettings(s => ({ ...s, [key]: !s[key] })); setSaved(false) }

  const handleEdrToggle = () => {
    if (!isAgentDownloaded) {
      alert(isAr
        ? '⚠️ يرجى تحميل عميل SARMZ RansomGuard أولاً قبل تفعيل الحماية الفورية.'
        : '⚠️ Please download the SARMZ RansomGuard Agent first before enabling Real-Time Protection.')
      return
    }
    toggle('realtimeProtection')
  }

  const handleAntiTamperToggle = () => {
    if (!isAgentDownloaded) {
      alert(isAr
        ? '⚠️ يرجى تحميل عميل SARMZ RansomGuard أولاً قبل تفعيل درع الحماية ضد التلاعب.'
        : '⚠️ Please download the SARMZ RansomGuard Agent first before enabling EDR Core Anti-Tamper Shield.')
      return
    }
    toggle('antiTamper')
  }

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    window.dispatchEvent(new Event('lang-changed'))
  }

  const isAr = lang === 'ar'
  const isLight = theme === 'light'

  const T = (key: string) => {
    const custom: Record<Lang, Record<string, string>> = {
      en: {
        realTimeEdr: 'Real-Time EDR Agent',
        realTimeEdrDesc: 'Active endpoint protection and behavioral monitoring',
        antiTamper: 'EDR Core Anti-Tamper Shield',
        antiTamperDesc: 'Prevents unauthorized termination of the security agent process',
        downloadAgent: 'Download SARMZ RansomGuard Agent',
        contactSoc: 'Contact SOC Support',
        socDesc: 'Open a secure ticket directly with the Security Operations Center (SOC) team.',
        subject: 'Subject',
        message: 'Message',
        submitSoc: 'Submit SOC Ticket',
        subjectPlaceholder: 'e.g., False positive detection on safe app',
        messagePlaceholder: 'Describe the security event or issue details...',
        dangerZoneDesc: 'Destructive actions that permanently wipe data. Please use with caution.',
        deleteAccount: 'Delete Account & Wipe Data',
        deleteAccountDesc: 'Permanently deletes user account from server database and wipes all local session records.',
        wipeDelete: 'Wipe & Delete',
        severityLevel: 'Severity Level',
      },
      ar: {
        realTimeEdr: 'مراقب EDR الفوري',
        realTimeEdrDesc: 'حماية المحطات الطرفية النشطة والمراقبة السلوكية المستمرة',
        antiTamper: 'درع حماية EDR ضد التلاعب',
        antiTamperDesc: 'يمنع الإيقاف غير المصرح به لعملية وكيل الحماية',
        downloadAgent: 'تحميل عميل SARMZ RansomGuard',
        contactSoc: 'الدعم الفني السيبراني',
        socDesc: 'افتح تذكرة آمنة مباشرة مع فريق مركز العمليات الأمنية (SOC) للإبلاغ عن اشتباه أو طلب دعم.',
        subject: 'الموضوع',
        message: 'الرسالة',
        submitSoc: 'إرسال تذكرة SOC',
        subjectPlaceholder: 'مثال: اشتباه في ملف آمن / false positive',
        messagePlaceholder: 'اكتب تفاصيل التذكرة هنا...',
        dangerZoneDesc: 'الخيارات أدناه تؤدي إلى حذف البيانات نهائياً. يرجى توخي الحذر.',
        deleteAccount: 'حذف الحساب وتصفير البيانات',
        deleteAccountDesc: 'سيتم حذف حسابك بالكامل من الخادم وتصفير جميع سجلات الفحوصات والإعدادات المحلية نهائياً.',
        wipeDelete: 'حذف وتصفير',
        severityLevel: 'مستوى الخطورة',
      }
    }
    return custom[lang][key] || t[lang][key] || key
  }

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    setThemeStorage(newTheme)
  }

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportSubjectText || !supportMessageText) return
    setSubmittingSupport(true)
    setSupportSuccessMsg('')
    try {
      const email = localStorage.getItem('rg_user_email') || 'Guest@sarmz.com'
      const sevLabel = SEVERITY_CONFIG[severity].label
      const res = await fetch(`${API_BASE_URL}/api/submit-soc-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subject: `[${sevLabel.toUpperCase()}] ${supportSubjectText}`,
          message: supportMessageText
        })
      })
      const data = await res.json()
      setSubmittingSupport(false)
      if (!res.ok) {
        alert(isAr ? `فشل الإرسال: ${data.error}` : `Failed to submit: ${data.error}`)
        return
      }
      setSupportSuccessMsg(isAr
        ? 'تم إرسال تذكرة الدعم بنجاح إلى مركز العمليات الأمنية.'
        : 'Support ticket submitted successfully to SARMZ SOC.')
      setSupportSubjectText('')
      setSupportMessageText('')
      setSeverity('low')
      setTimeout(() => setSupportSuccessMsg(''), 4000)
    } catch {
      setSubmittingSupport(false)
      alert(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = confirm(isAr
      ? '⚠️ تحذير: سيتم حذف الحساب نهائياً من قاعدة البيانات وتصفير جميع الفحوصات والإعدادات المحلية. هل تريد الاستمرار؟'
      : '⚠️ WARNING: This will permanently delete your account from the database and wipe all local scan history and settings. Do you wish to proceed?')
    if (!confirmation) return
    try {
      const email = localStorage.getItem('rg_user_email')
      const currentUser = localStorage.getItem('rg_current_user') || undefined
      await clearScansDB(currentUser)
      if (email) {
        await fetch(`${API_BASE_URL}/api/delete-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })
      }
      localStorage.removeItem('rg_current_user')
      localStorage.removeItem('rg_user_email')
      localStorage.removeItem('ransomguard_settings')
      localStorage.removeItem('rg_auth_token')
      sessionStorage.clear()
      window.location.reload()
    } catch {
      alert(isAr ? 'فشلت عملية مسح الحساب.' : 'Failed to delete account.')
    }
  }

  /* ── Theme-aware style tokens ── */
  const isD = !isLight

  // Glassmorphism card base
  const glassBase = isD
    ? 'bg-[#0d1117]/80 backdrop-blur-md border-[#1e2a3a]'
    : 'bg-white/80 backdrop-blur-md border-slate-200'

  const txt    = isLight ? 'text-slate-800' : 'text-white'
  const muted  = isLight ? 'text-slate-500' : 'text-gray-500'
  const divCls = isLight ? 'border-slate-100' : 'border-[#1e2a3a]'
  const btnBrd = isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-[#1e2a3a] text-gray-400 hover:text-white hover:border-slate-600'
  const inputCls = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'
    : 'bg-[#060d1a] border-[#1e2a3a] text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20'

  // Neon glow on SOC card
  const socCardStyle = isD ? {
    boxShadow: '0 0 0 1px rgba(59,130,246,0.18), 0 4px 32px rgba(59,130,246,0.08)',
    borderColor: 'rgba(59,130,246,0.22)',
  } : {}

  // Red flicker on Danger Zone
  const dangerStyle = isD ? {
    boxShadow: '0 0 0 1px rgba(239,68,68,0.22), 0 4px 24px rgba(239,68,68,0.07)',
    borderColor: 'rgba(239,68,68,0.3)',
    animation: 'dangerFlicker 4s ease-in-out infinite',
  } : { borderColor: 'rgba(239,68,68,0.3)' }

  const sevCfg = SEVERITY_CONFIG[severity]

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Keyframe Injector ── */}
      <style>{`
        @keyframes edrPulse {
          0%, 100% { opacity: 1; transform: scale(1);   box-shadow: 0 0 4px #22c55e; }
          50%       { opacity: 0.6; transform: scale(1.35); box-shadow: 0 0 10px #22c55e; }
        }
        @keyframes dangerFlicker {
          0%, 90%, 100% { box-shadow: 0 0 0 1px rgba(239,68,68,0.22), 0 4px 24px rgba(239,68,68,0.07); }
          93%           { box-shadow: 0 0 0 1px rgba(239,68,68,0.45), 0 4px 30px rgba(239,68,68,0.18); }
          96%           { box-shadow: 0 0 0 1px rgba(239,68,68,0.18), 0 4px 20px rgba(239,68,68,0.05); }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className={`text-2xl font-bold ${txt}`}>{T('settingsTitle')}</h1>
          <p className={`text-sm ${muted}`}>{T('settingsDesc')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => { if (confirm(isAr ? 'إعادة التعيين؟' : 'Reset to defaults?')) { setSettings(DEFAULT); setLang('en'); localStorage.removeItem(KEY); window.dispatchEvent(new Event('lang-changed')) } }}
            className={`flex-1 md:flex-none text-xs border px-3 py-2 rounded-lg transition-all ${btnBrd}`}
          >
            {T('reset')}
          </button>
          <button
            onClick={save}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 font-bold px-4 py-2 rounded-lg text-sm transition-all ${saved ? "bg-green-600 text-white" : "bg-green-500 hover:bg-green-600 text-black"}`}
          >
            {saved ? <><CheckCircle className="w-4 h-4" />{T('saved')}</> : <><Save className="w-4 h-4" />{T('save')}</>}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          TWO-COLUMN GRID LAYOUT
      ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-4">

          {/* 1. Language Card */}
          <div className={`${glassBase} border rounded-2xl p-4 transition-all duration-300`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isLight ? 'bg-blue-50 text-blue-500' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${txt}`}>{T('interfaceLang')}</p>
                  <p className={`text-xs ${muted}`}>{T('chooseLang')}</p>
                </div>
              </div>
              <div className="relative min-w-[160px]">
                <select
                  value={settings.lang}
                  onChange={(e) => update("lang", e.target.value as Lang)}
                  className={`w-full text-xs font-medium py-2 px-3 pr-8 rounded-xl border appearance-none cursor-pointer focus:outline-none transition-all ${inputCls}`}
                >
                  <option value="en">English (US)</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
                <div className={`absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none ${muted}`}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Theme Card */}
          <div className={`${glassBase} border rounded-2xl p-4 transition-all duration-300`}>
            <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${txt}`}>
              {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${txt}`}>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</p>
                <p className={`text-xs ${muted}`}>{theme === 'dark' ? 'Easy on the eyes' : 'Bright and clean'}</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${theme === 'light' ? 'bg-yellow-400' : 'bg-blue-600'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 flex items-center justify-center ${theme === 'light' ? 'left-8' : 'left-1'}`}>
                  {theme === 'light' ? <Sun className="w-3 h-3 text-yellow-500" /> : <Moon className="w-3 h-3 text-blue-600" />}
                </div>
              </button>
            </div>
          </div>

          {/* 3. Protection Settings Card */}
          <div className={`${glassBase} border rounded-2xl p-4 transition-all duration-300`}
            style={isD ? { boxShadow: '0 0 0 1px rgba(34,197,94,0.1), 0 4px 24px rgba(34,197,94,0.05)' } : {}}>
            <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${txt}`}>
              <Shield className="w-4 h-4 text-green-400" />
              {T('protectionSettings')}
            </h3>

            {/* ── Locked state: show placeholder until agent is downloaded ── */}
            {!isAgentDownloaded ? (
              <div className={`rounded-xl border border-dashed ${isLight ? 'border-slate-300 bg-slate-50/60' : 'border-[#1e2a3a] bg-[#060d1a]/60'} px-4 py-5 flex flex-col items-center gap-2 text-center mb-3`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
                  <span className="text-lg">🔒</span>
                </div>
                <p className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  {isAr ? 'الخيارات مقفلة — حمّل العميل أولاً لتفعيلها' : 'Options locked — Download the agent first to unlock'}
                </p>
                <p className={`text-[11px] ${muted}`}>
                  {isAr ? 'Real-Time EDR Agent · EDR Core Anti-Tamper Shield' : 'Real-Time EDR Agent · EDR Core Anti-Tamper Shield'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Real-Time EDR Toggle — visible only after download */}
                <div className={`flex items-center justify-between py-3 border-b ${divCls}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className={`text-sm font-medium ${settings.realtimeProtection ? txt : muted}`}>{T('realTimeEdr')}</p>
                      <EdrPulseBadge active={settings.realtimeProtection} isAr={isAr} />
                    </div>
                    <p className={`text-xs ${muted}`}>{T('realTimeEdrDesc')}</p>
                  </div>
                  <Toggle value={settings.realtimeProtection} onChange={handleEdrToggle} isLight={isLight} />
                </div>

                {/* EDR Anti-Tamper Toggle — visible only after download */}
                <div className={`flex items-center justify-between py-3 border-b ${divCls}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className={`text-sm font-medium ${settings.antiTamper ? txt : muted}`}>{T('antiTamper')}</p>
                      <EdrPulseBadge active={settings.antiTamper} isAr={isAr} />
                    </div>
                    <p className={`text-xs ${muted}`}>{T('antiTamperDesc')}</p>
                  </div>
                  <Toggle value={settings.antiTamper} onChange={handleAntiTamperToggle} isLight={isLight} />
                </div>
              </div>
            )}

            {/* EULA Checkbox + Download Button */}
            <div className="mt-4 space-y-3">

              {/* EULA Checkbox row */}
              <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={eulaAccepted}
                    onChange={e => setEulaAccepted(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center transition-all duration-200"
                    style={{
                      background: eulaAccepted ? '#22c55e' : 'transparent',
                      border: eulaAccepted ? '1.5px solid #22c55e' : `1.5px solid ${isLight ? '#cbd5e1' : '#2d3f55'}`,
                      boxShadow: eulaAccepted ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
                    }}
                  >
                    {eulaAccepted && <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-[11px] leading-relaxed" style={{ color: isLight ? '#475569' : '#9ca3af' }}>
                  {isAr ? 'أوافق على' : 'I accept the SARMZ Security Terms &'}{' '}
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setShowEulaModal(true) }}
                    className="font-bold transition-all hover:underline"
                    style={{ color: '#3b82f6', textShadow: '0 0 8px rgba(59,130,246,0.5)' }}
                  >
                    {isAr ? 'شروط الاستخدام واتفاقية ترخيص المستخدم النهائي (EULA)' : 'End-User License Agreement (EULA)'}
                  </button>
                </span>
              </label>

              {/* Download Button — disabled until EULA accepted */}
              <a
                href={eulaAccepted ? 'https://drive.google.com/file/d/1vZB5fI02BZN2n5vlG2BijAnV-WlLeoQM/view?usp=sharing' : undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={eulaAccepted ? () => { localStorage.setItem('rg_agent_downloaded', 'true'); setIsAgentDownloaded(true) } : e => e.preventDefault()}
                aria-disabled={!eulaAccepted}
                className="w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-sm transition-all duration-300"
                style={eulaAccepted ? {
                  background: '#22c55e',
                  color: '#000',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(34,197,94,0.35), 0 4px 12px rgba(34,197,94,0.2)',
                  transform: 'scale(1)',
                } : {
                  background: isLight ? '#e2e8f0' : 'rgba(34,197,94,0.06)',
                  color: isLight ? '#94a3b8' : '#374151',
                  cursor: 'not-allowed',
                  border: '1px dashed rgba(34,197,94,0.2)',
                  opacity: 0.55,
                }}
              >
                <Download className="w-4 h-4" />
                {T('downloadAgent')}
                {!eulaAccepted && (
                  <span className="text-[9px] font-black uppercase tracking-widest ml-1 opacity-70">
                    {isAr ? '(قبول الشروط أولاً)' : '(Accept terms first)'}
                  </span>
                )}
              </a>
            </div>
          </div>

          {/* EULA Modal */}
          {showEulaModal && <EulaModal onClose={() => setShowEulaModal(false)} isAr={isAr} />}

          {/* 4. Danger Zone Card */}
          <div
            className={`${glassBase} border rounded-2xl p-4 space-y-3 transition-all duration-300`}
            style={dangerStyle}
          >
            <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {T('dangerZone')}
            </h3>
            <p className={`text-xs ${muted}`}>{T('dangerZoneDesc')}</p>
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <p className="text-sm font-semibold text-red-400">{T('deleteAccount')}</p>
                <p className={`text-xs ${muted}`}>{T('deleteAccountDesc')}</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-red-600/10 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {T('wipeDelete')}
              </button>
            </div>
          </div>

        </div>{/* end LEFT column */}

        {/* ── RIGHT COLUMN — SOC Support Card (full height) ── */}
        <div className="flex flex-col">
          <div
            className={`${glassBase} border rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-300`}
            style={socCardStyle}
          >
            {/* SOC Card Header */}
            <div className={`px-5 py-4 border-b ${divCls} flex items-center justify-between`}
              style={isD ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.07), transparent)' } : {}}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${txt}`}>{T('contactSoc')}</h3>
                  <p className={`text-[10px] ${muted}`}>{isAr ? 'مركز العمليات الأمنية' : 'Security Operations Center'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ animation: 'edrPulse 2s ease-in-out infinite' }} />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-black uppercase tracking-widest border border-blue-500/20">
                  SOC Portal
                </span>
              </div>
            </div>

            {/* SOC Card Body */}
            <form onSubmit={handleSupportSubmit} className="p-5 space-y-4 flex-1 flex flex-col">
              <p className={`text-xs leading-relaxed ${muted}`}>{T('socDesc')}</p>

              {/* Severity Level Dropdown */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${muted}`}>
                  <Zap className="w-3 h-3" />
                  {T('severityLevel')}
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'critical'] as const).map(s => {
                    const cfg = SEVERITY_CONFIG[s]
                    const active = severity === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        className="flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          color: cfg.color,
                          background: active ? cfg.bg : 'transparent',
                          borderColor: active ? cfg.border : isD ? '#1e2a3a' : '#e2e8f0',
                          boxShadow: active ? `0 0 12px ${cfg.color}30` : 'none',
                        }}
                      >
                        {isAr ? cfg.labelAr : cfg.label}
                      </button>
                    )
                  })}
                </div>
                {/* Active severity indicator strip */}
                <div
                  className="h-0.5 rounded-full transition-all duration-300"
                  style={{ background: `linear-gradient(90deg, ${sevCfg.color}80, transparent)`, width: severity === 'low' ? '33%' : severity === 'medium' ? '66%' : '100%' }}
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold uppercase tracking-wider ${muted}`}>{T('subject')}</label>
                <input
                  type="text"
                  value={supportSubjectText}
                  onChange={(e) => setSupportSubjectText(e.target.value)}
                  placeholder={T('subjectPlaceholder')}
                  required
                  className={`w-full text-sm px-3 py-2.5 rounded-xl border outline-none transition-all ${inputCls}`}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className={`text-xs font-bold uppercase tracking-wider ${muted}`}>{T('message')}</label>
                <textarea
                  rows={5}
                  value={supportMessageText}
                  onChange={(e) => setSupportMessageText(e.target.value)}
                  placeholder={T('messagePlaceholder')}
                  required
                  className={`w-full flex-1 text-sm px-3 py-2.5 rounded-xl border outline-none transition-all resize-none ${inputCls}`}
                />
              </div>

              {/* Success message */}
              {supportSuccessMsg && (
                <div className="text-xs p-3 rounded-xl flex items-center gap-2 bg-green-500/10 text-green-400 border border-green-500/20">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  {supportSuccessMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingSupport || !supportSubjectText || !supportMessageText}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all ${
                  submittingSupport
                    ? "opacity-50 cursor-not-allowed bg-blue-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01] active:scale-[0.99]"
                }`}
                style={!submittingSupport ? { boxShadow: '0 4px 20px rgba(59,130,246,0.3)' } : {}}
              >
                {submittingSupport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {T('submitSoc')}
                {/* Severity tag on button */}
                {!submittingSupport && (
                  <span
                    className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ml-1"
                    style={{ background: sevCfg.bg, color: sevCfg.color, border: `1px solid ${sevCfg.border}` }}
                  >
                    {isAr ? sevCfg.labelAr : sevCfg.label}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>{/* end RIGHT column */}

      </div>{/* end GRID */}

      {/* ── System Build Footer ── */}
      <div className="mt-10 mb-4 text-center">
        <p className={`text-[11px] font-medium tracking-wide ${muted} select-none opacity-70`}>
          SARMZ RansomGuard v1.0.0 (Build 2026.05.25) — All Rights Reserved
        </p>
      </div>
    </div>
  )
}
