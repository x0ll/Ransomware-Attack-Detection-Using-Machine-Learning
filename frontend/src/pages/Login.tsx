import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../lib/api-config'
import { Shield, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound, Loader2, Sun, Moon, Info, Home, Languages, ChevronDown, Zap } from 'lucide-react'
import { getLang, t, Lang } from '../lib/language'
import { getTheme, setThemeStorage, applyTheme } from '../lib/theme'

type Screen = 'login' | 'register' | 'verify' | 'forgot' | 'resetVerify' | 'newPassword'

// API helper functions for authentication requests
async function apiSendCode(email: string, purpose: 'verify' | 'reset'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Failed to send' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Server not reachable' }
  }
}

async function apiVerifyCode(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    })
    const data = await res.json()
    return { valid: data.valid === true, error: data.error }
  } catch {
    return { valid: false, error: 'Server not reachable' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RadarCanvas Component
// ─────────────────────────────────────────────────────────────────────────────
function RadarCanvas({ isPaused }: { isPaused: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let angle = 0

    // List of cybernetic targets/blips on the radar
    const blips: Array<{ x: number; y: number; size: number; alpha: number; maxAlpha: number }> = [
      { x: 0.22, y: 0.35, size: 3, alpha: 0.1, maxAlpha: 0.7 },
      { x: 0.75, y: 0.28, size: 4, alpha: 0.3, maxAlpha: 0.8 },
      { x: 0.42, y: 0.82, size: 2.5, alpha: 0.5, maxAlpha: 0.9 },
      { x: 0.84, y: 0.61, size: 3.5, alpha: 0.2, maxAlpha: 0.75 },
    ]

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      canvas.width = rect?.width || 500
      canvas.height = rect?.height || 500
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      if (isPaused) return

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const maxRadius = Math.min(w, h) * 0.45

      // Draw background cybernetic grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.03)'
      ctx.lineWidth = 1
      const gridSize = 40
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Draw concentric radar range rings
      ctx.lineWidth = 1
      const rings = [0.25, 0.5, 0.75, 1.0]
      rings.forEach((r, i) => {
        ctx.beginPath()
        ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.03 + (i * 0.02)})`
        ctx.stroke()
      })

      // Draw crosshairs axes
      ctx.beginPath()
      ctx.moveTo(cx - maxRadius, cy)
      ctx.lineTo(cx + maxRadius, cy)
      ctx.moveTo(cx, cy - maxRadius)
      ctx.lineTo(cx, cy + maxRadius)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)'
      ctx.stroke()

      // Draw sweep gradient tail (trail of the sweep)
      const tailSlices = 35
      for (let i = 0; i < tailSlices; i++) {
        const sliceAngle = angle - (i * 0.04)
        const sliceAlpha = (1 - (i / tailSlices)) * 0.1
        const lx = cx + Math.cos(sliceAngle) * maxRadius
        const ly = cy + Math.sin(sliceAngle) * maxRadius

        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(lx, ly)
        ctx.strokeStyle = `rgba(16, 185, 129, ${sliceAlpha})`
        ctx.lineWidth = i === 0 ? 2 : 1
        ctx.stroke()
      }

      // Draw the main sweeping line with multi-layer neon glow (NO shadowBlur!)
      const sweepX = cx + Math.cos(angle) * maxRadius
      const sweepY = cy + Math.sin(angle) * maxRadius
      
      // Layer 1: wide glow
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.05)'
      ctx.lineWidth = 12
      ctx.stroke()

      // Layer 2: narrow glow
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)'
      ctx.lineWidth = 4
      ctx.stroke()

      // Layer 3: sharp center line
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(sweepX, sweepY)
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Update and render target blips
      blips.forEach(blip => {
        const bx = cx + (blip.x - 0.5) * maxRadius * 1.8
        const by = cy + (blip.y - 0.5) * maxRadius * 1.8

        const blipAngle = Math.atan2(by - cy, bx - cx)
        const normSweep = (angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
        const normBlip = (blipAngle + Math.PI * 2) % (Math.PI * 2)
        
        let diff = Math.abs(normSweep - normBlip)
        if (diff > Math.PI) diff = Math.PI * 2 - diff

        // Illuminate blips when the radar sweep sweeps past them
        if (diff < 0.12) {
          blip.alpha = blip.maxAlpha
        } else {
          blip.alpha = Math.max(0.04, blip.alpha - 0.005)
        }

        if (blip.alpha > 0.04) {
          // Glow Layer 1
          ctx.beginPath()
          ctx.arc(bx, by, blip.size * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(34, 197, 94, ${blip.alpha * 0.08})`
          ctx.fill()

          // Glow Layer 2
          ctx.beginPath()
          ctx.arc(bx, by, blip.size * 1.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(34, 197, 94, ${blip.alpha * 0.3})`
          ctx.fill()

          // Inner solid core
          ctx.beginPath()
          ctx.arc(bx, by, blip.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(34, 197, 94, ${blip.alpha})`
          ctx.fill()
        }
      })

      angle += 0.015
      animationFrameId = requestAnimationFrame(draw)
    }

    if (!isPaused) {
      draw()
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [isPaused])

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[#030712]/40">
      <div className="absolute w-[80%] h-[80%] rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
      <canvas ref={canvasRef} className="block w-full h-full relative z-10 animate-fade-in" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SystemBootLoader Component
// ─────────────────────────────────────────────────────────────────────────────
function SystemBootLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  
  const bootLogs = [
    'Initializing SARMZ RansomGuard core...',
    'Loading AI detection models (Random Forest)...',
    'Checking database integrity (SQLite)...',
    'Connecting to local EDR agent...',
    'EDR status check: ACTIVE & PROTECTED',
    'System initialization completed successfully.'
  ]

  useEffect(() => {
    const startTime = Date.now()
    const duration = 2000

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100))
      setProgress(pct)
      
      const logIdx = Math.min(
        bootLogs.length - 1,
        Math.floor((pct / 100) * bootLogs.length)
      )
      
      setLogs(bootLogs.slice(0, logIdx + 1))

      if (elapsed >= duration) {
        clearInterval(progressInterval)
        onComplete()
      }
    }, 30)

    return () => clearInterval(progressInterval)
  }, [])

  return (
    <div className="min-h-screen bg-[#030712] text-green-400 font-mono p-6 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between border-b border-green-500/20 pb-4 text-xs opacity-75">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
          <span className="ml-2">SARMZ-RansomGuard://bootloader.sh</span>
        </div>
        <div>v1.0.0 (Build 2026.05.25)</div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center max-w-xl mx-auto w-full gap-8 my-12">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-green-500/5 border border-green-500/10 animate-ping duration-1000" />
          <div className="w-20 h-20 rounded-full border border-green-400/40 bg-green-950/20 flex items-center justify-center relative shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-pulse">
            <Shield className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="w-full bg-[#0a0f1d] border border-green-500/10 rounded-xl p-5 font-mono text-xs text-left h-44 overflow-y-auto space-y-1.5 shadow-2xl">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-green-600 select-none">&gt;&gt;</span>
              <span className={index === bootLogs.length - 1 ? "text-cyan-400 font-bold" : "text-green-400/90"}>{log}</span>
            </div>
          ))}
          {progress < 100 && (
            <div className="flex items-center gap-1.5 animate-pulse text-green-500">
              <span className="w-1.5 h-3.5 bg-green-500 inline-block" />
            </div>
          )}
        </div>

        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-bold px-1 text-green-500/80">
            <span>BOOTING SECURITY CORE</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[#0d1527] rounded-full overflow-hidden border border-green-500/10 p-[1px]">
            <div className="h-full bg-green-500 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-green-500/40 border-t border-green-500/10 pt-4">
        SARMZ CO. SECURITY OPERATIONS CENTER - PRIVILEGED ACCESS ONLY
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthPanel Component (State & Ref Isolation for 0ms Lag)
// ─────────────────────────────────────────────────────────────────────────────
interface AuthPanelProps {
  onLogin: (username: string) => void
  lang: Lang
  theme: 'light' | 'dark'
  isAr: boolean
  T: (k: string) => string
  onClose: () => void
}

function AuthPanel({ onLogin, lang, theme, isAr, T, onClose }: AuthPanelProps) {
  const [screen, setScreen] = useState<Screen>('login')

  // Uncontrolled input references to bypass React diff/rendering lags during typing
  const loginEmailRef = useRef<HTMLInputElement>(null)
  const loginPasswordRef = useRef<HTMLInputElement>(null)
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Registration States (typing lag is not a critical issue inside separate sub-screens)
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)

  // Verification States
  const [verifyCode, setVerifyCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)

  // OTP Timer States
  const [resendTimer, setResendTimer] = useState(0)
  const timerRef = useRef<any>(null)

  // Validation status
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const isLight = theme === 'light'

  const startTimer = () => {
    setResendTimer(60)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer(v => { if (v <= 1) { clearInterval(timerRef.current); return 0 } return v - 1 })
    }, 1000)
  }

  const go = (s: Screen) => { setScreen(s); setError(''); setSuccess('') }

  const handleLogin = async () => {
    setError('')
    const email = loginEmailRef.current?.value || ''
    const password = loginPasswordRef.current?.value || ''

    if (!email || !password) { setError(T('emailInvalid')); return }

    setLoading(true)
    try {
      const loginRes = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setLoading(false)
        setError(loginData.error || T('loginError'))
        return
      }

      setPendingEmail(email)
      const result = await apiSendCode(email, 'verify')
      setLoading(false)

      if (!result.ok) { setError(result.error || 'Failed to send OTP code'); return }

      sessionStorage.setItem('rg_pending_user', loginData.username)
      startTimer()
      go('verify')
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  const handleRegister = async () => {
    setError('')
    if (regUsername.length < 3) { setError(T('usernameTooShort')); return }
    if (!regEmail.includes('@')) { setError(T('emailInvalid')); return }
    if (regPassword.length < 6) { setError(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    const hasUpper = /[A-Z]/.test(regPassword)
    const hasLower = /[a-z]/.test(regPassword)
    const hasNum = /[0-9]/.test(regPassword)
    const hasSpec = /[^A-Za-z0-9]/.test(regPassword)
    if (!hasUpper || !hasLower || !hasNum || !hasSpec) {
      setError(isAr ? 'كلمة المرور لا تستوفي شروط القوة' : 'Password does not meet complexity requirements')
      return
    }
    if (regPassword !== regConfirm) { setError(T('passwordMismatch')); return }

    setLoading(true)
    try {
      const regRes = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword })
      })
      const regData = await regRes.json()

      if (!regRes.ok) {
        setLoading(false)
        setError(regData.error || 'Registration failed')
        return
      }

      setLoading(false)

      // Directly update the Sign In refs for seamless transition
      if (loginEmailRef.current) {
        loginEmailRef.current.value = regEmail
      }
      if (loginPasswordRef.current) {
        loginPasswordRef.current.value = ''
      }

      setSuccess(T('accountCreated'))
      setTimeout(() => go('login'), 1200)
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  const handleSendCode = async (email: string, purpose: 'verify' | 'reset') => {
    setLoading(true)
    const result = await apiSendCode(email, purpose)
    setLoading(false)
    if (!result.ok) { setError(result.error || 'Failed to send'); return }
    startTimer()
  }

  const handleVerify = async () => {
    setError('')
    if (verifyCode.length !== 6) { setError(T('invalidCode')); return }

    setLoading(true)
    const result = await apiVerifyCode(pendingEmail, verifyCode)
    setLoading(false)

    if (!result.valid) { setError(T('invalidCode')); return }

    const uname = sessionStorage.getItem('rg_pending_user') || 'User'
    sessionStorage.removeItem('rg_pending_user')

    localStorage.setItem('rg_user_email', pendingEmail)
    setSuccess('✅ ' + T('loginSuccess'))
    setTimeout(() => onLogin(uname), 900)
  }

  const handleForgotSend = async () => {
    setError('')
    if (!forgotEmail.includes('@')) { setError(T('emailInvalid')); return }

    setLoading(true)
    try {
      const checkRes = await fetch(`${API_BASE_URL}/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      const checkData = await checkRes.json()

      if (!checkRes.ok) {
        setLoading(false)
        setError(checkData.error || T('loginError'))
        return
      }

      const result = await apiSendCode(forgotEmail, 'reset')
      setLoading(false)

      if (!result.ok) { setError(result.error || 'Failed to send code'); return }

      startTimer()
      go('resetVerify')
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  const handleResetVerify = async () => {
    setError('')
    if (resetCode.length !== 6) { setError(T('invalidCode')); return }
    setLoading(true)
    const result = await apiVerifyCode(forgotEmail, resetCode)
    setLoading(false)
    if (!result.valid) { setError(T('invalidCode')); return }
    go('newPassword')
  }

  const handleNewPassword = async () => {
    setError('')
    if (newPassword.length < 6) { setError(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNum = /[0-9]/.test(newPassword)
    const hasSpec = /[^A-Za-z0-9]/.test(newPassword)
    if (!hasUpper || !hasLower || !hasNum || !hasSpec) {
      setError(isAr ? 'كلمة المرور لا تستوفي شروط القوة' : 'Password does not meet complexity requirements')
      return
    }
    if (newPassword !== newPasswordConfirm) { setError(T('passwordMismatch')); return }

    setLoading(true)
    try {
      const resetRes = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, newPassword })
      })
      const resetData = await resetRes.json()
      setLoading(false)

      if (!resetRes.ok) {
        setError(resetData.error || 'Failed to reset password')
        return
      }

      setSuccess(T('passwordReset'))
      setTimeout(() => go('login'), 1200)
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  const ErrorBox = () => error ? (
    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 animate-in fade-in duration-300">
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="text-red-400 text-xs">{error}</span>
    </div>
  ) : null

  const SuccessBox = () => success ? (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4 animate-in fade-in duration-300">
      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="text-green-400 text-xs">{success}</span>
    </div>
  ) : null

  const BackBtn = ({ to }: { to: Screen }) => (
    <button onClick={() => go(to)} className="text-gray-500 hover:text-white transition-colors">
      <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
    </button>
  )

  const inputCls = (extra = '') =>
    `w-full border rounded-lg py-2 text-sm focus:outline-none focus:border-green-500 transition-colors ${isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-[#0a0e1a] border-[#1e2a3a] text-white placeholder-gray-600'} ${extra}`

  const BtnPrimary = ({ onClick, children, disabled }: any) => (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )

  return (
    <div className={`w-full relative max-w-md ${isLight ? 'text-slate-800' : 'text-white'} animate-in zoom-in-95 duration-200`} style={{ contain: 'content' }}>
      {/* Close button for form slide overlay */}
      <button 
        onClick={onClose}
        className="absolute -top-12 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25"
      >
        <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        {isAr ? 'إغلاق' : 'Close'}
      </button>

      {/* Logo */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full border-2 border-green-400 flex items-center justify-center mx-auto mb-2.5 shadow-lg shadow-green-500/25">
          <Shield className="w-7 h-7 text-green-400" />
        </div>
        <h1 className={`text-xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>SARMZ RansomGuard</h1>
        <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{T('protectedBy')}</p>
      </div>

      <div className={`border rounded-2xl p-6 shadow-2xl transition-colors duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-[#1e2a3a]'}`}>
        
        {/* Screen 1: Login (Using refs for 0ms Lag) */}
        {screen === 'login' && (<>
          <h2 className={`text-lg font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{T('login')}</h2>
          <p className="text-gray-500 text-xs mb-5">{T('monitorDesc')}</p>
          <ErrorBox /><SuccessBox />
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('email')}</label>
              <div className="relative">
                <Mail className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input 
                  ref={loginEmailRef}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                  placeholder={T('emailPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} 
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('password')}</label>
              <div className="relative">
                <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input 
                  ref={loginPasswordRef}
                  type={showLoginPw ? 'text' : 'password'} 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                  placeholder={T('passwordPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-9' : 'pl-9 pr-9')} 
                />
                <button onClick={() => setShowLoginPw(v => !v)} className={`absolute top-3 ${isAr ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-300`}>
                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <button onClick={() => go('forgot')} className="text-green-400 hover:text-green-300 text-xs font-medium transition-colors underline underline-offset-2">
                  {T('Forgot Password')}
                </button>
              </div>
            </div>
            <BtnPrimary onClick={handleLogin}>{T('loginBtn')}</BtnPrimary>
          </div>
          <p className="text-center text-gray-500 text-xs mt-4">
            {T('noAccount')}{' '}
            <button onClick={() => go('register')} className="text-green-400 hover:text-green-300 font-medium">{T('signUpLink')}</button>
          </p>
        </>)}

        {/* Screen 2: Register */}
        {screen === 'register' && (<>
          <div className="flex items-center gap-2 mb-1"><BackBtn to="login" />
            <h2 className="text-white text-lg font-bold">{T('register')}</h2></div>
          <p className="text-gray-500 text-xs mb-4 ps-6">{T('protectedBy')}</p>
          <ErrorBox /><SuccessBox />
          <div className="space-y-3">
            {[
              { label: T('username'), val: regUsername, set: setRegUsername, icon: User, ph: T('usernamePlaceholder'), type: 'text' },
              { label: T('email'), val: regEmail, set: setRegEmail, icon: Mail, ph: T('emailPlaceholder'), type: 'email' },
            ].map(({ label, val, set, icon: Icon, ph, type }) => (
              <div key={label}>
                <label className="text-gray-400 text-xs mb-1.5 block">{label}</label>
                <div className="relative">
                  <Icon className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                  <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} />
                </div>
              </div>
            ))}
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('password')}</label>
              <div className="relative">
                <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input type={showRegPw ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder={T('passwordPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-9' : 'pl-9 pr-9')} />
                <button onClick={() => setShowRegPw(v => !v)} className={`absolute top-3 ${isAr ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-300`}>
                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {regPassword && (
                <div className="mt-2.5 space-y-2 p-3 rounded-xl bg-black/20 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{isAr ? 'شروط كلمة المرور' : 'Password Requirements'}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {[
                      { label: isAr ? '6+ أحرف' : '6+ chars', met: regPassword.length >= 6 },
                      { label: isAr ? 'حرف كبير' : 'Uppercase', met: /[A-Z]/.test(regPassword) },
                      { label: isAr ? 'حرف صغير' : 'Lowercase', met: /[a-z]/.test(regPassword) },
                      { label: isAr ? 'رقم' : 'Number', met: /[0-9]/.test(regPassword) },
                      { label: isAr ? 'رمز خاص' : 'Special', met: /[^A-Za-z0-9]/.test(regPassword) },
                    ].map((rule, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[9px] transition-all ${rule.met ? 'text-green-400' : 'text-gray-500'}`}>
                        <div className={`w-1 h-1 rounded-full ${rule.met ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-gray-700'}`} />
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('confirmPassword')}</label>
              <div className="relative">
                <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()} placeholder={T('confirmPasswordPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} />
              </div>
            </div>
            <BtnPrimary onClick={handleRegister}>{T('registerBtn')}</BtnPrimary>
          </div>
          <p className="text-center text-gray-500 text-xs mt-4">
            {T('hasAccount')}{' '}
            <button onClick={() => go('login')} className="text-green-400 hover:text-green-300 font-medium">{T('signInLink')}</button>
          </p>
        </>)}

        {/* Screen 3: Verify OTP */}
        {screen === 'verify' && (<>
          <div className="flex items-center gap-2 mb-3">
            <BackBtn to="login" />
            <span className="text-gray-400 text-xs">{T('signInLink')}</span>
          </div>
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-2.5">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-white text-lg font-bold mb-0.5">{T('verifyEmail')}</h2>
            <p className="text-gray-500 text-xs">{T('verifyDesc')}</p>
            <p className="text-green-400 text-xs font-medium mt-1">{pendingEmail}</p>
          </div>
          <ErrorBox /><SuccessBox />
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('verifyCode')}</label>
              <input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerify()} placeholder="○ ○ ○ ○ ○ ○" maxLength={6}
                className="w-full bg-[#0a0e1a] border border-[#1e2a3a] rounded-lg px-3 py-2.5 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-green-500 transition-colors" />
            </div>
            <BtnPrimary onClick={handleVerify}>{T('verifyBtn')}</BtnPrimary>
            <button onClick={() => handleSendCode(pendingEmail, 'verify')} disabled={resendTimer > 0 || loading}
              className="w-full text-gray-400 hover:text-white text-xs py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {resendTimer > 0 ? `${T('resendIn')} ${resendTimer}${T('seconds')}` : T('resendCode')}
            </button>
          </div>
        </>)}

        {/* Screen 4: Forgot Password Send OTP */}
        {screen === 'forgot' && (<>
          <div className="flex items-center gap-2 mb-3"><BackBtn to="login" />
            <h2 className="text-white text-lg font-bold">{T('Forgot Password')}</h2>
          </div>
          <ErrorBox /><SuccessBox />
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('email')}</label>
              <div className="relative">
                <Mail className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForgotSend()} placeholder={T('emailPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} />
              </div>
            </div>
            <BtnPrimary onClick={handleForgotSend}>{T('Send Code')}</BtnPrimary>
          </div>
        </>)}

        {/* Screen 5: Verify Reset Code */}
        {screen === 'resetVerify' && (<>
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-2.5">
              <KeyRound className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-white text-lg font-bold mb-0.5">{T('Reset Code')}</h2>
            <p className="text-gray-500 text-xs">{T('verifyDesc')}</p>
            <p className="text-green-400 text-xs font-medium mt-1">{forgotEmail}</p>
          </div>
          <ErrorBox /><SuccessBox />
          <div className="space-y-4">
            <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleResetVerify()} placeholder="○ ○ ○ ○ ○ ○" maxLength={6}
              className="w-full bg-[#0a0e1a] border border-[#1e2a3a] rounded-lg px-3 py-2.5 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-orange-500 transition-colors" />
            <BtnPrimary onClick={handleResetVerify}>{T('verifyBtn')}</BtnPrimary>
            <button onClick={() => handleSendCode(forgotEmail, 'reset')} disabled={resendTimer > 0 || loading}
              className="w-full text-gray-400 hover:text-white text-xs py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {resendTimer > 0 ? `${T('resendIn')} ${resendTimer}${T('seconds')}` : T('resendCode')}
            </button>
          </div>
        </>)}

        {/* Screen 6: Set New Password */}
        {screen === 'newPassword' && (<>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-white text-lg font-bold">{T('New Password')}</h2>
          </div>
          <ErrorBox /><SuccessBox />
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('password')}</label>
              <div className="relative">
                <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder={T('passwordPlaceholder')} className={inputCls(isAr ? 'pr-9 pl-9' : 'pl-9 pr-9')} />
                <button onClick={() => setShowNewPw(v => !v)} className={`absolute top-3 ${isAr ? 'left-3' : 'right-3'} text-gray-500 hover:text-gray-300`}>
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2.5 space-y-2 p-3 rounded-xl bg-black/20 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{isAr ? 'شروط كلمة المرور' : 'Password Requirements'}</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {[
                      { label: isAr ? '6+ أحرف' : '6+ chars', met: newPassword.length >= 6 },
                      { label: isAr ? 'حرف كبير' : 'Uppercase', met: /[A-Z]/.test(newPassword) },
                      { label: isAr ? 'حرف صغير' : 'Lowercase', met: /[a-z]/.test(newPassword) },
                      { label: isAr ? 'رقم' : 'Number', met: /[0-9]/.test(newPassword) },
                      { label: isAr ? 'رمز خاص' : 'Special', met: /[^A-Za-z0-9]/.test(newPassword) },
                    ].map((rule, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-[9px] transition-all ${rule.met ? 'text-green-400' : 'text-gray-500'}`}>
                        <div className={`w-1 h-1 rounded-full ${rule.met ? 'bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'bg-gray-700'}`} />
                        {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">{T('confirmPassword')}</label>
              <div className="relative">
                <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                <input type="password" value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNewPassword()} placeholder={T('confirmPasswordPlaceholder')}
                  className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} />
              </div>
            </div>
            <BtnPrimary onClick={handleNewPassword}>{T('Reset Password')}</BtnPrimary>
          </div>
        </>)}

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LoginPage Component
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin }: { onLogin: (username: string) => void }) {
  const [isBooting, setIsBooting] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [lang, setLang] = useState<Lang>(getLang())
  const [theme, setTheme] = useState(getTheme())

  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'

  useEffect(() => {
    window.addEventListener('lang-changed', () => setLang(getLang()))
    window.addEventListener('theme-changed', () => setTheme(getTheme()))
    return () => {
      window.removeEventListener('lang-changed', () => setLang(getLang()))
      window.removeEventListener('theme-changed', () => setTheme(getTheme()))
    }
  }, [])

  if (isBooting) {
    return <SystemBootLoader onComplete={() => setIsBooting(false)} />
  }

  const landingTitle = isAr 
    ? 'SARMZ RansomGuard: كشف برمجيات الفدية الذكي للجيل القادم' 
    : 'SARMZ RansomGuard: Next-Gen AI Ransomware Detection'
  const landingDesc = isAr
    ? 'احمِ محطات العمل والشبكات الخاصة بجهتك من البرمجيات الخبيثة والهجمات السيبرانية المعقدة في الوقت الفعلي، بالاعتماد على خوارزميات الذكاء الاصطناعي والتحليل الاستاتيكي المتقدم لهياكل PE.'
    : 'Protect your enterprise endpoints from sophisticated threat actors in real-time. Powered by next-gen machine learning and advanced static PE signature analysis.'
  const launchBtnText = isAr ? 'دخول لوحة التحكم' : 'Launch Dashboard'
  const aboutBtnText = isAr ? 'من نحن' : 'About Us'

  return (
    <div className={`min-h-screen w-full flex flex-col lg:flex-row overflow-hidden transition-colors duration-500 bg-[#060d1a]`} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* LEFT PANE: Premium Branding, Titles, Launch Triggers */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-16 relative z-10 select-none border-b lg:border-b-0 lg:border-r border-white/5 bg-[#070d19]/80 backdrop-blur-sm">
        
        {/* Top Header Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl border border-green-500/30 bg-green-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.15)] animate-pulse">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <span className="text-base font-bold text-white tracking-wide">SARMZ RansomGuard</span>
        </div>

        {/* Marketing Neon Content */}
        <div className="my-auto py-12 max-w-xl">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-[0_0_12px_rgba(34,197,94,0.15)]">
            SARMZ RansomGuard:<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400">
              {isAr ? 'كشف برمجيات الفدية الذكي للجيل القادم' : 'Next-Gen AI Ransomware Detection'}
            </span>
          </h1>
          
          <p className="text-gray-400 text-sm leading-relaxed mb-10 max-w-lg">
            {landingDesc}
          </p>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-black shadow-lg shadow-green-500/15 hover:shadow-green-500/25 hover:scale-[1.01] active:scale-[0.99]"
            >
              <Zap className="w-5 h-5 fill-current" />
              {launchBtnText}
            </button>

            <button 
              onClick={() => window.location.href = '/about'}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all border border-white/10 bg-white/5 hover:bg-white/10 text-white hover:scale-[1.01] active:scale-[0.99]"
            >
              <Info className="w-5 h-5" />
              {aboutBtnText}
            </button>
          </div>
        </div>

        {/* Bottom Lang & Theme Switchers */}
        <div className="flex items-center gap-3 border-t border-white/5 pt-6">
          <div className="relative">
            <select 
              value={lang} 
              onChange={(e) => {
                const l = e.target.value as Lang
                const s = JSON.parse(localStorage.getItem('ransomguard_settings') || '{}')
                localStorage.setItem('ransomguard_settings', JSON.stringify({ ...s, lang: l }))
                setLang(l)
                window.dispatchEvent(new Event('lang-changed'))
              }}
              className="text-xs font-semibold py-2 pl-8 pr-6 rounded-xl border appearance-none cursor-pointer bg-[#0c1322] border-white/10 text-gray-300 hover:border-green-500/50 transition-colors focus:outline-none"
            >
              <option value="en">English (US)</option>
              <option value="ar">العربية (Arabic)</option>
            </select>
            <Languages className="absolute top-1/2 left-2.5 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>

          <button 
            onClick={() => {
              const newT = theme === 'dark' ? 'light' : 'dark'
              setTheme(newT)
              setThemeStorage(newT)
              applyTheme(newT)
            }}
            className="p-2 rounded-xl border border-white/10 bg-[#0c1322] text-gray-300 hover:border-green-500/50 transition-colors flex items-center justify-center"
          >
            {theme === 'light' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* RIGHT PANE: Radar Canvas (Animation pauses when login modal is open to ensure 0% CPU footprint) */}
      <div className="w-full lg:w-1/2 h-[400px] lg:h-screen relative bg-[#030712]">
        <RadarCanvas isPaused={isFormOpen || isBooting} />
        
        {/* Subtle decorative security status label overlay */}
        <div className={`absolute bottom-6 ${isAr ? 'left-6' : 'right-6'} z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 border border-white/5 backdrop-blur-sm`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold tracking-wider text-green-400 uppercase">
            {isAr ? 'الدرع نشط ومحمي' : 'EDR Shield Active'}
          </span>
        </div>
      </div>

      {/* OVERLAY: Fluid Sliding Glassmorphic Form Overlay */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/80 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in duration-200"
          style={{
            willChange: 'opacity, transform',
            contain: 'strict'
          }}
        >
          <AuthPanel 
            onLogin={onLogin} 
            lang={lang} 
            theme={theme} 
            isAr={isAr} 
            T={T} 
            onClose={() => setIsFormOpen(false)} 
          />
        </div>
      )}

    </div>
  )
}
