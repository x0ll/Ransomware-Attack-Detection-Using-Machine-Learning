import { useState, useEffect, useRef } from 'react'
import { Link, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, RotateCcw, Shield, ShieldCheck } from 'lucide-react'
import { getLang, t } from '../lib/language'
import { API_BASE_URL } from '../lib/api-config'

interface ScanResult {
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
}

interface VTStats {
  malicious: number
  suspicious: number
  harmless: number
  undetected: number
}

/* ──────────── Circular Safe Gauge ──────────── */
function SafeGauge({ pct, isSafe }: { pct: number; isSafe: boolean }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = isSafe ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444'
  const glow = isSafe ? '0 0 18px #22c55e88' : pct > 50 ? '0 0 18px #f59e0b88' : '0 0 18px #ef444488'

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Track */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2a3a" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(${glow})`, transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
        {/* Center icon */}
        <text x="50" y="46" textAnchor="middle" fontSize="18" fill={color}>
          {isSafe ? '🛡️' : '⚠️'}
        </text>
        <text x="50" y="62" textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="monospace">
          {pct}%
        </text>
      </svg>
      <span
        className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
        style={{ color, border: `1px solid ${color}40`, background: `${color}15`, textShadow: `0 0 8px ${color}` }}
      >
        {isSafe ? '100% SAFE' : pct > 50 ? 'LOW RISK' : 'THREAT DETECTED'}
      </span>
    </div>
  )
}

