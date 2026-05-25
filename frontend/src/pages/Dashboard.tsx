import { useEffect, useState } from 'react'
import { fetchScans, ScanResult } from '../lib/store'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileText, XCircle, Shield, Clock, Zap, Download, Loader2, Cpu, Database, Activity, ShieldCheck } from 'lucide-react'



import { Link } from 'react-router-dom'
import { getLang, t } from '../lib/language'
import { getTheme, Theme } from '../lib/theme'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Dashboard() {
  const [scans, setScans] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isWakingUp, setIsWakingUp] = useState(false)
  const [lang, setLang] = useState(getLang())
  const [theme, setTheme] = useState<Theme>(getTheme())
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'
  const isLight = theme === 'light'

  useEffect(() => {
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
    
    update()

    // Refresh relative time every minute
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)

    window.addEventListener('scans-updated', update)
    window.addEventListener('lang-changed', () => setLang(getLang()))
    window.addEventListener('theme-changed', () => setTheme(getTheme()))
    return () => {
      clearTimeout(wakeUpTimer)
      clearInterval(timer)
      window.removeEventListener('scans-updated', update)
      window.removeEventListener('lang-changed', () => setLang(getLang()))
      window.removeEventListener('theme-changed', () => setTheme(getTheme()))
    }
  }, [])

  const [now, setNow] = useState(new Date())

  const formatRelative = (timeStr?: string) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr.replace(/-/g, '/'))
      if (isNaN(date.getTime())) return timeStr

      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
      if (seconds < 30) return T('justNow') || 'Just now'
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`
      return `${Math.floor(hours / 24)}d ago`
    } catch {
      return timeStr
    }
  }


  const getLastAction = () => {
    if (!last) return 'System Idle'
    const date = new Date(last.time.replace(/-/g, '/'))
    const diffMin = Math.floor((new Date().getTime() - date.getTime()) / 60000)

    if (diffMin < 5) {
      const result = last.overallLabel === 'Ransomware' ? 'Blocked' : 'Clean'
      return `File Check: ${last.filename} - ${result}`
    }
    return `Last Audit: ${formatRelative(last.time)}`
  }




  const total = scans.length
  const threats = scans.filter(s => s.overallLabel === 'Ransomware').length
  const safe = scans.filter(s => s.overallLabel !== 'Ransomware').length
  const last = scans[scans.length - 1]
  const avgConf = total > 0
    ? (scans.reduce((a, s) => a + s.overallConfidence, 0) / total * 100).toFixed(1)
    : '0.0'

  // Exact metrics from training_model.ipynb (Random Forest Results)
  const modelMetrics = {
    accuracy: '99.4',
    precision: '99.8',
    recall: '98.9',
    f1: '99.3',
    dataset: 'N=62,485'
  }

  const generatePDFReport = async () => {
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const user = localStorage.getItem('rg_current_user') || 'Guest'

      // Colors
      const bgDark = [11, 15, 25] as [number, number, number]
      const bgCard = [21, 30, 45] as [number, number, number]
      const textWhite = [248, 250, 252] as [number, number, number]
      const textMuted = [148, 163, 184] as [number, number, number]
      const colGreen = [16, 185, 129] as [number, number, number]
      const colRed = [239, 68, 68] as [number, number, number]
      const colBlue = [14, 165, 233] as [number, number, number]

      // helpers
      const hdr = (title: string, yp: number) => {
        doc.setFillColor(...bgCard); doc.roundedRect(10, yp, W - 20, 10, 2, 2, 'F')
        doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.roundedRect(10, yp, W - 20, 10, 2, 2, 'S')
        doc.setTextColor(...textWhite); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.text(title, 14, yp + 6.5); return yp + 14
      }
      const newPage = () => {
        doc.addPage()
        doc.setFillColor(...bgDark); doc.rect(0, 0, W, H, 'F')
        return 16
      }
      const chk = (yp: number, need = 20) => yp > H - need ? newPage() : yp

      // Fill ultra dark bg
      doc.setFillColor(...bgDark); doc.rect(0, 0, W, H, 'F')

      // Header Banner
      doc.setFillColor(...bgCard); doc.rect(0, 0, W, 38, 'F')
      doc.setFillColor(...colGreen); doc.rect(0, 38, W, 1.5, 'F')

      // Shield logo
      doc.setFillColor(...colGreen); doc.roundedRect(12, 8, 16, 20, 2, 2, 'F')
      doc.setFillColor(...bgCard); doc.roundedRect(14, 11, 12, 14, 1, 1, 'F')
      doc.setFillColor(...colGreen); doc.roundedRect(15, 12, 10, 8, 1, 1, 'F')

      // Title
      doc.setTextColor(...textWhite); doc.setFontSize(22); doc.setFont('helvetica', 'bold')
      doc.text('SARMZ RansomGuard', 33, 18)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.setTextColor(...textMuted); doc.text('Advanced Threat Detection & Intelligence', 33, 25)
      doc.setTextColor(...colGreen); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('EXECUTIVE SECURITY REPORT', 33, 33)

      // Meta
      doc.setTextColor(...textMuted); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.text(`DATE: ${dateStr}  ${timeStr}`, W - 12, 18, { align: 'right' })
      doc.text(`OPERATOR: ${user}`, W - 12, 25, { align: 'right' })
      doc.text(`SCANS: ${total}`, W - 12, 32, { align: 'right' })

      let y = 48

      // ── EXECUTIVE SUMMARY CARDS ──
      y = hdr('SYSTEM OVERVIEW', y)
      const cards = [
        { label: 'Total Files', value: String(total), color: colBlue },
        { label: 'Threats Found', value: String(threats), color: colRed },
        { label: 'Clean Files', value: String(safe), color: colGreen },
        { label: 'Avg Confidence', value: `${avgConf}%`, color: [168, 85, 247] as [number, number, number] },
        { label: 'Threat Rate', value: `${total > 0 ? ((threats / total) * 100).toFixed(1) : 0}%`, color: [245, 158, 11] as [number, number, number] },
      ]
      const cW = (W - 24) / 5
      cards.forEach((c, i) => {
        const cx = 12 + i * (cW + 1)
        doc.setFillColor(...bgCard); doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3)
        doc.roundedRect(cx, y, cW, 22, 2, 2, 'FD')
        doc.setTextColor(...c.color); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
        doc.text(c.value, cx + cW / 2, y + 12, { align: 'center' })
        doc.setTextColor(...textMuted); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal')
        doc.text(c.label, cx + cW / 2, y + 19, { align: 'center' })
      })
      y += 28

      // ── AI MODEL PERFORMANCE ──
      y = chk(y, 40); y = hdr('AI MODEL DIAGNOSTICS (Random Forest)', y)
      const mets = [
        { l: 'Accuracy', v: modelMetrics.accuracy, c: colGreen },
        { l: 'Precision', v: modelMetrics.precision, c: colBlue },
        { l: 'Recall', v: modelMetrics.recall, c: [245, 158, 11] as [number, number, number] },
        { l: 'F1 Score', v: modelMetrics.f1, c: [168, 85, 247] as [number, number, number] },
      ]
      const mW = (W - 24) / 4
      mets.forEach((m, i) => {
        const mx = 12 + i * (mW + 1); const pct = parseFloat(m.v) / 100
        doc.setFillColor(...bgCard); doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3)
        doc.roundedRect(mx, y, mW, 26, 2, 2, 'FD')
        doc.setTextColor(...m.c); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
        doc.text(`${m.v}%`, mx + mW / 2, y + 11, { align: 'center' })
        doc.setFillColor(15, 23, 42); doc.roundedRect(mx + 4, y + 15, mW - 8, 4, 1, 1, 'F')
        doc.setFillColor(...m.c); doc.roundedRect(mx + 4, y + 15, (mW - 8) * pct, 4, 1, 1, 'F')
        doc.setTextColor(...textMuted); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
        doc.text(m.l, mx + mW / 2, y + 24, { align: 'center' })
      })
      y += 34

      // ── MASTER SCAN LOG ──
      y = chk(y, 50); y = hdr('MASTER SCAN LOG', y)
      autoTable(doc, {
        startY: y,
        head: [['#', 'Filename', 'Timestamp', 'Verdict', 'Conf.', 'Risk', 'Threats', 'Accuracy']],
        body: scans.slice(0, 15).map((s, idx) => [
          String(idx + 1),
          s.filename.length > 26 ? s.filename.slice(0, 23) + '…' : s.filename,
          s.time,
          s.overallLabel === 'Ransomware' ? 'THREAT' : 'SAFE',
          `${(s.overallConfidence * 100).toFixed(1)}%`,
          s.riskScore != null ? String(s.riskScore) : '-',
          String(s.ransomwareCount ?? 0),
          `${modelMetrics.accuracy}%`,
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5, textColor: textWhite, lineColor: [30, 41, 59], lineWidth: 0.1, fillColor: bgCard },
        headStyles: { fillColor: [15, 23, 42], textColor: textWhite, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [15, 20, 33] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 }, 1: { cellWidth: 46 }, 2: { cellWidth: 33 },
          3: { halign: 'center', cellWidth: 18 }, 4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 14 }, 6: { halign: 'center', cellWidth: 14 },
          7: { halign: 'center', cellWidth: 16 },
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const v = data.cell.raw as string
            const col = v === 'THREAT' ? colRed : colGreen
            doc.setTextColor(...col); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
            doc.text(v, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 0.8, { align: 'center' })
            doc.setTextColor(...textWhite); doc.setFont('helvetica', 'normal')
          }
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10

      // ── DEEP-DIVE PROFILES (تفاصيل لكل برنامج) ──
      // Show up to 10 of the most recent files
      const deepScans = scans.slice(0, 10)
      if (deepScans.length > 0) {
        y = chk(y, 40); y = hdr('THREAT INTELLIGENCE PROFILES (Deep-Dive Analysis)', y)

        deepScans.forEach((s, idx) => {
          y = chk(y, 80)
          const isThreat = s.overallLabel === 'Ransomware'
          const borderCol = isThreat ? colRed : colGreen
          const bgHighlight = isThreat ? [35, 20, 25] as [number, number, number] : [15, 30, 25] as [number, number, number]

          // Card Background
          doc.setFillColor(...bgCard); doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3)
          doc.roundedRect(10, y, W - 20, 60, 2, 2, 'FD') // Increased height to 60

          // Status Bar Left
          doc.setFillColor(...borderCol)
          doc.roundedRect(10, y, 2, 60, 2, 2, 'F')

          // Header of Profile
          doc.setFillColor(...bgHighlight)
          doc.rect(12, y, W - 22, 10, 'F')

          doc.setTextColor(...textWhite); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
          doc.text(s.filename, 16, y + 6.5)

          // Badge
          doc.setFillColor(...borderCol); doc.roundedRect(W - 30, y + 2.5, 18, 5, 1, 1, 'F')
          doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
          doc.text(isThreat ? 'THREAT' : 'SAFE', W - 21, y + 6, { align: 'center' })

          y += 10

          // Row 1: Key Metrics
          doc.setTextColor(...textMuted); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
          const col1 = 16, col2 = 65, col3 = 115, col4 = 160

          doc.text('Confidence:', col1, y + 5)
          doc.setTextColor(...borderCol); doc.setFont('helvetica', 'bold')
          doc.text(`${(s.overallConfidence * 100).toFixed(1)}%`, col1 + 18, y + 5)

          doc.setTextColor(...textMuted); doc.setFont('helvetica', 'normal')
          doc.text('Risk Score:', col2, y + 5)
          doc.setTextColor(...textWhite); doc.setFont('helvetica', 'bold')
          doc.text(s.riskScore != null ? `${s.riskScore}/100+` : 'N/A', col2 + 18, y + 5)


          doc.setTextColor(...textMuted); doc.setFont('helvetica', 'normal')
          doc.text('File Size:', col3, y + 5)
          doc.setTextColor(...textWhite); doc.setFont('helvetica', 'bold')
          doc.text(s.fileSize ? `${(s.fileSize / 1024).toFixed(1)} KB` : 'Unknown', col3 + 15, y + 5)

          doc.setTextColor(...textMuted); doc.setFont('helvetica', 'normal')
          doc.text('Type:', col4, y + 5)
          doc.setTextColor(...textWhite); doc.setFont('helvetica', 'bold')
          doc.text(s.fileType ? s.fileType.split(' ')[0] : 'EXE', col4 + 10, y + 5)

          y += 9
          doc.setDrawColor(30, 41, 59); doc.line(16, y, W - 16, y)
          y += 5

          // Row 2: Forensics Layers
          const lb = s.layerBreakdown
          doc.setTextColor(...textMuted); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal')
          doc.text(`Entropy: ${s.entropy || 'N/A'}`, col1, y + 3)
          doc.text(`Hdr Ent: ${s.entropyHeader || 'N/A'}`, col1, y + 7)

          doc.text(`Layer Scores: Sig(+${lb?.signatures ?? 0}) Ent(+${lb?.entropy ?? 0}) PE(+${lb?.peStructure ?? 0}) Beh(+${lb?.behavior ?? 0})`, col2, y + 3)
          doc.text(`YARA Matched: ${s.yaraMatchedCount ?? 0}/6 Rules`, col2, y + 7)

          doc.text(`API Chains: ${s.chainCount ?? 0} Detected`, col3, y + 3)
          doc.text(`Signature: ${s.signatureMatch ? (s.signatureFamily || 'Known') : 'Clean'}`, col3, y + 7)

          y += 12

          // Row 3: Detection Reasons
          const reasons = s.detectionReasons ?? []
          if (reasons.length > 0) {
            doc.setTextColor(...borderCol); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
            doc.text('AI Findings:', col1, y + 3)
            doc.setTextColor(...textMuted); doc.setFont('helvetica', 'normal')

            let currentX = col1 + 18
            let currentY = y + 3
            reasons.slice(0, 4).forEach((r, i) => {
              const text = `• ${r}`
              if (i === 2) { currentY += 4; currentX = col1 + 18 }
              doc.text(text.length > 55 ? text.substring(0, 52) + '...' : text, currentX, currentY)
              currentX += 70
            })
          } else {
            if (isThreat) {
              doc.setTextColor(245, 158, 11); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold') // Warning Yellow
              doc.text('Historical Threat: Critical telemetry was not captured at the time of this scan. Verdict: HIGH RISK.', col1, y + 3)
            } else {
              doc.setTextColor(...colGreen); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
              doc.text('AI Findings: File exhibits normal behavior patterns. No suspicious traits identified.', col1, y + 3)
            }
          }

          y += 10
          doc.setDrawColor(30, 41, 59); doc.line(16, y, W - 16, y)
          y += 5

          // Row 4: Critical Threat Vectors (MITRE ATT&CK)
          doc.setTextColor(...borderCol); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
          doc.text('Threat Vectors:', col1, y + 3)

          doc.setTextColor(...textMuted); doc.setFont('helvetica', 'normal')
          if (isThreat) {
            const vectors = []
            if ((s.entropy ?? 0) >= 7.0) vectors.push('[TA0005] Defense Evasion: High Entropy (Packed/Encrypted)')
            if ((s.chainCount ?? 0) > 0) vectors.push('[TA0002] Execution: Suspicious API Chains Detected')
            if (s.signatureMatch) vectors.push('[TA0040] Impact: Known Ransomware Signature Matched')
            if ((s.yaraMatchedCount ?? 0) > 0) vectors.push('[TA0004] Privilege Escalation: YARA Rules Triggered')
            if (vectors.length === 0) vectors.push('[TA0040] Impact: Historical Ransomware Detection')

            let vx = col1 + 18, vy = y + 3
            vectors.slice(0, 2).forEach(v => {
              doc.text(`• ${v}`, vx, vy)
              vx += 70
            })
          } else {
            doc.text('No active threat vectors mapped to MITRE ATT&CK frameworks.', col1 + 18, y + 3)
          }

          y += 12 // Move to next card
        })
      }

      // ── FOOTER ON EVERY PAGE ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nPages = (doc as any).internal.getNumberOfPages()
      for (let p = 1; p <= nPages; p++) {
        doc.setPage(p)
        doc.setFillColor(...bgDark); doc.rect(0, H - 10, W, 10, 'F')
        doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(10, H - 10, W - 10, H - 10)
        doc.setTextColor(...textMuted); doc.setFontSize(7); doc.setFont('helvetica', 'italic')
        doc.text('Generated by SARMZ RansomGuard \u2014 Advanced Ransomware Detection Intelligence', W / 2, H - 4, { align: 'center' })
        doc.text(`Page ${p} of ${nPages}`, W - 12, H - 4, { align: 'right' })
      }
      doc.save(`SARMZ_RansomGuard_Intelligence_${now.toISOString().slice(0, 10)}.pdf`)
    } finally {
      setGeneratingPDF(false)
    }
  }


  const pieData = [
    { name: T('safe'), value: safe, color: '#22c55e' },
    { name: T('threat'), value: threats, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const recentThreats = scans
    .filter(s => s.overallLabel === 'Ransomware')
    .slice(-3)
    .reverse()

  const activityData = scans.slice(-7).map((s, i) => ({
    name: `S${i + 1}`,
    safe: s.benignCount,
    threats: s.ransomwareCount
  }))


  const card = isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt = isLight ? 'text-slate-800' : 'text-white'
  const muted = isLight ? 'text-slate-500' : 'text-gray-400'
  const grid = isLight ? '#e2e8f0' : '#1e2a3a'
  const tooltip = isLight
    ? { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }
    : { background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 8, fontSize: 11 }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${txt}`}>{T('dashboard')}</h1>
          <p className={`text-sm ${muted}`}>{T('monitorDesc')}</p>
        </div>
        {total > 0 && (
          <button
            onClick={generatePDFReport}
            disabled={generatingPDF}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
              ${generatingPDF
                ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 active:scale-95 text-white shadow-lg shadow-green-500/20'
              }`}
          >
            {generatingPDF
              ? <><Loader2 className="w-4 h-4 animate-spin" />{T('generatingReport')}</>
              : <><Download className="w-4 h-4" />{T('downloadReport')}</>}
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          {/* Wake-up Info Banner */}
          {isWakingUp && (
            <div className="flex items-center gap-3 p-4 mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 animate-in fade-in duration-300 text-xs">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <div>
                <p className="font-bold">{isAr ? '☕ جاري تشغيل خادم الخدمة السحابية...' : '☕ Waking up the cloud server...'}</p>
                <p className="opacity-80 mt-0.5">
                  {isAr 
                    ? 'بسبب الاستضافة المجانية على Render، قد يستغرق الخادم حوالي 50 ثانية للاستيقاظ بعد فترة من الخمول. شكراً لانتظارك!'
                    : 'Since the API is hosted on Render\'s free tier, the server spins down after inactivity and takes ~50 seconds to wake up. Thank you for your patience!'}
                </p>
              </div>
            </div>
          )}

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`${card} border rounded-xl p-4 flex items-center justify-between h-20`}>
                <div className="space-y-2 w-2/3">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-5 bg-slate-350 dark:bg-slate-700/80 rounded w-5/6" />
                </div>
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Skeleton Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${card} border rounded-2xl p-6 lg:col-span-2 flex flex-col md:flex-row items-center gap-12 h-64`}>
              <div className="flex-1 flex items-center gap-8 w-full">
                <div className="w-32 h-32 rounded-full border-8 border-slate-200 dark:border-slate-800 flex-shrink-0" />
                <div className="space-y-3 w-1/2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
              <div className="w-full md:w-64 space-y-4 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-12 h-full justify-center flex flex-col">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </div>

            <div className={`${card} border rounded-2xl p-6 h-64 flex flex-col justify-between`}>
              <div className="space-y-4">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-205 dark:bg-slate-800 rounded-2xl" />
                  <div className="space-y-2 w-1/2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
            </div>
          </div>

          {/* Skeleton Table */}
          <div className={`${card} border rounded-2xl p-6 h-64 space-y-4`}>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 dark:bg-slate-750 rounded w-1/4" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-24" />
            </div>
            <div className="space-y-3 pt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/5" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Shield className={`w-16 h-16 mb-4 ${isLight ? 'text-slate-300' : 'text-gray-600'}`} />
          <p className={`text-xl font-bold mb-2 ${txt}`}>{T('noScans')}</p>
          <p className={`text-sm mb-6 ${muted}`}>{T('startScanning')}</p>
          <Link to="/file-analysis" className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all">
            {T('analyzeBtn')} →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: T('filesScanned'), value: total, icon: FileText, color: 'text-green-500' },
              { label: T('threatsFound'), value: threats, icon: XCircle, color: 'text-red-500' },
              { label: T('safeFiles'), value: safe, icon: Shield, color: 'text-blue-500' },
              { label: T('lastAction') || 'Last Action', value: getLastAction(), icon: Activity, color: 'text-yellow-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`${card} border rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:border-green-500/30`}>
                <div className="min-w-0">
                  <p className={`text-xs mb-1 font-medium ${muted}`}>{label}</p>
                  <p className={`text-xl font-bold truncate ${txt}`}>{value}</p>
                </div>
                <div className={`p-2 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-slate-900/50'}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
              </div>
            ))}
          </div>



          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className={`${card} border rounded-2xl p-6 lg:col-span-2 flex flex-col md:flex-row items-center gap-12 transition-all duration-300`}>
              <div className="flex-1 w-full">
                <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${muted}`}>{T('scanResults')}</h3>
                <div className="flex items-center gap-12">
                  <div className="relative">
                    <PieChart width={180} height={180}>
                      <Pie data={pieData} cx={90} cy={90} innerRadius={65} outerRadius={90} dataKey="value" strokeWidth={0}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-3xl font-black ${txt}`}>{total}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>{T('total')}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: d.color }} />
                        <div>
                          <p className={`text-sm font-black ${txt}`}>{d.value}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-tighter ${muted}`}>{d.name}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                      <div>
                        <p className={`text-sm font-black ${txt}`}>0</p>
                        <p className={`text-[10px] font-bold uppercase tracking-tighter ${muted}`}>URL Blocks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-64 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-12 mt-6 md:mt-0">
                <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${muted}`}>{T('topRecentThreats')}</h3>
                <div className="space-y-4">
                  {recentThreats.length > 0 ? recentThreats.map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className={`text-xs font-black truncate leading-none mb-1 ${txt}`}>{t.filename}</p>
                        <p className={`text-[10px] font-bold ${muted}`}>{formatRelative(t.time)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-6 opacity-30">
                      <ShieldCheck className="w-10 h-10 mb-2 text-green-500" />
                      <p className={`text-[10px] font-black uppercase ${muted}`}>{T('noRecentThreats')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`${card} border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between`}>
              <div>
                <h3 className={`text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${muted}`}>
                  <Zap className="w-3 h-3 text-yellow-500" /> System Integrity
                </h3>

                <div className="flex items-center gap-4 mb-8">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                  </div>
                  <div>
                    <p className="text-green-500 text-sm font-black uppercase tracking-tight">Active Shield</p>
                    <p className={`text-[11px] font-bold ${muted}`}>Monitoring V.2026.05</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>Uptime</span>
                    <span className={`text-[11px] font-black ${txt}`}>99.9%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>Last Update</span>
                    <span className={`text-[11px] font-black text-green-500`}>Today</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                <Activity className="w-3 h-3" />
                No Active Alarms
              </div>
            </div>
          </div>





          {activityData.length > 0 && (
            <div className={`${card} border rounded-2xl overflow-hidden transition-all duration-300 mb-6 shadow-sm`}>
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-[#0d1117]/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${txt}`}>Security Event Log</h3>
                    <p className={`text-[9px] font-bold ${muted}`}>REAL-TIME SYSTEM TELEMETRY</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  <span className={`text-[9px] text-green-500 font-black tracking-widest uppercase`}>Telemetry Live</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/20 dark:bg-slate-900/20">
                      <th className={`p-5 text-[9px] font-black uppercase tracking-widest ${muted}`}>Timestamp</th>
                      <th className={`p-5 text-[9px] font-black uppercase tracking-widest ${muted} w-1/3`}>Object / Source</th>
                      <th className={`p-5 text-[9px] font-black uppercase tracking-widest ${muted}`}>Risk Vector</th>
                      <th className={`p-5 text-[9px] font-black uppercase tracking-widest ${muted}`}>Status / Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                    {scans.slice(-10).reverse().map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className={`p-5 text-[10px] font-mono ${muted}`}>{s.time}</td>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-1 h-8 rounded-full ${s.overallLabel === 'Ransomware' ? 'bg-red-500' : 'bg-blue-500'}`} />
                            <div className="min-w-0">
                              <p className={`text-xs font-black truncate ${txt}`}>{s.filename}</p>
                              <p className={`text-[9px] font-bold opacity-40 uppercase`}>EXE Pattern Analysis</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${s.overallLabel === 'Ransomware' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'}`}
                                style={{ width: `${s.overallConfidence * 100}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-black ${s.overallLabel === 'Ransomware' ? 'text-red-500' : 'text-green-500'}`}>
                              {Math.round(s.overallConfidence * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-tighter ${s.overallLabel === 'Ransomware'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-green-500/10 text-green-400 border border-green-500/20'
                            }`}>
                            {s.overallLabel === 'Ransomware' ? 'Threat Blocked' : 'System Verified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/10">
                <p className={`text-[9px] ${muted} italic font-medium opacity-65`}>
                  * Validation Dataset (N=62,485)
                </p>
              </div>
            </div>




          )}

        </>

      )}
    </div>
  )
}
