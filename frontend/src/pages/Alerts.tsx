import { useEffect, useState } from 'react'
import { fetchScans, clearAlertsDB, ScanResult } from '../lib/store'
import { getLang, t } from '../lib/language'
import { XCircle, AlertTriangle, Bell, Eye, Clock, X, Shield, BarChart2, FileCode, Trash2 } from 'lucide-react'
import { getTheme, Theme } from '../lib/theme'

/**
 * DetailModal — displays a full breakdown of a selected alert,
 * including file info, row counts, and model performance metrics.
 * Clicking the backdrop closes the modal.
 */
function DetailModal({ alert, onClose, lang, isLight }: { alert: any, onClose: () => void, lang: string, isLight: boolean }) {
  const T = (k: string) => (t as any)[lang][k] || k
  const modalCard = isLight ? 'bg-white border-slate-200'   : 'bg-[#0d1117] border-[#1e2a3a]'
  const inner     = isLight ? 'bg-slate-50'                 : 'bg-[#0a0e1a]'
  const mdiv      = isLight ? 'border-slate-200'            : 'border-[#1e2a3a]'
  const mtxt      = isLight ? 'text-slate-800'              : 'text-white'
  const mmuted    = isLight ? 'text-slate-500'              : 'text-gray-500'
  const msub      = isLight ? 'text-slate-600'              : 'text-gray-300'
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Stop click propagation so the modal itself doesn't close when clicked */}
      <div className={`${modalCard} border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className={`p-5 border-b ${mdiv} flex items-center gap-3 rounded-t-2xl ${alert.type === 'critical' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.type === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
            {alert.type === 'critical' ? <XCircle className="w-5 h-5 text-red-400"/> : <AlertTriangle className="w-5 h-5 text-yellow-400"/>}
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
              {alert.type === 'critical' ? `🚨 ${T('critical')}` : `⚠ ${T('warning')}`}
            </p>
            <p className={`text-xs truncate ${mmuted}`}>{alert.filename}</p>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? "bg-slate-100 hover:bg-slate-200" : "bg-[#1e2a3a] hover:bg-[#2a3a4a]"}`}>
            <X className={`w-4 h-4 ${mmuted}`}/>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className={`${inner} rounded-xl p-4`}>
            <h3 className={`text-xs font-semibold mb-3 flex items-center gap-2 ${mtxt}`}>
              <FileCode className="w-3.5 h-3.5 text-blue-400"/>{T('filename')}
            </h3>
            <div className="space-y-2">
              {[
                { l: T('filename'),   v: alert.filename },
                { l: T('time'),       v: alert.time },
                { l: T('rows'),       v: alert.totalRows?.toLocaleString() },
                { l: T('result'),     v: '🚨 ' + T('ransomwareDetected') },
                { l: T('confidence'), v: (alert.overallConfidence * 100).toFixed(1) + '%' },
              ].map(({ l, v }) => (
                <div key={l} className={`flex justify-between text-xs border-b pb-1.5 ${mdiv}`}>
                  <span className={mmuted}>{l}</span>
                  <span className={`font-medium ${l === T('result') || l === T('confidence') ? 'text-red-400' : msub}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ransomware vs benign row counts from the scan */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${inner} rounded-xl p-3 text-center border border-red-500/20`}>
              <p className={`text-[10px] mb-1 ${mmuted}`}>{T('ransomwareDetected')}</p>
              <p className="text-red-400 text-2xl font-bold">{alert.ransomwareCount}</p>
            </div>
            <div className={`${inner} rounded-xl p-3 text-center border border-green-500/20`}>
              <p className={`text-[10px] mb-1 ${mmuted}`}>{T('safeFiles')}</p>
              <p className="text-green-400 text-2xl font-bold">{alert.benignCount}</p>
            </div>
          </div>

          {/* Model evaluation metrics reported by the Random Forest classifier */}
          <div className={`${inner} rounded-xl p-4 overflow-x-auto`}>
            <h3 className={`text-xs font-semibold mb-3 flex items-center gap-2 ${mtxt}`}>
              <BarChart2 className="w-3.5 h-3.5 text-green-400"/>{T('modelMetrics')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { l: T('accuracy'),  v: alert.metrics?.accuracy },
                { l: 'Precision',    v: alert.metrics?.precision },
                { l: 'Recall',       v: alert.metrics?.recall },
                { l: 'F1',           v: alert.metrics?.f1 },
              ].map(({ l, v }) => (
                <div key={l} className="text-center">
                  <p className={`text-[10px] mb-1 ${mmuted}`}>{l}</p>
                  <p className={`text-sm font-bold ${mtxt}`}>{v ? (v * 100).toFixed(1) + '%' : 'N/A'}</p>
                  <div className={`w-full rounded-full h-1 mt-1 ${isLight ? "bg-slate-200" : "bg-[#1e2a3a]"}`}>
                    <div className="bg-green-500 h-1 rounded-full" style={{ width: v ? (v * 100) + '%' : '0%' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Severity indicator with recommended action */}
          <div className={`rounded-xl p-3 flex items-center gap-3 ${alert.type === 'critical' ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
            <Shield className={`w-5 h-5 flex-shrink-0 ${alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}/>
            <div>
              <p className={`text-xs font-bold ${alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                {alert.type === 'critical' ? T('critical') : T('warning')}
              </p>
              <p className={`text-[10px] ${mmuted}`}>
                {alert.type === 'critical'
                  ? (lang === 'ar' ? 'ثقة عالية — إجراء فوري مطلوب' : 'High confidence — immediate action required')
                  : (lang === 'ar' ? 'فدية محتملة — تحقيق إضافي مطلوب' : 'Possible ransomware — further investigation recommended')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Alerts() {
  const [scans, setScans]       = useState<ScanResult[]>([])
  const [filter, setFilter]     = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [clearing, setClearing] = useState(false)
  const [lang,  setLang]  = useState(getLang())
  const [theme, setTheme] = useState<Theme>(getTheme())
  const T = (k: string) => t[lang][k] || k
  const isLight = theme === 'light'

  useEffect(() => {
    const currentUser = localStorage.getItem('rg_current_user') || undefined
    const update = async () => {
      setScans(await fetchScans(currentUser))
      setLang(getLang())
    }
    update()
    window.addEventListener("scans-updated", update)
    window.addEventListener("lang-changed",  () => setLang(getLang()))
    window.addEventListener("theme-changed", () => setTheme(getTheme()))
    return () => {
      window.removeEventListener("scans-updated", update)
      window.removeEventListener("lang-changed",  () => setLang(getLang()))
      window.removeEventListener("theme-changed", () => setTheme(getTheme()))
    }
  }, [])

  const threats   = scans.filter(s => s.overallLabel === "Ransomware")
  const highConf  = threats.filter(s => s.overallConfidence >= 0.9)
  const lowConf   = threats.filter(s => s.overallConfidence < 0.9)

  const allAlerts = [...highConf.map(s => ({...s, type:"critical"})), ...lowConf.map(s => ({...s, type:"warning"}))]
  const filtered  = filter === 'all' ? allAlerts : allAlerts.filter(a => a.type === filter)
  const isAr = lang === 'ar'

  const handleClearAllAlerts = async () => {
    if (allAlerts.length === 0) return
    if (!confirm(T('clearAllAlertsConfirm'))) return
    setClearing(true)
    setSelected(null)
    const currentUser = localStorage.getItem('rg_current_user') || undefined
    const ok = await clearAlertsDB(currentUser)
    if (ok) {
      setScans(await fetchScans(currentUser))
    }
    setClearing(false)
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {selected && <DetailModal alert={selected} onClose={() => setSelected(null)} lang={lang} isLight={isLight}/>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isLight ? "text-slate-800" : "text-white"}`}>{T('alertsTitle')}</h1>
          <p className={`text-sm ${isLight ? "text-slate-500" : "text-gray-400"}`}>{T('alertsDesc')}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <span className="flex-1 md:flex-none flex items-center justify-center gap-1.5 border border-red-500/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium">
            <XCircle className="w-3.5 h-3.5"/>{highConf.length} {T('critical')}
          </span>
          <span className="flex-1 md:flex-none flex items-center justify-center gap-1.5 border border-yellow-500/50 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5"/>{lowConf.length} {T('warning')}
          </span>
          <button
            type="button"
            onClick={handleClearAllAlerts}
            disabled={clearing || allAlerts.length === 0}
            title={T('clearAllAlertsDesc')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              allAlerts.length === 0
                ? isLight
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'border-[#1e2a3a] text-gray-600 cursor-not-allowed'
                : 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5"/>
            {clearing ? T('clearingAlerts') : T('clearAllAlerts')}
          </button>
        </div>
      </div>

      {/* Filter tabs to narrow the alert list by severity */}
      <div className="flex gap-2 mb-4">
        {[
          { label: `${T('all')} (${allAlerts.length})`,      key: 'all' },
          { label: `${T('critical')} (${highConf.length})`,  key: 'critical' },
          { label: `${T('warning')} (${lowConf.length})`,    key: 'warning' },
        ].map(({ label, key }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key ? 'bg-green-500 text-white' : isLight ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#1e2a3a] text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {allAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Bell className={`w-12 h-12 mb-3 ${isLight ? "text-slate-300" : "text-gray-600"}`}/>
          <p className={`text-lg font-bold mb-1 ${isLight ? "text-slate-800" : "text-white"}`}>{T('noAlerts')}</p>
          <p className={`text-sm ${isLight ? "text-slate-500" : "text-gray-400"}`}>{T('noAlertsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a: any) => (
            <div key={a.id} className={`border rounded-xl p-4 flex items-start gap-3 ${a.type === 'critical' ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.type === 'critical' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                {a.type === 'critical' ? <XCircle className="w-4 h-4 text-red-400"/> : <AlertTriangle className="w-4 h-4 text-yellow-400"/>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${isLight ? "text-slate-800" : "text-white"}`}>{T('ransomwareDetected')} in {a.filename}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${a.type === 'critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}>
                    {a.type === 'critical' ? T('critical') : T('warning')}
                  </span>
                </div>
                <p className={`text-xs mb-1 ${isLight ? "text-slate-500" : "text-gray-400"}`}>{a.ransomwareCount} {isAr ? 'صفوف فدية من' : 'ransomware rows out of'} {a.totalRows} {isAr ? 'إجمالي' : 'total'}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className={`flex items-center gap-1 ${isLight ? "text-slate-400" : "text-gray-500"}`}><Clock className="w-3 h-3"/>{a.time}</span>
                  <span className="text-red-400">{T('confidence')}: {(a.overallConfidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              {/* Eye icon opens the DetailModal for this alert */}
              <button onClick={() => setSelected(a)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isLight ? "bg-slate-100 hover:bg-slate-200" : "bg-[#1e2a3a] hover:bg-[#2a3a4a]"}`}>
                <Eye className={`w-4 h-4 ${isLight ? "text-slate-500" : "text-gray-400"}`}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
