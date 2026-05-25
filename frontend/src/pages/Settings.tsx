import { useState, useEffect } from 'react'
import { clearScansDB } from '../lib/store'
import { getLang, t, Lang } from '../lib/language'
import { getTheme, setThemeStorage, Theme } from '../lib/theme'
import { Sun, Moon } from 'lucide-react'
import { API_BASE_URL } from '../lib/api-config'
import { Languages, RefreshCw, Shield, Trash2, Save, CheckCircle, User, Lock, Loader2, ChevronDown, Send, MessageSquare, AlertTriangle } from 'lucide-react'

const KEY = "ransomguard_settings"
interface Settings { lang: Lang; realtimeProtection:boolean; autoQuarantine:boolean; autoUpdate:boolean; scheduledScan:boolean; cloudBackup:boolean; sensitivity:number; scanOnStartup:boolean; notifications:boolean }
const DEFAULT: Settings = { lang:"en", realtimeProtection:true, autoQuarantine:true, autoUpdate:true, scheduledScan:true, cloudBackup:false, sensitivity:75, scanOnStartup:false, notifications:true }

function Toggle({ value, onChange, isLight }: { value:boolean; onChange:()=>void; isLight:boolean }) {
  return (
    <button onClick={onChange} className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${value ? "bg-green-500" : isLight ? "bg-slate-200" : "bg-[#1e2a3a]"}`}>
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${value ? "left-6" : "left-1"}`}/>
    </button>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [saved, setSaved] = useState(false)
  const [lang, setLang] = useState<Lang>(getLang())
  const [theme, setTheme] = useState<Theme>(getTheme())
  const [profileMsg, setProfileMsg] = useState({ text: '', type: 'success' })
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [supportSubjectText, setSupportSubjectText] = useState('')
  const [supportMessageText, setSupportMessageText] = useState('')
  const [submittingSupport, setSubmittingSupport] = useState(false)
  const [supportSuccessMsg, setSupportSuccessMsg] = useState('')

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) { const p = JSON.parse(s); setSettings(p); setLang(p.lang || 'en'); setTheme(p.theme || 'dark') } } catch {}
    window.addEventListener('theme-changed', () => setTheme(getTheme()))
  }, [])

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(s => ({ ...s, [key]: value }))
    if (key === 'lang') {
      setLang(value as Lang)
      
      // Update localStorage synchronously so other components get the correct value
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
  const save = () => { localStorage.setItem(KEY, JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2500); window.dispatchEvent(new Event('lang-changed')) }
  const T = (key: string) => t[lang][key] || key
  const toggleTheme = () => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    setThemeStorage(newTheme)
  }

  const handleUpdateProfile = async () => {
    if (!newUsername && !newPassword) return
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        setProfileMsg({ text: T('passwordMismatch'), type: 'error' })
        return
      }
      const hasUpper = /[A-Z]/.test(newPassword)
      const hasLower = /[a-z]/.test(newPassword)
      const hasNum   = /[0-9]/.test(newPassword)
      const hasSpec  = /[^A-Za-z0-9]/.test(newPassword)
      if (newPassword.length < 6 || !hasUpper || !hasLower || !hasNum || !hasSpec) {
        setProfileMsg({ text: isAr ? 'كلمة المرور لا تستوفي الشروط' : 'Password does not meet requirements', type: 'error' })
        return
      }
    }
    setUpdating(true)
    setProfileMsg({ text: '', type: 'success' })
    try {
      const email = localStorage.getItem('rg_user_email')
      if (!email) throw new Error(isAr ? "لم يتم العثور على البريد الإلكتروني" : "User email not found")
      
      const res = await fetch(`${API_BASE_URL}/api/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newUsername, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      if (newUsername) {
        localStorage.setItem('rg_current_user', newUsername)
        window.dispatchEvent(new Event('auth-changed'))
      }
      setProfileMsg({ text: T('profileUpdated'), type: 'success' })
      setNewUsername(''); setNewPassword(''); setConfirmPassword('')
    } catch (e: any) {
      setProfileMsg({ text: e.message, type: 'error' })
    } finally {
      setUpdating(false)
      setTimeout(() => setProfileMsg({ text: '', type: 'success' }), 3000)
    }
  }

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportSubjectText || !supportMessageText) return
    setSubmittingSupport(true)
    setTimeout(() => {
      setSubmittingSupport(false)
      const successMsg = isAr 
        ? 'تم إرسال تذكرة الدعم بنجاح إلى مركز العمليات الأمنية.' 
        : 'Support ticket submitted successfully to SARMZ SOC.'
      setSupportSuccessMsg(successMsg)
      setSupportSubjectText('')
      setSupportMessageText('')
      setTimeout(() => setSupportSuccessMsg(''), 4000)
    }, 1500)
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

  const isAr  = lang === 'ar'
  const isLight = theme === 'light'

  const card   = isLight ? 'bg-white border-slate-200'   : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt    = isLight ? 'text-slate-800'              : 'text-white'
  const muted  = isLight ? 'text-slate-500'              : 'text-gray-500'
  const inact  = isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#1e2a3a] text-gray-400 hover:text-white'
  const divCls = isLight ? 'border-slate-100'            : 'border-[#1e2a3a]'
  const btnBrd = isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-[#1e2a3a] text-gray-400 hover:text-white'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
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

        {/* Language */}
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

        {/* Theme */}
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

        {/* Profile Settings */}
        <div className={`${card} border rounded-xl overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${divCls} bg-purple-500/5 flex items-center justify-between`}>
            <h3 className={`font-semibold text-sm flex items-center gap-2 ${txt}`}>
              <User className="w-4 h-4 text-purple-400"/>{T('profileSettings')}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold uppercase`}>Account</span>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-bold ${muted} flex items-center gap-1`}>
                  <User className="w-3 h-3"/> {T('changeUsername')}
                </label>
                <input value={newUsername} onChange={e=>setNewUsername(e.target.value)}
                  placeholder={T('usernamePlaceholder')}
                  className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-purple-400' : 'bg-[#0a0e1a] border-[#1e2a3a] text-white focus:border-purple-500/50'}`}/>
              </div>
              
              <div className="space-y-1">
                <label className={`text-xs font-bold ${muted} flex items-center gap-1`}>
                  <Lock className="w-3 h-3"/> {T('changePassword')}
                </label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}
                  placeholder={T('passwordPlaceholder')}
                  className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-purple-400' : 'bg-[#0a0e1a] border-[#1e2a3a] text-white focus:border-purple-500/50'}`}/>
              </div>
            </div>

            {newPassword && (
              <div className="space-y-3 p-3 rounded-xl bg-black/10 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>{isAr ? 'شروط كلمة المرور' : 'Password Requirements'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    { label: isAr ? '6 أحرف على الأقل' : 'At least 6 characters', met: newPassword.length >= 6 },
                    { label: isAr ? 'حرف كبير (A-Z)' : 'One uppercase (A-Z)', met: /[A-Z]/.test(newPassword) },
                    { label: isAr ? 'حرف صغير (a-z)' : 'One lowercase (a-z)', met: /[a-z]/.test(newPassword) },
                    { label: isAr ? 'رقم واحد (0-9)' : 'One number (0-9)', met: /[0-9]/.test(newPassword) },
                    { label: isAr ? 'رمز خاص (!@#...)' : 'Special char (!@#...)', met: /[^A-Za-z0-9]/.test(newPassword) },
                  ].map((rule, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[11px] transition-all ${rule.met ? 'text-green-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${rule.met ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-gray-700'}`}/>
                      {rule.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newPassword && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className={`text-xs font-bold ${muted} flex items-center gap-1`}>
                  <CheckCircle className="w-3 h-3 text-green-500"/> {T('confirmPassword')}
                </label>
                <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                  placeholder={T('confirmPasswordPlaceholder')}
                  className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all ${isLight ? 'bg-slate-50 border-slate-200 focus:border-purple-400' : 'bg-[#0a0e1a] border-[#1e2a3a] text-white focus:border-purple-500/50'}`}/>
              </div>
            )}
            
            {profileMsg.text && (
              <div className={`text-xs p-3 rounded-xl flex items-center gap-2 animate-in zoom-in duration-300 ${profileMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {profileMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5"/> : <Lock className="w-3.5 h-3.5"/>}
                {profileMsg.text}
              </div>
            )}
            
            <button onClick={handleUpdateProfile} disabled={updating || (!newUsername && !newPassword)}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all shadow-lg ${updating ? "opacity-50" : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99]"}`}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
              {T('updateProfileBtn')}
            </button>
          </div>
        </div>

        {/* Protection */}
        <div className={`${card} border rounded-xl p-4`}>
          <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${txt}`}>
            <Shield className="w-4 h-4 text-green-400"/>{T('protectionSettings')}
          </h3>
          {([
            { key:"notifications",      label:T('notifications'),      desc:T('notificationsDesc') },
          ] as const).map(({ key, label, desc }) => (
            <div key={key} className={`flex items-center justify-between py-3 border-b last:border-0 ${divCls}`}>
              <div>
                <p className={`text-sm ${settings[key] ? txt : muted}`}>{label}</p>
                <p className={`text-xs ${muted}`}>{desc}</p>
              </div>
              <Toggle value={settings[key] as boolean} onChange={() => toggle(key)} isLight={isLight}/>
            </div>
          ))}
        </div>

        {/* Cyber Support Card */}
        <div className={`${card} border rounded-xl overflow-hidden`}>
          <div className={`px-4 py-3 border-b ${divCls} bg-blue-500/5 flex items-center justify-between`}>
            <h3 className={`font-semibold text-sm flex items-center gap-2 ${txt}`}>
              <MessageSquare className="w-4 h-4 text-blue-400"/>
              {isAr ? 'الدعم الفني السيبراني' : 'Cyber Security Support'}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold uppercase">SOC Portal</span>
          </div>
          
          <form onSubmit={handleSupportSubmit} className="p-4 space-y-3">
            <p className={`text-xs ${muted}`}>
              {isAr ? 'افتح تذكرة آمنة مباشرة مع فريق مركز العمليات الأمنية (SOC) للإبلاغ عن اشتباه أو طلب دعم.' : 'Open a secure ticket directly with the Security Operations Center (SOC) team.'}
            </p>
            
            <div className="space-y-1">
              <label className={`text-xs font-bold ${muted}`}>
                {isAr ? 'الموضوع' : 'Subject'}
              </label>
              <input 
                type="text" 
                value={supportSubjectText} 
                onChange={(e) => setSupportSubjectText(e.target.value)}
                placeholder={isAr ? 'مثال: اشتباه في ملف آمن / false positive' : 'e.g., False positive detection on safe app'}
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
                {isAr ? 'الرسالة' : 'Message'}
              </label>
              <textarea 
                rows={3} 
                value={supportMessageText} 
                onChange={(e) => setSupportMessageText(e.target.value)}
                placeholder={isAr ? 'اكتب تفاصيل التذكرة هنا...' : 'Describe the security event or issue details...'}
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
              {isAr ? 'إرسال تذكرة SOC' : 'Submit SOC Ticket'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className={`${card} border border-red-500/30 rounded-xl p-4 space-y-4`}>
          <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5"/>
            {T('dangerZone')}
          </h3>
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-sm ${txt}`}>{T('clearAll')}</p>
              <p className={`text-xs ${muted}`}>{T('clearDesc')}</p>
            </div>
            <button onClick={() => { 
                if (confirm(isAr ? 'حذف جميع البيانات؟' : 'Delete all scan data?')) {
                  const currentUser = localStorage.getItem('rg_current_user') || undefined;
                  clearScansDB(currentUser);
                } 
              }}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5"/> {T('clearDB')}
            </button>
          </div>

          <div className={`border-t ${divCls} pt-4 flex items-center justify-between gap-4`}>
            <div>
              <p className={`text-sm font-semibold text-red-400`}>
                {isAr ? 'حذف الحساب وتصفير البيانات' : 'Delete Account & Wipe Data'}
              </p>
              <p className={`text-xs ${muted}`}>
                {isAr 
                  ? 'سيتم حذف حسابك بالكامل من الخادم وتصفير جميع سجلات الفحوصات والإعدادات المحلية نهائياً.' 
                  : 'Permanently deletes user account from server database and wipes all local session records.'}
              </p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-red-600/10 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5"/> 
              {isAr ? 'حذف وتصفير' : 'Wipe & Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* System Build Footer */}
      <div className="mt-12 mb-4 max-w-2xl text-center">
        <p className={`text-[11px] font-medium tracking-wide ${muted} select-none opacity-80`}>
          SARMZ RansomGuard v1.0.0 (Build 2026.05.25) - All Rights Reserved
        </p>
      </div>
    </div>
  )
}
