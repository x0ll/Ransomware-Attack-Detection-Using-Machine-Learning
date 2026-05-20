import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Menu, X, Shield, ArrowLeft } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import FileAnalysis from './pages/FileAnalysis'
import UrlScanner from './pages/UrlScanner'
import ScanLogs from './pages/ScanLogs'
import Alerts from './pages/Alerts'
import SettingsPage from './pages/Settings'
import LoginPage from './pages/Login'
import AboutPage from './pages/About'
import { getTheme, applyTheme, Theme } from './lib/theme'
import { getLang, t } from './lib/language'

export default function App() {

  // restore session on page refresh
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('rg_current_user'))
  const [theme, setTheme] = useState<Theme>(getTheme())
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [lang, setLang] = useState(getLang())

  useEffect(() => {

    applyTheme(theme)

    const handler = () => {
      const t = getTheme()
      setTheme(t)
      applyTheme(t)
    }
    const langHandler = () => setLang(getLang())

    window.addEventListener('theme-changed', handler)
    window.addEventListener('lang-changed', langHandler)
    return () => {
      window.removeEventListener('theme-changed', handler)
      window.removeEventListener('lang-changed', langHandler)
    }
  }, [])

  const handleLogin = (username: string) => {

    localStorage.setItem('rg_current_user', username)
    setUser(username)
  }

  // wipe the session and drop back to the login screen
  const handleLogout = () => {

    localStorage.removeItem('rg_current_user')
    setUser(null)
  }

  if (!user) {
    if (window.location.pathname === '/about') {
      const isLight = theme === 'light'
      const isAr = lang === 'ar'
      return (
        <div className={`flex min-h-screen transition-colors duration-300 ${isLight ? 'bg-[#f0f4f8]' : 'bg-[#0a0e1a]'}`}>
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto p-4 lg:p-6" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="max-w-5xl mx-auto w-full flex justify-end mb-6">
              <button onClick={() => window.location.href = '/'} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ${isLight ? 'bg-white hover:bg-slate-50 text-slate-700' : 'bg-[#1e2a3a] hover:bg-[#2a3b52] text-white'}`}>
                <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            </div>
            <AboutPage />
          </div>
        </div>
      )
    }
    return <LoginPage onLogin={handleLogin} />
  }

  const isLight = theme === 'light'
  const isAr = lang === 'ar'
  const T = (k: string) => t[lang][k] || k

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isLight ? 'bg-[#f0f4f8]' : 'bg-[#0a0e1a]'}`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        username={user} 
        onLogout={handleLogout} 
        theme={theme} 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className={`lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-30 transition-colors duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-[#1e2a3a]'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-green-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-white'}`}>SARMZ RansomGuard</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-[#1e2a3a] text-gray-400'}`}
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className={`flex-1 p-4 lg:p-6 transition-all duration-300 ${isAr ? 'lg:mr-44' : 'lg:ml-44'}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/file-analysis" element={<FileAnalysis />} />
            <Route path="/url-scanner"  element={<UrlScanner />} />
            <Route path="/scan-logs"    element={<ScanLogs />} />
            <Route path="/alerts"       element={<Alerts />} />
            <Route path="/about"        element={<AboutPage />} />
            <Route path="/settings"     element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