/* ──────────── VT Stat Badge ──────────── */
function VTBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border min-w-[70px]"
      style={{ background: `${color}12`, borderColor: `${color}30` }}
    >
      <span className="text-xl font-black" style={{ color, textShadow: `0 0 10px ${color}80` }}>
        {count}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${color}cc` }}>
        {label}
      </span>
    </div>
  )
}

export default function UrlScanner() {
  const lang = getLang()
  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'

  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [vtStats, setVtStats] = useState<VTStats | null>(null)
  const [isSafeResult, setIsSafeResult] = useState<boolean | null>(null)
  const [pulseActive, setPulseActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Pulse animation during scanning
  useEffect(() => {
    if (scanning) {
      setPulseActive(true)
    } else {
      const timer = setTimeout(() => setPulseActive(false), 800)
      return () => clearTimeout(timer)
    }
  }, [scanning])

  const parseVTStats = (message: string): VTStats | null => {
    // Parse: "Threat Intelligence Results: X Malicious | Y Suspicious | Z Harmless | W Undetected"
    const m = message.match(/(\d+) Malicious \| (\d+) Suspicious \| (\d+) Harmless \| (\d+) Undetected/)
    if (!m) return null
    return {
      malicious: parseInt(m[1]),
      suspicious: parseInt(m[2]),
      harmless: parseInt(m[3]),
      undetected: parseInt(m[4])
    }
  }

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setScanning(true)
    setResults([])
    setVtStats(null)
    setIsSafeResult(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/scan-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!res.ok) throw new Error('Failed to scan URL')

      const data = await res.json()
      const resultsList: ScanResult[] = data.results || []
      setResults(resultsList)

      // Extract VT stats from info message
      const infoMsg = resultsList.find(r => r.type === 'info' && r.message.includes('Malicious'))
      if (infoMsg) {
        const stats = parseVTStats(infoMsg.message)
        if (stats) setVtStats(stats)
      }

      // Determine overall safety
      const hasError = resultsList.some(r => r.type === 'error')
      const hasWarning = resultsList.some(r => r.type === 'warning')
      setIsSafeResult(!hasError && !hasWarning)

    } catch (err: any) {
      setResults([{ type: 'error', message: err.message || 'An error occurred during scanning' }])
      setIsSafeResult(false)
    } finally {
      setScanning(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setResults([])
    setVtStats(null)
    setIsSafeResult(null)
  }

  // Compute safe percentage from VT stats
  const safePercent = vtStats
    ? Math.round((vtStats.harmless / Math.max(vtStats.harmless + vtStats.malicious + vtStats.suspicious, 1)) * 100)
    : isSafeResult === true ? 100 : isSafeResult === false ? 0 : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Link className="w-6 h-6 text-blue-500" />
            {T('urlScanner')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {T('urlScannerDesc')}
          </p>
        </div>

        {/* URL Input Form with Pulse */}
        <form onSubmit={handleScan} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={T('enterUrlPlaceholder')}
              required
              disabled={scanning}
              className="w-full bg-slate-50 dark:bg-[#1f2937] border text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none transition-all duration-300"
              style={{
                borderColor: pulseActive ? '#3b82f6' : undefined,
                boxShadow: pulseActive
                  ? '0 0 0 3px rgba(59,130,246,0.15), 0 0 15px rgba(59,130,246,0.2)'
                  : undefined,
                animation: pulseActive ? 'urlScanPulse 1.5s ease-in-out infinite' : undefined
              }}
            />
            {/* Inline pulse style */}
            <style>{`
              @keyframes urlScanPulse {
                0%, 100% { box-shadow: 0 0 0 2px rgba(59,130,246,0.15), 0 0 10px rgba(59,130,246,0.15); border-color: #3b82f6; }
                50%       { box-shadow: 0 0 0 5px rgba(59,130,246,0.08), 0 0 25px rgba(59,130,246,0.35); border-color: #60a5fa; }
              }
            `}</style>
          </div>

          <button
            type="submit"
            disabled={scanning || !url}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link className="w-5 h-5" />}
            <span className="hidden sm:inline">{T('scanUrlBtn')}</span>
          </button>

          {(url || results.length > 0) && !scanning && (
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              title={isAr ? 'مسح' : 'Reset'}
            >
              <RotateCcw className="w-5 h-5" />
              <span className="hidden sm:inline">{isAr ? 'مسح' : 'Reset'}</span>
            </button>
          )}
        </form>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8 space-y-5">
            {/* VT Stats Banner + Safe Gauge */}
            {(vtStats || isSafeResult !== null) && (
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-[#1e2a3a] bg-slate-50 dark:bg-[#0d1117]">
                {/* Safe Gauge */}
                <div className="shrink-0">
                  <SafeGauge pct={isSafeResult === true && !vtStats ? 100 : safePercent} isSafe={!!isSafeResult} />
                </div>

                {/* VT Stat Badges */}
                {vtStats && (
                  <div className="flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-gray-500 mb-3">
                      {isAr ? 'نتائج VirusTotal' : 'VirusTotal Threat Intelligence'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <VTBadge label={isAr ? 'خبيث' : 'Malicious'} count={vtStats.malicious} color="#ef4444" />
                      <VTBadge label={isAr ? 'مشبوه' : 'Suspicious'} count={vtStats.suspicious} color="#f59e0b" />
                      <VTBadge label={isAr ? 'آمن' : 'Harmless'} count={vtStats.harmless} color="#22c55e" />
                      <VTBadge label={isAr ? 'غير محدد' : 'Undetected'} count={vtStats.undetected} color="#6b7280" />
                    </div>
                  </div>
                )}

                {/* Safe only message (no VT stats) */}
                {!vtStats && isSafeResult === true && (
                  <div className="flex-1 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-green-500 shrink-0" style={{ filter: 'drop-shadow(0 0 10px #22c55e88)' }} />
                    <div>
                      <p className="text-green-400 font-bold text-sm">{isAr ? 'الرابط آمن' : 'URL Appears Safe'}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-500">{isAr ? 'لم يتم اكتشاف تهديدات في هذا الرابط.' : 'No threats detected for this URL.'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Individual Result Cards (hide the raw VT stats info message, show the rest) */}
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              {isAr ? 'تفاصيل الفحص' : 'Scan Details'}
            </h3>
            <div className="space-y-3">
              {results
                .filter(r => !(r.type === 'info' && r.message.includes('Threat Intelligence Results:')))
                .map((result, i) => {
                  let Icon = CheckCircle2
                  let colorClass = 'text-green-500 bg-green-500/10 border-green-500/20'

                  if (result.type === 'error') {
                    Icon = ShieldAlert
                    colorClass = 'text-red-500 bg-red-500/10 border-red-500/20'
                  } else if (result.type === 'warning') {
                    Icon = AlertTriangle
                    colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                  } else if (result.type === 'info') {
                    Icon = Shield
                    colorClass = 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                  }

                  return (
                    <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${colorClass}`}>
                      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium">{result.message}</p>
                    </div>
                  )
                })}
            </div>

            {/* Scan Another URL button */}
            <button
              onClick={handleReset}
              className="mt-4 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {isAr ? 'فحص رابط جديد' : 'Scan Another URL'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
