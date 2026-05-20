import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Shield, LayoutDashboard, FileSearch, Link2, ScrollText, Bell, Settings, LogOut, User, Sun, Moon, X, Info } from 'lucide-react'
import { fetchScans } from '../lib/store'
import { getLang, t } from '../lib/language'
import { getTheme, setThemeStorage, Theme } from '../lib/theme'

interface SidebarProps { 
  username: string; 
  onLogout: () => void; 
  theme: Theme;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ username, onLogout, theme, isOpen, onClose }: SidebarProps) {
  const location  = useLocation()

  const [alertCount, setAlertCount] = useState(0)
  const [lang, setLang]             = useState(getLang())
  const T    = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'
  const isLight = theme === 'light'

  useEffect(() => {
    const update = async () => {

      // count only ransomware detections for the badge
      const scans = await fetchScans(username)
      setAlertCount(scans.filter(s => s.overallLabel === 'Ransomware').length)
      setLang(getLang())
    }
    update()

    // keep the badge in sync whenever a new scan comes in
    window.addEventListener('scans-updated',  update)
    window.addEventListener('lang-changed',   () => setLang(getLang()))
    return () => {
      window.removeEventListener('scans-updated', update)
      window.removeEventListener('lang-changed',  () => setLang(getLang()))
    }
  }, [])

  const nav = [
    { icon: LayoutDashboard, label: T('dashboard'),    path: '/dashboard' },
    { icon: FileSearch,      label: T('fileAnalysis'), path: '/file-analysis' },
    { icon: Link2,           label: T('urlScanner'),   path: '/url-scanner' },
    { icon: ScrollText,      label: T('scanLogs'),     path: '/scan-logs' },
    { icon: Bell,            label: T('alerts'),       path: '/alerts', badge: alertCount },
    { icon: Settings,        label: T('settings'),     path: '/settings' },
  ]

  const toggleTheme = () => setThemeStorage(isLight ? 'dark' : 'light')

  const card   = isLight ? 'bg-white border-slate-200'   : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt    = isLight ? 'text-slate-800'               : 'text-white'
  const muted  = isLight ? 'text-slate-500'               : 'text-gray-400'
  const hov    = isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-[#1e2a3a] hover:text-white'
  const active = isLight ? 'bg-green-500 text-white'      : 'bg-green-500 text-black'

  // Responsive logic: 
  // On mobile, it slides from the side based on isOpen and lang direction.
  // On desktop (lg), it's always visible (translate-x-0).
  const mobileTranslate = isAr 
    ? (isOpen ? 'translate-x-0' : 'translate-x-full') 
    : (isOpen ? 'translate-x-0' : '-translate-x-full')

  return (
    <div className={`fixed inset-y-0 ${isAr ? 'right-0 border-l' : 'left-0 border-r'} z-50 w-44 ${card} flex flex-col py-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${mobileTranslate} shadow-2xl lg:shadow-none`}
      dir={isAr ? 'rtl' : 'ltr'}>

      
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-green-400 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <div className={`text-xs font-bold ${txt}`}>SARMZ RansomGuard</div>
            <div className={`text-[10px] ${muted}`}>Advanced Protection</div>
          </div>
        </div>
        
        {/* Close button for mobile */}
        <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1e2a3a]">
          <X className={`w-4 h-4 ${muted}`} />
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-semibold">{T('systemActive')}</span>
        </div>
      </div>

      
      <nav className="flex-1 px-2 space-y-1">
        {nav.map(({ icon: Icon, label, path, badge }: any) => {
          const isActive = location.pathname === path
          return (
            <Link key={path} to={path} onClick={onClose}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${isActive ? active : `${muted} ${hov}`}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
              
              {badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-2 mt-4 space-y-1">
        
        <button onClick={toggleTheme}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
            isLight
              ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              : 'bg-[#0a0e1a] border-[#1e2a3a] text-gray-300 hover:bg-[#1e2a3a]'
          }`}>
          <span className="flex items-center gap-2">
            {isLight ? <Sun className="w-3.5 h-3.5 text-yellow-500"/> : <Moon className="w-3.5 h-3.5 text-blue-400"/>}
            {isLight ? 'Light' : 'Dark'}
          </span>
          <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isLight ? 'bg-yellow-400' : 'bg-blue-600'}`}>
            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${isLight ? 'left-4' : 'left-0.5'}`}/>
          </div>
        </button>

        <div className={`border-t my-1 ${isLight ? 'border-slate-200' : 'border-[#1e2a3a]'}`}/>

        
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0e1a] border-[#1e2a3a]'}`}>
          <User className="w-4 h-4 text-green-400 flex-shrink-0"/>
          <span className={`text-xs truncate ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{username}</span>
        </div>

        
        <button onClick={onLogout}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${muted} hover:bg-red-500/10 hover:text-red-400`}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>{T('logoutBtn')}</span>
        </button>
      </div>
    </div>
  )
}
