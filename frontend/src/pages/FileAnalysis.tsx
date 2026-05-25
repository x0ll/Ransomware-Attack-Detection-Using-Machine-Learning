import { useState, useRef, useEffect } from 'react'
import { API_BASE_URL } from '../lib/api-config'
import { notifyUpdate } from '../lib/store'
import { getLang, t } from '../lib/language'
import {
  Upload, FileCode, CheckCircle, XCircle, AlertTriangle,
  Cpu, Shield, AlertCircle, ChevronDown, ChevronUp,
  Layers, Activity, Search, Link2, BarChart2,
  Box, Zap, Folder, MapPin, ArrowDownToLine, Lock, ShieldCheck,
  Package, LayoutGrid, FileText, Lightbulb, Info
} from 'lucide-react'
import { getTheme, Theme } from '../lib/theme'
import { PieChart, Pie, Cell } from 'recharts'

// ─────────────────────────────────────────────────────────────────────────────
// RiskMeter
// ─────────────────────────────────────────────────────────────────────────────
function RiskMeter({ score, lang, isLight }: { score: number; lang: string; isLight: boolean }) {
  const T     = (k: string) => (t as any)[lang][k] || k
  const capped = Math.min(score, 100)
  const color  = capped >= 50 ? '#ef4444' : capped >= 25 ? '#f59e0b' : '#22c55e'
  const label  = capped >= 50 ? T('highRisk') : capped >= 25 ? T('mediumRisk') : T('lowRisk')
  const track  = isLight ? '#e2e8f0' : '#1e2a3a'
  const card   = isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt    = isLight ? 'text-slate-800' : 'text-white'
  const sub    = isLight ? 'text-slate-500' : 'text-gray-500'
  return (
    <div className={`${card} border rounded-xl p-4`}>
      <h3 className={`${txt} text-sm font-semibold mb-3 flex items-center gap-2`}>
        <Shield className="w-4 h-4" style={{ color }} />{T('riskScore')}
      </h3>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] transition-all">
          <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={track} strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${Math.min(score, 100)} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${txt}`}>{score}</span>
            <span className={`text-[9px] ${sub}`}>/ 100+</span>
          </div>
        </div>

        <div>
          <p className="font-bold text-sm mb-1" style={{ color }}>{label}</p>
          <p className={`${sub} text-[10px]`}>
            {capped >= 50
              ? (lang === 'ar' ? 'مؤشرات فدية قوية' : 'Strong ransomware indicators found')
              : capped >= 25
              ? (lang === 'ar' ? 'أنماط مشبوهة' : 'Some suspicious patterns detected')
              : (lang === 'ar' ? 'لا تهديدات' : 'No significant threats detected')}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Entropy bar helper
// ─────────────────────────────────────────────────────────────────────────────
function EntropyBar({ value, isLight }: { value: number; isLight: boolean }) {
  const pct   = Math.min((value / 8) * 100, 100)
  const color = value >= 7.5 ? '#ef4444' : value >= 6.5 ? '#f59e0b' : '#22c55e'
  const bg    = isLight ? '#e2e8f0' : '#1e2a3a'
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full h-2" style={{ background: bg }}>
        <div className="h-2 rounded-full transition-all" style={{ width: pct + '%', background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>{value.toFixed(2)}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Analysis Details Panel (4 sub-tabs)
// ─────────────────────────────────────────────────────────────────────────────
type Tab = 'layers' | 'sections' | 'yara' | 'chains'

function AnalysisDetails({ result, lang, isLight, isRansomware }: {
  result: any; lang: string; isLight: boolean; isRansomware: boolean
}) {
  const [tab, setTab] = useState<Tab>('layers')
  const T   = (k: string) => (t as any)[lang][k] || k
  const isAr = lang === 'ar'

  const card  = isLight ? 'bg-white border-slate-200'  : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt   = isLight ? 'text-slate-800'             : 'text-white'
  const muted = isLight ? 'text-slate-500'             : 'text-gray-400'
  const sub   = isLight ? 'text-slate-600'             : 'text-gray-300'
  const sep   = isLight ? 'border-slate-100'           : 'border-[#1e2a3a]'
  const rowBg = isLight ? 'hover:bg-slate-50'          : 'hover:bg-[#131b27]'

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'layers',   label: T('layerBreakdown'),  icon: Layers   },
    { id: 'sections', label: T('sectionEntropy'),   icon: Activity },
    { id: 'yara',     label: T('yaraRules'),        icon: Search   },
    { id: 'chains',   label: T('apiChains'),        icon: Link2    },
  ]

  const accentBad = isRansomware ? 'text-red-400' : 'text-yellow-400'

  // ── Layer Breakdown ───────────────────────────────────────────────────────
  const lb = result.layerBreakdown || {}
  const layers = [
    {
      key: 'signatures', label: T('sigLayer'),
      score: lb.signatures || 0,
      icon: <Search className="w-4 h-4" />,
      detail: result.signatureMatch
        ? `${result.signatureFamily} (matched)`
        : (isAr ? 'لا توقيعات مكتشفة' : 'No signatures found'),
      hit: (lb.signatures || 0) > 0,
    },
    {
      key: 'entropy', label: T('entropyLayer'),
      score: lb.entropy || 0,
      icon: <BarChart2 className="w-4 h-4" />,
      detail: result.entropy > 0
        ? `${result.entropy} / 8.0 — ${result.entropy >= 7.5
            ? (isAr ? 'مضغوط/مشفر' : 'Packed/Encrypted')
            : result.entropy >= 6.5
            ? (isAr ? 'مرتفع' : 'Elevated')
            : (isAr ? 'طبيعي' : 'Normal')}`
        : 'N/A',
      hit: (lb.entropy || 0) > 0,
    },
    {
      key: 'peStructure', label: T('peLayer'),
      score: lb.peStructure || 0,
      icon: <Box className="w-4 h-4" />,
      detail: result.peInfo?.isPE
        ? `${result.peInfo.cryptoApiCount || 0} crypto APIs · ${result.peInfo.suspiciousSections?.length || 0} high-entropy sections`
        : (isAr ? 'ليس ملف PE' : 'Not a PE file'),
      hit: (lb.peStructure || 0) > 0,
    },
    {
      key: 'behavior', label: T('behaviorLayer'),
      score: lb.behavior || 0,
      icon: <Zap className="w-4 h-4" />,
      detail: (() => {
        const yaraHits  = result.yaraMatches?.rules?.filter((r: any) => r.matched).length || 0
        const chainHits = result.apiChains?.chainCount || 0
        if (yaraHits === 0 && chainHits === 0) return isAr ? 'لا سلوك مشبوه' : 'No suspicious behavior'
        return `${yaraHits} YARA ${isAr ? 'قاعدة' : 'rule'}${yaraHits !== 1 ? 's' : ''} · ${chainHits} ${isAr ? 'سلسلة' : 'chain'}${chainHits !== 1 ? 's' : ''}`
      })(),
      hit: (lb.behavior || 0) > 0,
    },
  ]

  // ── Section entropy ───────────────────────────────────────────────────────
  const sections: any[] = result.sectionEntropies || []

  // ── YARA rules ────────────────────────────────────────────────────────────
  const yaraRules: any[] = result.yaraMatches?.rules || []

  // ── API chains ────────────────────────────────────────────────────────────
  const chains: any[] = result.apiChains?.chains || []

  return (
    <div className={`${card} border rounded-xl overflow-hidden`}>
      {/* Tab bar */}
      <div className={`flex border-b ${sep} overflow-x-auto no-scrollbar`}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all border-b-2
              ${tab === id
                ? isLight
                  ? 'border-green-500 text-green-600 bg-green-50 font-bold'
                  : 'border-green-400 text-green-400 bg-green-500/10 shadow-[0_0_12px_rgba(34,197,94,0.15)] font-bold'
                : `border-transparent ${muted} ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#131b27]'}`}`}>
            <Icon className={`w-3.5 h-3.5 ${tab === id ? 'text-green-400 filter drop-shadow-[0_0_3px_#22c55e]' : ''}`} />
            <span className={tab === id && !isLight ? 'filter drop-shadow-[0_0_4px_rgba(74,222,128,0.55)] text-green-300' : ''}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* ── Tab: Layer Breakdown ── */}
        {tab === 'layers' && (
          <div className="space-y-2">
            <p className={`text-xs ${muted} mb-3`}>
              {isAr
                ? 'كل طبقة تُضيف نقاطاً لدرجة الخطر الكلية. مجموع ≥ 50 → فدية.'
                : 'Each layer contributes to the overall risk score. Total ≥ 50 → Ransomware.'}
            </p>
            {/* Header row */}
            <div className={`hidden md:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider ${muted} px-3 pb-1 border-b ${sep}`}>
              <div className="col-span-1" />
              <div className="col-span-4">{T('sigLayer').split(' ')[0]}</div>
              <div className="col-span-5">{T('layerStatus')}</div>
              <div className="col-span-2 text-center">{T('layerScore')}</div>
            </div>
            {layers.map((layer, index) => (
              <div key={layer.key}
                className={`flex flex-col md:grid md:grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg transition-all ${rowBg} ${
                  index % 2 === 0
                    ? isLight ? 'bg-slate-50/50' : 'bg-[#101724]/40'
                    : 'bg-transparent'
                }`}>
                <div className="hidden md:flex md:col-span-1 text-base items-center justify-center text-slate-400">{layer.icon}</div>
                <div className="flex items-center justify-between md:col-span-4 w-full">
                  <div className={`text-xs font-semibold ${txt} flex items-center gap-2`}>
                    <span className="md:hidden">{layer.icon}</span>
                    {layer.label}
                  </div>
                  <div className="md:hidden">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                      ${layer.hit
                        ? (layer.score >= 20 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')
                        : 'bg-green-500/20 text-green-400'}`}>
                      +{layer.score}
                    </span>
                  </div>
                </div>
                <div className={`md:col-span-5 text-[11px] ${layer.hit ? accentBad : 'text-green-400'}`}>
                  {layer.detail}
                </div>
                <div className="hidden md:flex md:col-span-2 justify-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${layer.hit
                      ? (layer.score >= 20 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')
                      : 'bg-green-500/20 text-green-400'}`}>
                    +{layer.score}
                  </span>
                </div>
              </div>
            ))}
            {/* Total */}
            <div className={`flex justify-between items-center px-3 pt-3 border-t ${sep} mt-2`}>
              <span className={`text-sm font-bold ${txt}`}>
                {isAr ? 'المجموع الكلي' : 'Total Risk Score'}
              </span>
              <span className={`text-lg font-bold ${
                (result.riskScore || 0) >= 50 ? 'text-red-400'
                : (result.riskScore || 0) >= 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                {result.riskScore || 0} / 100+
              </span>

            </div>
          </div>
        )}

        {/* ── Tab: Section Entropy ── */}
        {tab === 'sections' && (
          <div>
            {sections.length === 0 ? (
              <p className={`text-center py-6 ${muted} text-sm`}>
                {isAr ? 'لا توجد أقسام PE — الملف ليس PE أو لا يحتوي على أقسام.' : 'No PE sections — file is not PE or has no sections.'}
              </p>
            ) : (
              <div className="space-y-1">
                <p className={`text-xs ${muted} mb-3`}>
                  {isAr
                    ? 'إنتروبيا أعلى من 7.5 تعني أن القسم مشفر أو مضغوط — علامة تشفير قوية.'
                    : 'Entropy > 7.5 means the section is packed/encrypted — a strong encryption indicator.'}
                </p>
                {/* Header */}
                <div className={`hidden md:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider ${muted} px-3 pb-1 border-b ${sep}`}>
                  <div className="col-span-2">{T('sectionName')}</div>
                  <div className="col-span-2">{T('sectionSize')}</div>
                  <div className="col-span-5">{T('sectionEntropyVal')}</div>
                  <div className="col-span-3">{isAr ? 'التصنيف' : 'Label'}</div>
                </div>
                {sections.map((sec: any, idx: number) => {
                  const labelColor = sec.label === 'Packed / Encrypted'
                    ? 'bg-red-500/20 text-red-400'
                    : sec.label === 'Elevated'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                  const labelText = sec.label === 'Packed / Encrypted'
                    ? T('packedSection')
                    : sec.label === 'Elevated'
                    ? T('elevatedEntropy')
                    : T('normalEntropy')
                  return (
                    <div key={idx}
                      className={`flex flex-col md:grid md:grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg ${rowBg} transition-all ${
                        idx % 2 === 0
                          ? isLight ? 'bg-slate-50/50' : 'bg-[#101724]/40'
                          : 'bg-transparent'
                      }`}>
                      <div className="flex items-center justify-between w-full md:col-span-2">
                        <div className={`font-mono text-xs font-bold ${txt}`}>{sec.name}</div>
                        <div className="md:hidden">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${labelColor}`}>
                            {labelText}
                          </span>
                        </div>
                      </div>
                      <div className={`md:col-span-2 text-[11px] ${muted}`}>
                        {sec.rawSize > 1024
                          ? `${(sec.rawSize / 1024).toFixed(1)} KB`
                          : `${sec.rawSize} B`}
                      </div>
                      <div className="col-span-12 md:col-span-5 w-full">
                        <EntropyBar value={sec.entropy} isLight={isLight} />
                      </div>
                      <div className="hidden md:block md:col-span-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${labelColor}`}>
                          {labelText}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: YARA Rules ── */}
        {tab === 'yara' && (
          <div>
            {yaraRules.length === 0 ? (
              <p className={`text-center py-6 ${muted} text-sm`}>
                {isAr ? 'لا توجد بيانات YARA.' : 'No YARA data available.'}
              </p>
            ) : (
              <div className="space-y-1">
                <p className={`text-xs ${muted} mb-3`}>
                  {isAr
                    ? 'قواعد YARA تبحث عن بصمات وأنماط معروفة لبرامج الفدية في الملف.'
                    : 'YARA rules scan for known ransomware patterns and fingerprints.'}
                </p>
                {/* Summary */}
                <div className={`flex gap-3 mb-3 p-3 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-[#131b27]'}`}>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${result.yaraMatches?.matched ? 'text-red-400' : 'text-green-400'}`}>
                      {yaraRules.filter((r: any) => r.matched).length}
                    </p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'متطابقة' : 'Matched'}</p>
                  </div>
                  <div className={`w-px ${sep} bg-current opacity-20`} />
                  <div className="text-center">
                    <p className={`text-lg font-bold ${muted}`}>{yaraRules.length}</p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'إجمالي القواعد' : 'Total Rules'}</p>
                  </div>
                  <div className={`w-px ${sep} bg-current opacity-20`} />
                  <div className="text-center">
                    <p className={`text-lg font-bold text-orange-400`}>{result.yaraMatches?.totalScore || 0}</p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'نقاط الخطر' : 'Risk Score'}</p>
                  </div>
                </div>
                {/* Header */}
                <div className={`hidden md:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider ${muted} px-3 pb-1 border-b ${sep}`}>
                  <div className="col-span-3">{T('ruleName')}</div>
                  <div className="col-span-6">{T('ruleDesc')}</div>
                  <div className="col-span-2 text-center">{T('layerScore')}</div>
                  <div className="col-span-1 text-center">{isAr ? 'حالة' : 'Status'}</div>
                </div>
                {yaraRules.map((rule: any, idx: number) => (
                  <div key={rule.id}
                    className={`flex flex-col md:grid md:grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-lg transition-all ${rowBg}
                      ${rule.matched 
                        ? (isLight ? 'bg-red-50' : 'bg-red-500/8') 
                        : (idx % 2 === 0 ? (isLight ? 'bg-slate-50/50' : 'bg-[#101724]/40') : 'bg-transparent')
                      }`}>
                    <div className="flex items-center justify-between w-full md:col-span-3">
                      <div className={`text-xs font-semibold ${rule.matched ? 'text-red-400' : txt}`}>
                        {isAr ? rule.name_ar : rule.name}
                      </div>
                      <div className="md:hidden">
                        {rule.matched
                          ? <AlertTriangle className="w-5 h-5 text-red-500" />
                          : <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                    <div className={`md:col-span-6 text-[11px] leading-relaxed ${muted}`}>
                      {isAr ? rule.description_ar : rule.description}
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2 md:justify-center">
                      <span className="md:hidden text-[10px]">{T('layerScore')}:</span>
                      {rule.matched
                        ? <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">+{rule.score}</span>
                        : <span className={`text-xs ${muted}`}>—</span>}
                    </div>
                    <div className="hidden md:flex md:col-span-1 justify-center">
                      {rule.matched
                        ? <AlertTriangle className="w-5 h-5 text-red-500" />
                        : <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: API Chain Detection ── */}
        {tab === 'chains' && (
          <div>
            {chains.length === 0 ? (
              <p className={`text-center py-6 ${muted} text-sm`}>
                {isAr ? 'لا توجد بيانات سلاسل API.' : 'No API chain data available.'}
              </p>
            ) : (
              <div className="space-y-1">
                <p className={`text-xs ${muted} mb-3`}>
                  {isAr
                    ? 'سلاسل API تكشف تتابع استدعاءات خطيرة (مثل: حجز ذاكرة + كتابة + تشغيل).'
                    : 'API chains detect dangerous call sequences (e.g., allocate + write + execute).'}
                </p>
                {/* Summary */}
                <div className={`flex gap-3 mb-3 p-3 rounded-lg ${isLight ? 'bg-slate-50' : 'bg-[#131b27]'}`}>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${(result.apiChains?.chainCount || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {result.apiChains?.chainCount || 0}
                    </p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'سلاسل مكتشفة' : 'Detected'}</p>
                  </div>
                  <div className={`w-px ${sep} bg-current opacity-20`} />
                  <div className="text-center">
                    <p className={`text-lg font-bold ${muted}`}>{chains.length}</p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'إجمالي' : 'Total'}</p>
                  </div>
                  <div className={`w-px ${sep} bg-current opacity-20`} />
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-400">{result.apiChains?.totalScore || 0}</p>
                    <p className={`text-[10px] ${muted}`}>{isAr ? 'نقاط الخطر' : 'Risk Score'}</p>
                  </div>
                </div>
                {chains.map((chain: any) => (
                  <div key={chain.id}
                    className={`rounded-lg p-3 transition-all border
                      ${chain.detected
                        ? `${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/8 border-red-500/30'}`
                        : `${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1e2a3a] hover:bg-[#131b27]'}`}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{chain.detected ? '🔗' : '🔗'}</span>
                          <p className={`text-xs font-bold ${chain.detected ? 'text-red-400' : txt}`}>
                            {isAr ? chain.name_ar : chain.name}
                          </p>
                          {chain.detected && (
                            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                              +{chain.score}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] ${muted} mb-2`}>{isAr ? chain.description_ar : chain.description}</p>
                        {chain.detected && chain.foundApis?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className={`text-[10px] ${muted}`}>{T('foundApis')}:</span>
                            {chain.foundApis.map((api: string) => (
                              <span key={api}
                                className="text-[10px] font-mono bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded">
                                {api}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-1">
                        {chain.detected
                          ? <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-500/20 text-red-400">
                              {T('chainDetected')}
                            </span>
                          : <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-green-500/15 text-green-400`}>
                              {T('chainNotDetected')}
                            </span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main FileAnalysis page
// ─────────────────────────────────────────────────────────────────────────────
export default function FileAnalysis() {
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<any>(null)
  const [error, setError]         = useState<string | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [progress, setProgress]   = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [lang, setLang]           = useState(getLang())
  const [theme, setTheme]         = useState<Theme>(getTheme())
  const inputRef = useRef<HTMLInputElement>(null)
  const T = (k: string) => t[lang][k] || k

  const [toast, setToast] = useState<{show:boolean, msg:string, type:'success'|'error'}>({show:false, msg:'', type:'success'})
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem("ransomguard_settings")
        if (s) setSettings(JSON.parse(s))
      } catch {}
    }
    load()
    window.addEventListener('lang-changed', load)
    return () => window.removeEventListener('lang-changed', load)
  }, [])

  useEffect(() => {
    const onLang  = () => setLang(getLang())
    const onTheme = () => setTheme(getTheme())
    window.addEventListener('lang-changed',  onLang)
    window.addEventListener('theme-changed', onTheme)
    return () => {
      window.removeEventListener('lang-changed',  onLang)
      window.removeEventListener('theme-changed', onTheme)
    }
  }, [])

  const handleFile = (f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (ext !== '.exe') {
      setError(lang === 'ar' ? 'ملفات .exe فقط!' : 'Only .exe files are accepted!')
      return
    }
    setFile(f); setResult(null); setError(null); setProgress(0); setShowDetails(false)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true); setError(null); setProgress(0)
    const iv = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 12 : p), 300)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const currentUser = localStorage.getItem('rg_current_user')
      if (currentUser) fd.append('username', currentUser)
      const res  = await fetch(`${API_BASE_URL}/api/analyze`, { method: 'POST', body: fd })
      const data = await res.json()
      clearInterval(iv); setProgress(100)
      if (!res.ok) throw new Error(data.error)
      notifyUpdate()
      setTimeout(() => setResult(data), 300)

      if (settings?.notifications !== false) {
        setToast({
          show: true,
          msg: isAr ? (data.overallLabel === 'Ransomware' ? '⚠️ تم اكتشاف تهديد في الملف!' : '✅ الملف سليم تماماً')
                    : (data.overallLabel === 'Ransomware' ? '⚠️ Threat detected in file!' : '✅ File is clean'),
          type: data.overallLabel === 'Ransomware' ? 'error' : 'success'
        })
      }
    } catch (e: any) {
      clearInterval(iv)
      setError(e.message)
      if (settings?.notifications !== false) {
        setToast({
          show: true,
          msg: isAr ? `خطأ: ${e.message}` : `Error: ${e.message}`,
          type: 'error'
        })
      }
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }

  const isRansomware = result?.overallLabel === 'Ransomware'
  const isAr    = lang === 'ar'
  const isLight = theme === 'light'

  const card  = isLight ? 'bg-white border-slate-200'  : 'bg-[#0d1117] border-[#1e2a3a]'
  const txt   = isLight ? 'text-slate-800'             : 'text-white'
  const muted = isLight ? 'text-slate-500'             : 'text-gray-400'
  const sub   = isLight ? 'text-slate-600'             : 'text-gray-300'
  const zone  = isLight
    ? 'border-slate-300 bg-slate-50 hover:border-red-400/60'
    : 'border-[#1e2a3a] bg-[#0d1117] hover:border-red-500/50'

  const pieData = result ? [
    { name: T('safeFiles'),          value: result.benignCount || 0,     color: '#22c55e' },
    { name: T('ransomwareDetected'), value: result.ransomwareCount || 0, color: '#ef4444' },
  ] : []

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      {toast.show && <Toast msg={toast.msg} type={toast.type} isAr={isAr} onClose={() => setToast(s => ({ ...s, show: false }))} />}
      {/* Page header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${txt}`}>{T('fileAnalysisTitle')}</h1>
        <p className={`text-sm ${muted}`}>{T('fileAnalysisDesc')}</p>
        <div className={`mt-2 flex items-center gap-2 w-fit px-3 py-1.5 rounded-lg ${isLight ? 'bg-slate-100' : 'bg-[#1e2a3a]'}`}>
          <FileCode className="w-3.5 h-3.5 text-red-400" />
          <span className={`text-xs ${sub}`}>{T('exeOnly')}</span>
        </div>
      </div>

      {/* Drop zone */}
      {!result && (
        <div className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all mb-6
          ${dragging ? 'border-red-400 bg-red-400/5' : zone}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}>
          <input ref={inputRef} type="file" accept=".exe" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {file
            ? <FileCode className="w-14 h-14 text-red-400 mb-4" />
            : <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-red-400" />
              </div>}
          {file ? (
            <div className="text-center">
              <p className={`text-xl font-semibold ${txt}`}>{file.name}</p>
              <p className={`text-sm mt-1 ${muted}`}>{(file.size / 1024).toFixed(1)} KB</p>
              <p className="text-green-400 text-xs mt-2 font-medium">✅ {isAr ? 'جاهز للتحليل' : 'Ready to analyze'}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className={`text-xl font-semibold mb-1 ${txt}`}>{T('dropExe')}</p>
              <p className={`text-sm mb-5 ${muted}`}>{T('exeOnly')}</p>
              <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-6 py-2.5 rounded-lg text-sm font-medium"
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>{T('browseFile')}</button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (settings?.notifications !== false) && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-red-400 text-sm animate-in fade-in zoom-in duration-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Analyze button */}
      {file && !result && !loading && (
        <div className="flex justify-center mb-6">
          <button onClick={handleAnalyze}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-12 py-3 rounded-xl flex items-center gap-2">
            <Cpu className="w-4 h-4" /> {T('analyzeBtn')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={`${card} border rounded-xl p-6 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm flex items-center gap-2 ${txt}`}>
              <Cpu className="w-4 h-4 text-green-400 animate-pulse" />{T('scanning')}
            </span>
            <span className="text-green-400 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className={`w-full rounded-full h-2.5 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
            <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: progress + '%' }} />
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              isAr ? 'فحص التوقيعات' : 'Signature Scan',
              isAr ? 'ترويسة PE'      : 'PE Header',
              isAr ? 'إنتروبيا الأقسام' : 'Section Entropy',
              isAr ? 'سلاسل API'     : 'API Chains',
            ].map((s, i) => (
              <div key={s} className={`text-[10px] text-center py-1.5 rounded-lg transition-all
                ${progress > (i + 1) * 20
                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                  : isLight ? 'bg-slate-100 text-slate-400' : 'bg-[#1e2a3a] text-gray-600'}`}>
                {progress > (i + 1) * 20 ? '✓' : '○'} {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict banner */}
          <div className={`border-2 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4
            ${isRansomware ? 'border-red-500/50 bg-red-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0
              ${isRansomware ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {isRansomware
                ? <XCircle className="w-9 h-9 text-red-400" />
                : <CheckCircle className="w-9 h-9 text-green-400" />}
            </div>
            <div className="flex-1">
              <p className={`text-2xl font-bold ${isRansomware ? 'text-red-400' : 'text-green-400'}`}>
                {isRansomware ? T('ransomwareDetectedMsg') : T('safeMsg')}
              </p>
              {!isRansomware && (isAr ? result.verdictReasonAr : result.verdictReasonEn) && (
                <p className="text-xs font-medium mt-1.5 text-green-300 max-w-3xl bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                  {isAr ? result.verdictReasonAr : result.verdictReasonEn}
                </p>
              )}
              <p className={`text-sm mt-2.5 ${sub}`}>
                {result.filename}
                <span className={`ml-2 ${muted}`}>· {(result.fileSize / 1024).toFixed(1)} KB</span>
              </p>
              {result.signatureMatch && (
                <p className="text-red-300 text-xs mt-1 font-bold flex items-center gap-1.5 ">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {result.signatureFamily}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-40 rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
                  <div className={`h-2 rounded-full ${isRansomware ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: (result.overallConfidence * 100) + '%' }} />
                </div>
                <span className={`text-xs font-bold ${txt}`}>
                  {(result.overallConfidence * 100).toFixed(1)}% {T('confidence')}
                </span>
              </div>
            </div>
            <button onClick={() => { setResult(null); setFile(null); setProgress(0); setShowDetails(false) }}
              className={`text-xs border px-4 py-2 rounded-lg flex-shrink-0 transition-all
                ${isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-[#1e2a3a] text-gray-400 hover:text-white'}`}>
              {T('scanAgain')}
            </button>
          </div>

          {/* Risk gauge + detection reasons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RiskMeter score={result.riskScore || 0} lang={lang} isLight={isLight} />
            <div className={`${card} border rounded-xl p-4`}>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${txt}`}>
                <AlertCircle className="w-4 h-4 text-yellow-400" />{T('detectionReasons')}
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(result.detectionReasons || ['No data']).map((r: string, i: number) => {
                  const rt = r.toLowerCase();
                  let reasonIcon = isRansomware ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
                  
                  if (rt.includes('entropy') || rt.includes('إنتروبيا') || rt.includes('pack') || rt.includes('compress')) {
                    reasonIcon = <BarChart2 className="w-3.5 h-3.5 text-amber-400" />;
                  } else if (rt.includes('api') || rt.includes('chain') || rt.includes('سلاسل') || rt.includes('call')) {
                    reasonIcon = <Link2 className="w-3.5 h-3.5 text-fuchsia-400" />;
                  } else if (rt.includes('yara') || rt.includes('rule') || rt.includes('قاعدة') || rt.includes('match') || rt.includes('تطابق')) {
                    reasonIcon = <Shield className="w-3.5 h-3.5 text-red-400" />;
                  } else if (rt.includes('encrypt') || rt.includes('lock') || rt.includes('تشفير') || rt.includes('قفل')) {
                    reasonIcon = <Lock className="w-3.5 h-3.5 text-cyan-400" />;
                  } else if (rt.includes('signature') || rt.includes('توقيع')) {
                    reasonIcon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
                  }

                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg
                      ${isRansomware ? 'bg-red-500/10 text-red-300' : 'bg-green-500/10 text-green-300'}`}>
                      <span className="mt-0.5 flex-shrink-0">{reasonIcon}</span>
                      <span className="mt-[2px]">{r}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Classification + file properties */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${card} border rounded-xl p-4`}>
              <h3 className={`text-sm font-semibold mb-3 ${txt}`}>{T('classification')}</h3>
              <div className="flex items-center justify-center gap-6">
                <div className="filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] transition-all">
                  <PieChart width={120} height={120}>
                    <Pie data={pieData} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className={`text-xs ${sub}`}>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={`${card} border rounded-xl p-4`}>
              <h3 className={`text-sm font-semibold mb-3 ${txt}`}>{T('exeProperties')}</h3>
              <div className="space-y-2">
                {[
                  { l: T('fileType'),  v: 'Windows Executable (.exe)' },
                  { l: T('entropy'),   v: result.entropy > 0 ? `${result.entropy.toFixed(3)} / 8.0` : 'N/A' },
                  { l: isAr ? 'إنتروبيا الترويسة' : 'Header Entropy',
                    v: result.entropyHeader !== "N/A" ? `${result.entropyHeader.toFixed(3)}` : 'N/A' },
                  { l: isAr ? 'إنتروبيا الوسط' : 'Middle Entropy',
                    v: result.entropyMiddle ? `${result.entropyMiddle.toFixed(3)}` : 'N/A' },
                  { l: isAr ? 'إنتروبيا الخاتمة' : 'Tail Entropy',
                    v: result.entropyTail ? `${result.entropyTail.toFixed(3)}` : 'N/A' },
                  { l: T('signature'), v: result.signatureMatch ? result.signatureFamily : (isAr ? 'سليم' : 'Clean'), isSig: true },
                  { l: T('savedTo'),   v: 'SQLite Database' },
                ].map(({ l, v, isSig }) => (
                  <div key={l} className={`flex justify-between items-center text-[11px] border-b pb-1.5
                    ${isLight ? 'border-slate-200' : 'border-[#1e2a3a]'}`}>
                    <span className={muted}>{l}</span>
                    <span className={`font-medium flex items-center gap-1.5 ${
                      isSig && result.signatureMatch ? 'text-red-400'
                      : isSig && !result.signatureMatch ? 'text-green-500'
                      : sub}`}>
                      {isSig && !result.signatureMatch ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.3)] text-[9px] font-black tracking-wide uppercase select-none animate-pulse">
                          [ 🛡️ SARMZ VERIFIED ]
                        </span>
                      ) : (
                        <>
                          {isSig && result.signatureMatch && <AlertTriangle className="w-3 h-3"/>}
                          {v}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TABLE 1 — نتائج الموديل / Model Decision Breakdown
          ═══════════════════════════════════════════════════════════════ */}
          <div className={`${card} border rounded-xl overflow-hidden`}>
            {/* Header */}
            <div className={`px-5 py-3 flex items-center gap-2 border-b ${isLight ? 'border-slate-100 bg-slate-50' : 'border-[#1e2a3a] bg-[#0d1624]'}`}>
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className={`font-bold text-sm ${txt}`}>
                {isAr ? '📊 نتائج الموديل — لماذا اتخذ هذا القرار؟' : '📊 Model Results — Why was this decision made?'}
              </h3>
            </div>

            {/* Confidence row */}
            <div className={`px-5 py-3 border-b ${isLight ? 'border-slate-100' : 'border-[#1e2a3a]'} flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${muted}`}>
                {isAr ? 'نسبة الثقة الكلية' : 'Overall Confidence'}
              </span>
              <div className="flex items-center gap-3">
                <div className={`w-48 rounded-full h-3 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
                  <div className={`h-3 rounded-full transition-all ${isRansomware ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: (result.overallConfidence * 100) + '%' }} />
                </div>
                <span className={`text-lg font-bold ${isRansomware ? 'text-red-400' : 'text-green-400'}`}>
                  {(result.overallConfidence * 100).toFixed(1)}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isRansomware ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {isRansomware ? (isAr ? 'مصاب' : 'Ransomware') : (isAr ? 'سليم' : 'Benign')}
                </span>
              </div>
            </div>

            {/* 4 Layers table */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x ${isLight ? 'divide-slate-100' : 'divide-[#1e2a3a]'}`}>
              {[
                {
                  icon: <Search className="w-4 h-4 text-blue-400" />, label: isAr ? 'طبقة التوقيعات' : 'Signature Layer',
                  score: result.layerBreakdown?.signatures || 0,
                  maxScore: 60,
                  detail: result.signatureMatch
                    ? result.signatureFamily
                    : (isAr ? 'لا توقيعات' : 'No signatures'),
                  hit: (result.layerBreakdown?.signatures || 0) > 0,
                },
                {
                  icon: <BarChart2 className="w-4 h-4 text-purple-400" />, label: isAr ? 'طبقة الإنتروبيا' : 'Entropy Layer',
                  score: result.layerBreakdown?.entropy || 0,
                  maxScore: 25,
                  detail: result.entropy > 0
                    ? `${result.entropy} / 8.0`
                    : 'N/A',
                  hit: (result.layerBreakdown?.entropy || 0) > 0,
                },
                {
                  icon: <Box className="w-4 h-4 text-orange-400" />, label: isAr ? 'طبقة هيكل PE' : 'PE Structure Layer',
                  score: result.layerBreakdown?.peStructure || 0,
                  maxScore: 30,
                  detail: result.peInfo?.isPE
                    ? `${result.peInfo.cryptoApiCount || 0} ${isAr ? 'API تشفير' : 'Crypto APIs'}`
                    : (isAr ? 'ليس PE' : 'Not PE'),
                  hit: (result.layerBreakdown?.peStructure || 0) > 0,
                },
                {
                  icon: <Zap className="w-4 h-4 text-yellow-400" />, label: isAr ? 'طبقة السلوك / YARA' : 'Behavior / YARA Layer',
                  score: result.layerBreakdown?.behavior || 0,
                  maxScore: 70,
                  detail: (() => {
                    const y = result.yaraMatches?.rules?.filter((r: any) => r.matched).length || 0
                    const c = result.apiChains?.chainCount || 0
                    if (y === 0 && c === 0) return isAr ? 'لا سلوك مشبوه' : 'No behavior'
                    return `${y} YARA · ${c} ${isAr ? 'سلسلة' : 'chain'}${c !== 1 ? 's' : ''}`
                  })(),
                  hit: (result.layerBreakdown?.behavior || 0) > 0,
                },
              ].map((layer) => {
                const pct = Math.min((layer.score / layer.maxScore) * 100, 100)
                const barColor = layer.hit
                  ? (layer.score >= 30 ? '#ef4444' : '#f59e0b')
                  : '#22c55e'
                return (
                  <div key={layer.label} className={`p-4 flex flex-col gap-2 ${isLight ? 'bg-slate-50/60 hover:bg-slate-50' : 'bg-[#121824] hover:bg-[#182030]'} transition-all`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="mt-0.5">{layer.icon}</span>
                      <span className={`text-[11px] font-bold ${txt} mt-0.5`}>{layer.label}</span>
                    </div>
                    {/* Mini bar */}
                    <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
                      <div className="h-2 rounded-full transition-all" style={{ width: pct + '%', background: barColor }} />
                    </div>
                    {/* Score */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${layer.hit ? '' : 'text-green-400'}`}
                        style={{ color: layer.hit ? barColor : undefined }}>
                        {layer.detail}
                      </span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: barColor + '22', color: barColor }}>
                        +{layer.score}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total risk score row */}
            <div className={`px-5 py-3 border-t ${isLight ? 'border-slate-100 bg-slate-50' : 'border-[#1e2a3a] bg-[#0d1624]'} flex items-center justify-between`}>
              <span className={`text-xs ${muted} flex flex-col gap-1 sm:flex-row sm:items-center`}>
                <span className="flex items-center gap-1.5 font-semibold"><FileText className="w-3.5 h-3.5 text-blue-500" /> {isAr ? 'دليل الدرجات:' : 'Score Guide:'}</span>
                <span>{isAr ? '≥ 50 ← مصاب | 25–49 ← مشبوه | < 25 ← سليم' : '≥ 50 ← Ransomware | 25–49 ← Suspicious | < 25 ← Benign'}</span>
              </span>
              <span className={`text-base font-bold ${
                (result.riskScore || 0) >= 50 ? 'text-red-400'
                : (result.riskScore || 0) >= 25 ? 'text-yellow-400'
                : 'text-green-400'}`}>
                {isAr ? 'المجموع:' : 'Total:'} {result.riskScore || 0} / 100
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TABLE 2 — نتائج الفيتشرز / Feature Extraction Results
          ═══════════════════════════════════════════════════════════════ */}
          <div className={`${card} border rounded-xl overflow-hidden`}>
            {/* Header */}
            <div className={`px-5 py-3 flex items-center gap-2 border-b ${isLight ? 'border-slate-100 bg-slate-50' : 'border-[#1e2a3a] bg-[#0d1624]'}`}>
              <Activity className="w-4 h-4 text-purple-400" />
              <h3 className={`font-bold text-sm ${txt}`}>
                {isAr ? '🔬 نتائج الفيتشرز — ماذا استخرجنا من الملف؟' : '🔬 Feature Results — What did we extract from the file?'}
              </h3>
            </div>

            <div className="grid grid-cols-2 divide-x divide-y"
              style={{ borderColor: isLight ? '#f1f5f9' : '#1e2a3a' }}>

              {/*              </div> italic select-none">
                          {isAr ? 'غير متوفر' : 'Not Applicable'}
                        </span>
                      )}
                    </span>
                  </div>
                  {result.entropy > 0 && (
                    <div className={`w-full rounded-full h-2 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
                      <div className="h-2 rounded-full transition-all" style={{
                        width: ((result.entropy / 8) * 100) + '%',
                        background: result.entropy >= 7.5 ? '#ef4444' : result.entropy >= 6.5 ? '#f59e0b' : '#22c55e'
                      }} />
                    </div>
                  )}
                  <p className={`text-[10px] mt-1.5 ${muted} flex items-center gap-1`}>
                    {result.entropy > 0 ? (
                      result.entropy >= 7.5
                        ? <><AlertTriangle className="w-3 h-3 text-red-500"/> {isAr ? 'محتوى مضغوط أو مشفر بشكل كبير' : 'Heavily packed or encrypted content'}</>
                        : result.entropy >= 6.5
                        ? <><AlertTriangle className="w-3 h-3 text-yellow-500"/> {isAr ? 'إنتروبيا مرتفعة — مشبوه' : 'Elevated — suspicious'}</>
                        : <><CheckCircle className="w-3 h-3 text-green-500"/> {isAr ? 'إنتروبيا طبيعية' : 'Normal entropy'}</>
                    ) : (
                      <span className="text-[9px] text-gray-500 italic select-none">
                        {isAr ? '* تم تخطي حساب الإنتروبيا لصغر حجم الملف' : '* Entropy calculation bypassed due to small file size'}
                      </span>
                    )}
                  </p>
                </div>
                {/* Header Entropy */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><MapPin className="w-3.5 h-3.5 text-orange-400" /> {isAr ? 'إنتروبيا الترويسة' : 'Header Entropy'}</span>
                  <span className={`text-xs font-mono font-bold ${txt}`}>
                    {result.entropyHeader > 0 ? result.entropyHeader.toFixed(3) : (
                      <span className="text-[10px] text-gray-500 font-normal italic select-none">
                        {isAr ? 'غير متوفر' : 'Not Applicable'}
                      </span>
                    )}
                  </span>
                </div>
                {/* Tail Entropy */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><ArrowDownToLine className="w-3.5 h-3.5 text-teal-400" /> {isAr ? 'إنتروبيا النهاية' : 'Tail Entropy'}</span>
                  <span className={`text-xs font-mono font-bold ${txt}`}>
                    {result.entropyTail > 0 ? result.entropyTail.toFixed(3) : (
                      <span className="text-[10px] text-gray-500 font-normal italic select-none">
                        {isAr ? 'غير متوفر' : 'Not Applicable'}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Feature rows — right column */}
              <div className="p-4 space-y-3">
                {/* Crypto APIs */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><Lock className="w-3.5 h-3.5 text-rose-400" /> {isAr ? 'APIs التشفير' : 'Crypto APIs'}</span>
                  <span className={`text-sm font-bold ${
                    (result.peInfo?.cryptoApiCount || 0) >= 3 ? 'text-red-400'
                    : (result.peInfo?.cryptoApiCount || 0) >= 1 ? 'text-yellow-400'
                    : 'text-green-400'}`}>
                    {result.peInfo?.cryptoApiCount || 0}
                    <span className={`text-xs ml-1 ${muted}`}>{isAr ? 'استدعاء' : 'calls'}</span>
                  </span>
                </div>
                {/* YARA Matches */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><Search className="w-3.5 h-3.5 text-indigo-400" /> {isAr ? 'قواعد YARA المتطابقة' : 'YARA Rules Matched'}</span>
                  <span className={`text-sm font-bold border rounded-full px-2 py-0.5 ${
                    (result.yaraMatches?.rules?.filter((r: any) => r.matched).length || 0) > 0
                      ? `border-red-500/30 bg-red-400/10 text-red-500`
                      : `border-transparent text-green-400`}`}>
                    {result.yaraMatches?.rules?.filter((r: any) => r.matched).length || 0}
                    <span className={`text-xs ml-1 ${
                      (result.yaraMatches?.rules?.filter((r: any) => r.matched).length || 0) > 0 ? '' : muted
                    }`}>/ {result.yaraMatches?.rules?.length || 6}</span>
                  </span>
                </div>
                {/* API Chains */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><Link2 className="w-3.5 h-3.5 text-fuchsia-400" /> {isAr ? 'سلاسل API المكتشفة' : 'API Chains Detected'}</span>
                  <span className={`text-sm font-bold border rounded-full px-2 py-0.5 ${
                    (result.apiChains?.chainCount || 0) > 0 
                      ? 'border-red-500/30 bg-red-400/10 text-red-500' 
                      : 'border-transparent text-green-400'}`}>
                    {result.apiChains?.chainCount || 0}
                    <span className={`text-xs ml-1 ${
                      (result.apiChains?.chainCount || 0) > 0 ? '' : muted
                    }`}>/ 5</span>
                  </span>
                </div>
                {/* Signature */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${muted} flex items-center gap-1.5`}><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {isAr ? 'التوقيع' : 'Signature'}</span>
                  <span className={`text-xs font-bold flex items-center gap-1 ${result.signatureMatch ? 'text-red-400' : 'text-green-500'}`}>
                    {result.signatureMatch && <AlertTriangle className="w-3 h-3" />}
                    {!result.signatureMatch && <CheckCircle className="w-3 h-3" />}
                    {result.signatureMatch ? result.signatureFamily : (isAr ? 'سليم' : 'Clean')}
                  </span>
                </div>
                {/* PE Sections */}
                {result.peInfo?.isPE && (
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${muted} flex items-center gap-1.5`}><Package className="w-3.5 h-3.5 text-amber-400" /> {isAr ? 'أقسام عالية الإنتروبيا' : 'High-Entropy Sections'}</span>
                    <span className={`text-sm font-bold ${
                      (result.peInfo?.suspiciousSections?.length || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {result.peInfo?.suspiciousSections?.length || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom summary sentence (Primary Reason Info Banner) */}
            <div className={`px-5 py-3.5 border-t flex gap-3 items-center transition-all ${
              isLight 
                ? 'border-slate-100 bg-blue-50/50' 
                : 'border-[#1e2a3a] bg-blue-500/5'
            }`}>
              <Info className={`w-4 h-4 shrink-0 ${isRansomware ? 'text-red-400' : 'text-blue-400'}`} />
              <p className={`text-xs ${isRansomware ? 'text-red-400' : 'text-blue-300'} font-medium`}>
                <span className="font-bold uppercase tracking-wider text-[10px] mr-1.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25">
                  {isAr ? 'السبب الرئيسي' : 'Primary Reason'}
                </span>
                {(result.detectionReasons || []).slice(0, 2).join(' | ') || (isAr ? 'الخصائص تبدو سليمة ولايوجد مؤشرات سلوكية لبرامج الفدية' : 'Properties appear benign with no ransomware indicators')}
              </p>
            </div>
          </div>

          {/* Model metrics */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { l: T('accuracy'), v: '99.4' },
                { l: 'Precision',   v: '99.8' },
                { l: 'Recall',      v: '98.9' },
                { l: 'F1-Score',    v: '99.3' },
              ].map(({ l, v }) => (
                <div key={l} className={`${card} border rounded-xl p-4`}>
                  <p className={`text-xs mb-1 ${muted}`}>{l}</p>
                  <p className={`text-xl font-bold mb-2 ${txt}`}>{v}%</p>
                  <div className={`w-full rounded-full h-1.5 ${isLight ? 'bg-slate-200' : 'bg-[#1e2a3a]'}`}>
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: v + '%' }} />
                  </div>
                </div>
              ))}
            </div>
            <p className={`text-[10px] text-center ${muted} italic font-medium opacity-70`}>
              * Metrics based on validation dataset (N=62,485) — Independent from current scan result
            </p>
          </div>



          {/* ── Analysis Details Toggle (advanced tab view) ── */}
          <button onClick={() => setShowDetails(v => !v)}
            className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl border transition-all font-semibold text-sm
              ${isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#0d1117] border-[#1e2a3a] text-gray-300 hover:border-purple-500/40 hover:text-white'}`}>
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-400" />
              {showDetails
                ? (isAr ? 'إخفاء التفاصيل المتقدمة' : 'Hide Advanced Details')
                : (isAr ? 'عرض التفاصيل المتقدمة (YARA • أقسام • سلاسل API)' : 'Show Advanced Details (YARA • Sections • API Chains)')}
            </span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <AnalysisDetails
              result={result}
              lang={lang}
              isLight={isLight}
              isRansomware={isRansomware}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Toast({ msg, type, onClose, isAr }: { msg: string; type: 'success' | 'error'; onClose: () => void; isAr: boolean }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-300
      ${type === 'success' ? 'bg-green-500/90 border-green-400/50 text-black' : 'bg-red-500/90 border-red-400/50 text-white'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 text-black" /> : <AlertTriangle className="w-5 h-5 text-white" />}
      <span className="text-sm font-bold tracking-tight">{msg}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/10 rounded-full transition-colors">
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  )
}
