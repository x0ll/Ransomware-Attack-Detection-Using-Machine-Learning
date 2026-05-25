import { useState, useEffect } from 'react'
import { clearScansDB } from '../lib/store'
import { getLang, t, Lang } from '../lib/language'
import { getTheme, setThemeStorage, Theme } from '../lib/theme'
import { Sun, Moon, Languages, Shield, Trash2, Save, CheckCircle, Loader2, ChevronDown, Send, MessageSquare, AlertTriangle, Download } from 'lucide-react'
import { API_BASE_URL } from '../lib/api-config'

const KEY = "ransomguard_settings"
interface Settings { lang: Lang; realtimeProtection:boolean; autoQuarantine:boolean; autoUpdate:boolean; scheduledScan:boolean; cloudBackup:boolean; sensitivity:number; scanOnStartup:boolean; notifications:boolean; antiTamper:boolean }
// Default realtimeProtection is false. Requires downloading EDR agent first
const DEFAULT: Settings = { lang:"en", realtimeProtection:false, autoQuarantine:true, autoUpdate:true, scheduledScan:true, cloudBackup:false, sensitivity:75, scanOnStartup:false, notifications:true, antiTamper:false }

function Toggle({ value, onChange, isLight, disabled }: { value:boolean; onChange:()=>void; isLight:boolean; disabled?:boolean }) {
  return (
    <button 
      onClick={disabled ? undefined : onChange} 
      className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
        disabled 
          ? (isLight ? "bg-slate-200 opacity-40 cursor-not-allowed" : "bg-[#1e2a3a] opacity-30 cursor-not-allowed")
          : value 
            ? "bg-green-500" 
            : isLight 
              ? "bg-slate-200" 
              : "bg-[#1e2a3a]"
      }`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${value ? "left-6" : "left-1"}`}/>
    </button>
  )
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

  useEffect(() => {
    // Read agent download state from localStorage first
    const downloaded = localStorage.getItem('rg_agent_downloaded') === 'true'
    setIsAgentDownloaded(downloaded)

    try { 
      const s = localStorage.getItem(KEY)
      if (s) { 
        const p = JSON.parse(s)
        
        // If agent is not downloaded, force EDR toggles to be disabled/false
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
      alert(
        isAr 
          ? '⚠️ يرجى تحميل عميل SARMZ RansomGuard أولاً قبل تفعيل الحماية الفورية.' 
          : '⚠️ Please download the SARMZ RansomGuard Agent first before enabling Real-Time Protection.'
      )
      return
    }
    toggle('realtimeProtection')
  }

  const handleAntiTamperToggle = () => {
    if (!isAgentDownloaded) {
      alert(
        isAr 
          ? '⚠️ يرجى تحميل عميل SARMZ RansomGuard أولاً قبل تفعيل درع الحماية ضد التلاعب.' 
          : '⚠️ Please download the SARMZ RansomGuard Agent first before enabling EDR Core Anti-Tamper Shield.'
      )
      return
    }
    toggle('antiTamper')
  }

  const save = () => { localStorage.setItem(KEY, JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2500); window.dispatchEvent(new Event('lang-changed')) }
  
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
        wipeDelete: 'Wipe & Delete'
      },
      ar: {
        realTimeEdr: 'مراقب EDR الفوري',
        realTimeEdrDesc: 'حماية المحطات الطرفية النشطة والمراقبة السلوكية المستمرة',
        antiTamper: 'درع حماية EDR ضد التلاعب',
        antiTamperDesc: 'يمنع الإيقاف غير المصرح به لعملية وكيل الحماية الثنائية',
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
        wipeDelete: 'حذف وتصفير'
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
      const res = await fetch(`${API_BASE_URL}/api/submit-soc-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          subject: supportSubjectText,
          message: supportMessageText
        })
      })
      
      const data = await res.json()
      setSubmittingSupport(false)
      
      if (!res.ok) {
        alert(isAr ? `فشل الإرسال: ${data.error}` : `Failed to submit: ${data.error}`)
        return
      }
      
      const successMsg = isAr 
        ? 'تم إرسال تذكرة الدعم بنجاح إلى مركز العمليات الأمنية.' 
        : 'Support ticket submitted successfully to SARMZ SOC.'
      setSupportSuccessMsg(successMsg)
      setSupportSubjectText('')
      setSupportMessageText('')
      setTimeout(() => setSupportSuccessMsg(''), 4000)
    } catch (e) {
      setSubmittingSupport(false)
      alert(isAr ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = confirm(
      isAr 
        ? '⚠️ تحذير: سيتم حذف الحساب نهائياً من قاعدة البيانات وتصفير جميع الفحوصات والإعدادات المحلية. هل تريد الاستمرار؟' 
        : '⚠️ WARNING: This will permanently delete your account from the database and wipe all local scan history and settings. Do you wish to proceed?'
    )
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
    } catch (e) {
      alert(isAr ? 'فشلت عملية مسح الحساب.' : 'Failed to delete account.')
    }
  }

  const card   = isLight ? 'bg-white border-slate-200'   : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt    = isLight ? 'text-slate-800'              : 'text-white'
  const muted  = isLight ? 'text-slate-500'              : 'text-gray-500'
  const divCls = isLight ? 'border-slate-100'            : 'border-[#1e2a3a]'
  const btnBrd = isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-[#1e2a3a] text-gray-400 hover:text-white'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${txt}`}>{T('settingsTitle')}</h1>
          <p className={`text-sm ${muted}`}>{T('settingsDesc')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => { if (confirm(isAr ? 'إعادة التعيين؟' : 'Reset to defaults?')) { setSettings(DEFAULT); setLang('en'); localStorage.removeItem(KEY); window.dispatchEvent(new Event('lang-changed')) } }}
            className={`flex-1 md:flex-none text-xs border px-3 py-2 rounded-lg transition-all ${btnBrd}`}>
            {T('reset')}
          </button>
          <button onClick={save}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 font-bold px-4 py-2 rounded-lg text-sm transition-all ${saved ? "bg-green-600 text-white" : "bg-green-500 hover:bg-green-600 text-black"}`}>
            {saved ? <><CheckCircle className="w-4 h-4"/>{T('saved')}</> : <><Save className="w-4 h-4"/>{T('save')}</>}
          </button>
        </div>
      </div>

      <div className="space-y-4 max-w-2xl">

        {/* 1. Localization Dropdown */}
        <div className={`${card} border rounded-xl p-4`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isLight ? 'bg-blue-50 text-blue-500' : 'bg-blue-500/10 text-blue-400'}`}>
                <Languages className="w-5 h-5"/>
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
                className={`w-full text-xs font-medium py-2 px-3 pr-8 rounded-xl border appearance-none cursor-pointer focus:outline-none transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-400' 
                    : 'bg-[#0a0e1a] border-[#1e2a3a] text-gray-300 focus:border-blue-500/50'
                }`}
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

        {/* 2. Theme Settings */}
        <div className={`${card} border rounded-xl p-4`}>
          <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${txt}`}>
            {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400"/> : <Sun className="w-4 h-4 text-yellow-400"/>}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${txt}`}>{theme === 'dark' ? 'Dark Theme' : 'Light Theme'}</p>
              <p className={`text-xs ${muted}`}>{theme === 'dark' ? 'Easy on the eyes' : 'Bright and clean'}</p>
            </div>
            <button onClick={toggleTheme}
              className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${theme === 'light' ? 'bg-yellow-400' : 'bg-blue-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 flex items-center justify-center ${theme === 'light' ? 'left-8' : 'left-1'}`}>
                {theme === 'light' ? <Sun className="w-3 h-3 text-yellow-500"/> : <Moon className="w-3 h-3 text-blue-600"/>}
              </div>
            </button>
          </div>
        </div>

        {/* 3. Protection Settings (EDR Toggle, Anti-Tamper Toggle, Download Button) */}
        <div className={`${card} border rounded-xl p-4`}>
          <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${txt}`}>
            <Shield className="w-4 h-4 text-green-400"/>{T('protectionSettings')}
          </h3>
          
          <div className="space-y-1">
            {/* Real-time protection EDR toggle */}
            <div className={`flex items-center justify-between py-3 border-b ${divCls}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm ${settings.realtimeProtection ? txt : muted}`}>{T('realTimeEdr')}</p>
                  {!isAgentDownloaded && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 font-bold border border-yellow-500/20">
                      {isAr ? 'تحميل العميل مطلوب' : 'Download Required'}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${muted}`}>{T('realTimeEdrDesc')}</p>
              </div>
              <div onClick={handleEdrToggle}>
                <Toggle value={settings.realtimeProtection} onChange={handleEdrToggle} isLight={isLight} disabled={!isAgentDownloaded}/>
              </div>
            </div>
            
            {/* EDR Core Anti-Tamper Shield toggle */}
            <div className={`flex items-center justify-between py-3 border-b ${divCls}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm ${settings.antiTamper ? txt : muted}`}>{T('antiTamper')}</p>
                  {!isAgentDownloaded && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 font-bold border border-yellow-500/20">
                      {isAr ? 'تحميل العميل مطلوب' : 'Download Required'}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${muted}`}>{T('antiTamperDesc')}</p>
              </div>
              <div onClick={handleAntiTamperToggle}>
                <Toggle value={settings.antiTamper} onChange={handleAntiTamperToggle} isLight={isLight} disabled={!isAgentDownloaded}/>
              </div>
            </div>
          </div>

          {/* Premium Download Agent Button directly below toggles */}
          <div className="mt-4 pt-4">
            <a 
              href="https://drive.google.com/file/d/1vZB5fI02BZN2n5vlG2BijAnV-WlLeoQM/view?usp=sharing" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => {
                localStorage.setItem('rg_agent_downloaded', 'true')
                setIsAgentDownloaded(true)
              }}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md shadow-green-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Download className="w-4.5 h-4.5"/>
              {T('downloadAgent')}
            </a>
          </div>
        </div>

        {/* 4. Cyber Support Card (Contact SOC Support) */}
        <div className={`${card} border rounded-xl overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${divCls} bg-blue-500/5 flex items-center justify-between`}>
            <h3 className={`font-semibold text-sm flex items-center gap-2 ${txt}`}>
              <MessageSquare className="w-4 h-4 text-blue-400"/>
              {T('contactSoc')}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold uppercase">SOC Portal</span>
          </div>
          
          <form onSubmit={handleSupportSubmit} className="p-4 space-y-3">
            <p className={`text-xs ${muted}`}>
              {T('socDesc')}
            </p>
            
            <div className="space-y-1">
              <label className={`text-xs font-bold ${muted}`}>
                {T('subject')}
              </label>
              <input 
                type="text" 
                value={supportSubjectText} 
                onChange={(e) => setSupportSubjectText(e.target.value)}
                placeholder={T('subjectPlaceholder')}
                required
                className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 focus:border-blue-400' 
                    : 'bg-[#0a0e1a] border-[#1e2a3a] text-white focus:border-blue-500/50'
                }`}
              />
            </div>
            
            <div className="space-y-1">
              <label className={`text-xs font-bold ${muted}`}>
                {T('message')}
              </label>
              <textarea 
                rows={3} 
                value={supportMessageText} 
                onChange={(e) => setSupportMessageText(e.target.value)}
                placeholder={T('messagePlaceholder')}
                required
                className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all resize-none ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 focus:border-blue-400' 
                    : 'bg-[#0a0e1a] border-[#1e2a3a] text-white focus:border-blue-500/50'
                }`}
              />
            </div>

            {supportSuccessMsg && (
              <div className="text-xs p-3 rounded-xl flex items-center gap-2 animate-in zoom-in duration-300 bg-green-500/10 text-green-400 border border-green-500/20">
                <CheckCircle className="w-3.5 h-3.5"/>
                {supportSuccessMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={submittingSupport || !supportSubjectText || !supportMessageText}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all shadow-lg ${
                submittingSupport 
                  ? "opacity-50 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99]"
              }`}
            >
              {submittingSupport ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
              {T('submitSoc')}
            </button>
          </form>
        </div>

        {/* 5. Danger Zone */}
        <div className={`${card} border border-red-500/30 rounded-xl p-4 space-y-3`}>
          <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5"/>
            {T('dangerZone')}
          </h3>
          <p className={`text-xs ${muted}`}>
            {T('dangerZoneDesc')}
          </p>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div>
              <p className={`text-sm font-semibold text-red-400`}>
                {T('deleteAccount')}
              </p>
              <p className={`text-xs ${muted}`}>
                {T('deleteAccountDesc')}
              </p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-red-600/10 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5"/> 
              {T('wipeDelete')}
            </button>
          </div>
        </div>
      </div>

      {/* 6. System Build Footer */}
      <div className="mt-12 mb-4 max-w-2xl text-center">
        <p className={`text-[11px] font-medium tracking-wide ${muted} select-none opacity-80`}>
          SARMZ RansomGuard v1.0.0 (Build 2026.05.25) - All Rights Reserved
        </p>
      </div>
    </div>
  )
}
