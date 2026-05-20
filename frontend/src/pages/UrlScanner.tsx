import { useState } from 'react'
import { Link, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { getLang, t } from '../lib/language'
import { API_BASE_URL } from '../lib/api-config'

interface ScanResult {
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
}

export default function UrlScanner() {
  const lang = getLang()
  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'
  
  const [url, setUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    
    setScanning(true)
    setResults([])

    try {
      const res = await fetch(`${API_BASE_URL}/api/scan-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      })

      if (!res.ok) {
        throw new Error('Failed to scan URL')
      }

      const data = await res.json()
      setResults(data.results || [])
    } catch (err: any) {
      setResults([{ type: 'error', message: err.message || 'An error occurred during scanning' }])
    } finally {
      setScanning(false)
    }
  }

  const handleReset = () => {
    setUrl('')
    setResults([])
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 lg:p-8 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
            <Link className="w-6 h-6 text-blue-500" />
            {T('urlScanner')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {T('urlScannerDesc')}
          </p>
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={T('enterUrlPlaceholder')}
            className="flex-1 bg-slate-50 dark:bg-[#1f2937] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            required
            disabled={scanning}
          />
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

        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              {T('scanResults')}
            </h3>
            <div className="space-y-3">
              {results.map((result, i) => {
                let Icon = CheckCircle2
                let colorClass = 'text-green-500 bg-green-500/10 border-green-500/20'
                
                if (result.type === 'error') {
                  Icon = ShieldAlert
                  colorClass = 'text-red-500 bg-red-500/10 border-red-500/20'
                } else if (result.type === 'warning') {
                  Icon = AlertTriangle
                  colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                } else if (result.type === 'info') {
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

            {/* Scan Again button after results */}
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
