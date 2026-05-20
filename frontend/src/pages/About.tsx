import { useState, useEffect } from 'react'
import { getLang, t } from '../lib/language'
import { getTheme } from '../lib/theme'
import { Info, Shield, Cpu, Target, Eye } from 'lucide-react'

export default function AboutPage() {
  const [lang, setLang] = useState(getLang())
  const [theme, setTheme] = useState(getTheme())

  useEffect(() => {
    const handleLang = () => setLang(getLang())
    const handleTheme = () => setTheme(getTheme())
    
    window.addEventListener('lang-changed', handleLang)
    window.addEventListener('theme-changed', handleTheme)
    
    return () => {
      window.removeEventListener('lang-changed', handleLang)
      window.removeEventListener('theme-changed', handleTheme)
    }
  }, [])

  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'
  const isLight = theme === 'light'

  const card = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0d1117] border-[#1e2a3a] shadow-lg'
  const txt = isLight ? 'text-slate-800' : 'text-white'
  const muted = isLight ? 'text-slate-500' : 'text-gray-400'
  const iconBg = isLight ? 'bg-blue-50' : 'bg-blue-500/10'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className={`p-8 rounded-2xl border ${card} flex flex-col md:flex-row items-center gap-8`}>
        <div className="flex-1 space-y-4 text-center md:text-start">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold text-sm">
            <Info className="w-4 h-4" />
            {T('aboutTitle')}
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold ${txt}`}>{T('aboutWelcome')}</h1>
          <p className={`text-sm md:text-base leading-relaxed ${muted}`}>
            {T('aboutWelcomeDesc')}
          </p>
        </div>
        <div className="w-32 h-32 md:w-48 md:h-48 flex-shrink-0 relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
          <div className={`w-full h-full rounded-2xl border ${isLight ? 'bg-white border-blue-100' : 'bg-[#1e2a3a] border-blue-500/30'} flex items-center justify-center relative z-10 shadow-2xl overflow-hidden`}>
            <Shield className="w-20 h-20 md:w-24 md:h-24 text-blue-500" />
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-50" />
          </div>
        </div>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Approach */}
        <div className={`p-6 rounded-2xl border ${card} hover:-translate-y-1 transition-transform duration-300`}>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
            <Cpu className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className={`text-lg font-bold mb-3 ${txt}`}>{T('aboutApproach')}</h2>
          <p className={`text-sm leading-relaxed ${muted}`}>
            {T('aboutApproachDesc')}
          </p>
        </div>

        {/* Why Us */}
        <div className={`p-6 rounded-2xl border ${card} hover:-translate-y-1 transition-transform duration-300 delay-75`}>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className={`text-lg font-bold mb-3 ${txt}`}>{T('aboutWhy')}</h2>
          <p className={`text-sm leading-relaxed ${muted}`}>
            {T('aboutWhyDesc')}
          </p>
        </div>

        {/* Vision */}
        <div className={`p-6 rounded-2xl border ${card} hover:-translate-y-1 transition-transform duration-300 delay-150`}>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
            <Eye className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className={`text-lg font-bold mb-3 ${txt}`}>{T('aboutVision')}</h2>
          <p className={`text-sm leading-relaxed ${muted}`}>
            {T('aboutVisionDesc')}
          </p>
        </div>

      </div>

      {/* Footer Banner */}
      <div className={`mt-8 p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-blue-500/20`}>
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8" />
          <div>
            <h3 className="font-bold">SARMZ RansomGuard</h3>
            <p className="text-blue-100 text-sm opacity-80">Securing your digital world.</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 text-sm font-medium">
          Version 1.0.0
        </div>
      </div>

    </div>
  )
}
