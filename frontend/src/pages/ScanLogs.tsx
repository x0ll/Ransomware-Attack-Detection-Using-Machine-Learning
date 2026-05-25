import { useEffect, useState } from 'react'
import { fetchScans, ScanResult } from '../lib/store'
import { getLang, t } from '../lib/language'
import { ScrollText, CheckCircle, XCircle, Search, Loader2 } from 'lucide-react'
import { getTheme, Theme } from '../lib/theme'

export default function ScanLogs() {
  const [scans, setScans]   = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [search, setSearch] = useState('')
  const [lang,  setLang]  = useState(getLang())
  const [theme, setTheme] = useState<Theme>(getTheme())
  const T = (k: string) => t[lang][k] || k
  const isLight = theme === 'light'

  useEffect(() => {
    // Retrieve the current user's session to load only their scan records
    const currentUser = localStorage.getItem('rg_current_user') || undefined
    let wakeUpTimer: any

    const update = async () => {
      setLoading(true)
      setIsWakingUp(false)
      
      // Start a timer. If API doesn't respond in 2.5s, it is likely a Render cold start.
      wakeUpTimer = setTimeout(() => {
        setIsWakingUp(true)
      }, 2500)

      try {
        const data = await fetchScans(currentUser)
        setScans(data)
      } catch (err) {
        console.error(err)
      } finally {
        clearTimeout(wakeUpTimer)
        setIsWakingUp(false)
        setLoading(false)
        setLang(getLang())
      }
    }

    // Load scans on mount and re-fetch whenever a new scan is completed
    update()
    window.addEventListener("scans-updated", update)
    window.addEventListener("lang-changed",  () => setLang(getLang()))
    window.addEventListener("theme-changed", () => setTheme(getTheme()))
    return () => {
      clearTimeout(wakeUpTimer)
      window.removeEventListener("scans-updated", update)
      window.removeEventListener("lang-changed",  () => setLang(getLang()))
      window.removeEventListener("theme-changed", () => setTheme(getTheme()))
    }
  }, [])

  // Filter scan results by filename and reverse to show most recent first
  const filtered = scans.filter(s =>
    s.filename.toLowerCase().includes(search.toLowerCase())
  ).reverse()

  const isAr  = lang === 'ar'

  const card  = isLight ? 'bg-white border-slate-200'          : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt   = isLight ? 'text-slate-800'                     : 'text-white'
  const muted = isLight ? 'text-slate-500'                     : 'text-gray-400'
  const hdr   = isLight ? 'text-slate-500'                     : 'text-gray-500'
  const row   = isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1e2a3a] hover:bg-[#1e2a3a]/30'
  const inp   = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400'
    : 'bg-[#0d1117] border-[#1e2a3a] text-white placeholder-gray-500'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${txt}`}>{T('scanLogsTitle')}</h1>
          <p className={`text-sm ${muted}`}>{T('scanLogsDesc')}</p>
        </div>
        {/* Search input filters results in real time without a backend call */}
        <div className="relative w-full md:w-auto">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث...' : 'Search...'}
            className={`border text-xs pl-8 pr-3 py-2 rounded-lg outline-none w-full md:w-48 focus:border-green-500/50 transition-colors ${inp}`}/>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {isWakingUp && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <div>
                <p className="font-bold">{isAr ? '☕ جاري تشغيل خادم الخدمة السحابية...' : '☕ Waking up the cloud server...'}</p>
                <p className="opacity-80 mt-0.5">
                  {isAr 
                    ? 'بسبب الاستضافة المجانية على Render، قد يستغرق الخادم حوالي 50 ثانية للاستيقاظ بعد فترة من الخمول. شكراً لانتظارك!'
                    : 'Since the API is hosted on Render\'s free tier, the server takes ~50 seconds to wake up. Thank you for your patience!'}
                </p>
              </div>
            </div>
          )}
          <div className={`${card} border rounded-xl p-4 space-y-3`}>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/6" />
            </div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <ScrollText className={`w-12 h-12 mb-3 ${isLight ? "text-slate-300" : "text-gray-600"}`}/>
          <p className={`text-lg font-bold mb-1 ${txt}`}>{T('noLogs')}</p>
        </div>
      ) : (
        <div className={`${card} border rounded-xl overflow-x-auto transition-colors no-scrollbar`}>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isLight ? "border-slate-200" : "border-[#1e2a3a]"}`}>
                {[T('filename'), T('time'), T('result')].map(h => (
                  <th key={h} className={`text-left text-xs px-4 py-3 font-medium ${hdr}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const isRansomware = s.overallLabel === 'Ransomware';
                return (
                  <tr 
                    key={s.id} 
                    className={`border-b last:border-0 transition-all ${row} ${
                      isRansomware 
                        ? (isLight ? 'bg-red-50/60 border-l-4 border-l-red-500' : 'bg-red-950/15 border-l-4 border-l-red-500 shadow-[inset_4px_0_8px_rgba(239,68,68,0.15)]') 
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs truncate max-w-[280px] block ${isLight ? "text-slate-700" : "text-gray-300"}`}>{s.filename}</span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${muted}`}>{s.time}</td>
                    <td className="px-4 py-3">
                      {/* Color-coded badge based on the classification result */}
                      <span className={`flex items-center gap-1 text-[10px] font-bold w-fit px-2 py-0.5 rounded-lg border
                        ${isRansomware 
                          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                          : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                        {isRansomware
                          ? <><XCircle className="w-3 h-3"/>{T('ransomwareDetected')}</>
                          : <><CheckCircle className="w-3 h-3"/>{T('safeFiles')}</>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
