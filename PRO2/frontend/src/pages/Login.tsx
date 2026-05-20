import { useState, useEffect, useRef } from 'react'
import { API_BASE_URL } from '../lib/api-config'
import { Shield, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound, Loader2, Sun, Moon, Info, Home } from 'lucide-react'
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

export default function LoginPage({ onLogin }: { onLogin: (username: string) => void }) {
  const [screen, setScreen] = useState<Screen>('login')
  const [lang, setLang] = useState<Lang>(getLang())
  const [theme, setTheme] = useState(getTheme())
  const isLight = theme === 'light'
  const T = (k: string) => t[lang][k] || k
  const isAr = lang === 'ar'

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  // Register
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)

  // Verify
  const [verifyCode, setVerifyCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)

  // Timer
  const [resendTimer, setResendTimer] = useState(0)
  const timerRef = useRef<any>(null)

  // Status
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.addEventListener('lang-changed', () => setLang(getLang()))
    window.addEventListener('theme-changed', () => setTheme(getTheme()))
    return () => {
      window.removeEventListener('lang-changed', () => setLang(getLang()))
      window.removeEventListener('theme-changed', () => setTheme(getTheme()))
    }
  }, [])

  const startTimer = () => {
    setResendTimer(60)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer(v => { if (v <= 1) { clearInterval(timerRef.current); return 0 } return v - 1 })
    }, 1000)
  }

  const go = (s: Screen) => { setScreen(s); setError(''); setSuccess('') }

  // Handle login: validate credentials, then send a 2FA OTP code
  const handleLogin = async () => {
    setError('')
    if (!loginEmail || !loginPassword) { setError(T('emailInvalid')); return }

    setLoading(true)
    try {
      const loginRes = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      const loginData = await loginRes.json()

      if (!loginRes.ok) {
        setLoading(false)
        setError(loginData.error || T('loginError'))
        return
      }

      // Credentials are valid — send a 2FA verification code to the user's email
      setPendingEmail(loginEmail)
      const result = await apiSendCode(loginEmail, 'verify')
      setLoading(false)

      if (!result.ok) { setError(result.error || 'Failed to send OTP code'); return }

      // Store the username in sessionStorage temporarily until OTP is confirmed
      sessionStorage.setItem('rg_pending_user', loginData.username)

      startTimer()
      go('verify')
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  // Handle registration: validate inputs, create account, then redirect to login
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
      // Step 1: Register the user account in the backend database
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

      // Step 2: Redirect to login page so the user authenticates and receives a 2FA code
      setLoginEmail(regEmail)
      setLoginPassword('')
      setSuccess(T('accountCreated'))
      setTimeout(() => go('login'), 1200)
    } catch (e) {
      setLoading(false)
      setError('Server connection error')
    }
  }

  // Reusable function to request a new OTP code for any purpose
  const handleSendCode = async (email: string, purpose: 'verify' | 'reset') => {
    setLoading(true)
    const result = await apiSendCode(email, purpose)
    setLoading(false)
    if (!result.ok) { setError(result.error || 'Failed to send'); return }
    startTimer()
  }

  // Verify the OTP code entered by the user after login
  const handleVerify = async () => {
    setError('')
    if (verifyCode.length !== 6) { setError(T('invalidCode')); return }

    setLoading(true)
    const result = await apiVerifyCode(pendingEmail, verifyCode)
    setLoading(false)

    if (!result.valid) { setError(T('invalidCode')); return }

    // Retrieve the pending username saved before the OTP screen
    const uname = sessionStorage.getItem('rg_pending_user') || 'User'
    // Remove it immediately after use to avoid stale session data
    sessionStorage.removeItem('rg_pending_user')

    localStorage.setItem('rg_user_email', pendingEmail)
    setSuccess('✅ ' + T('loginSuccess'))
    setTimeout(() => onLogin(uname), 900)
  }

  // Password reset step 1: verify the email exists, then send a reset code
  const handleForgotSend = async () => {
    setError('')
    if (!forgotEmail.includes('@')) { setError(T('emailInvalid')); return }

    setLoading(true)
    try {
      // Step 1: Confirm the email address exists in the system before sending a reset code
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

  // Password reset step 2: verify the OTP code received by email
  const handleResetVerify = async () => {
    setError('')
    if (resetCode.length !== 6) { setError(T('invalidCode')); return }
    setLoading(true)
    const result = await apiVerifyCode(forgotEmail, resetCode)
    setLoading(false)
    if (!result.valid) { setError(T('invalidCode')); return }
    go('newPassword')
  }

  // Password reset step 3: validate and submit the new password
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

  // Shared inline UI components for displaying feedback to the user
  const ErrorBox = () => error ? (
    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="text-red-400 text-sm">{error}</span>
    </div>
  ) : null

  const SuccessBox = () => success ? (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="text-green-400 text-sm">{success}</span>
    </div>
  ) : null

  const BackBtn = ({ to }: { to: Screen }) => (
    <button onClick={() => go(to)} className="text-gray-500 hover:text-white transition-colors">
      <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
    </button>
  )

  const inputCls = (extra = '') =>
    `w-full border rounded-lg py-2.5 text-sm focus:outline-none focus:border-green-500 transition-colors ${isLight ? 'bg-[#f8fafc] border-slate-200 text-slate-800 placeholder-slate-400' : 'bg-[#0a0e1a] border-[#1e2a3a] text-white placeholder-gray-600'} ${extra}`

  const BtnPrimary = ({ onClick, children, disabled }: any) => (
    <button onClick={onClick} disabled={disabled || loading}
      className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isLight ? 'bg-[#f0f4f8]' : 'bg-[#060d1a]'}`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Top Action Buttons */}
        <div className="absolute -top-16 left-0 right-0 w-full flex items-center justify-between">
          <button onClick={() => window.location.href = '/about'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md bg-blue-500 hover:bg-blue-600 text-white">
            <Info className="w-4 h-4" />
            {isAr ? 'من نحن' : 'About Us'}
          </button>
          <button onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md bg-green-500 hover:bg-green-600 text-white">
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-green-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/20">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h1 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>SARMZ RansomGuard</h1>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{T('protectedBy')}</p>
        </div>

        <div className={`border rounded-2xl p-6 shadow-2xl transition-colors duration-300 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0d1117] border-[#1e2a3a]'}`}>

          {/* ════ LOGIN ════ */}
          {screen === 'login' && (<>
            <h2 className={`text-xl font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{T('login')}</h2>
            <p className="text-gray-500 text-sm mb-6">{T('monitorDesc')}</p>
            <ErrorBox /><SuccessBox />
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">{T('email')}</label>
                <div className="relative">
                  <Mail className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                  <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder={T('emailPlaceholder')}
                    className={inputCls(isAr ? 'pr-9 pl-3' : 'pl-9 pr-3')} />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">{T('password')}</label>
                <div className="relative">
                  <Lock className={`absolute top-3 ${isAr ? 'right-3' : 'left-3'} w-4 h-4 text-gray-500`} />
                  <input type={showLoginPw ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder={T('passwordPlaceholder')}
                    className={inputCls(isAr ? 'pr-9 pl-9' : 'pl-9 pr-9')} />
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
            <p className="text-center text-gray-500 text-sm mt-5">
              {T('noAccount')}{' '}
              <button onClick={() => go('register')} className="text-green-400 hover:text-green-300 font-medium">{T('signUpLink')}</button>
            </p>
          </>)}

          {/* ════ REGISTER ════ */}
          {screen === 'register' && (<>
            <div className="flex items-center gap-2 mb-1"><BackBtn to="login" />
              <h2 className="text-white text-xl font-bold">{T('register')}</h2></div>
            <p className="text-gray-500 text-sm mb-5 ps-6">{T('protectedBy')}</p>
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
              <button onClick={() => {
                const newT = theme === 'dark' ? 'light' : 'dark'
                setTheme(newT)
                setThemeStorage(newT)
                applyTheme(newT)
              }} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow ${isLight ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}>
                {isLight ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
                {isLight ? 'Light' : 'Dark'}
              </button>
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
                  <div className="mt-3 space-y-2 p-3 rounded-xl bg-black/20 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{isAr ? 'شروط كلمة المرور' : 'Password Requirements'}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                      {[
                        { label: isAr ? '6+ أحرف' : '6+ chars', met: regPassword.length >= 6 },
                        { label: isAr ? 'حرف كبير' : 'Uppercase', met: /[A-Z]/.test(regPassword) },
                        { label: isAr ? 'حرف صغير' : 'Lowercase', met: /[a-z]/.test(regPassword) },
                        { label: isAr ? 'رقم' : 'Number', met: /[0-9]/.test(regPassword) },
                        { label: isAr ? 'رمز خاص' : 'Special', met: /[^A-Za-z0-9]/.test(regPassword) },
                      ].map((rule, i) => (
                        <div key={i} className={`flex items-center gap-1.5 text-[10px] transition-all ${rule.met ? 'text-green-400' : 'text-gray-500'}`}>
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
            <p className="text-center text-gray-500 text-sm mt-5">
              {T('hasAccount')}{' '}
              <button onClick={() => go('login')} className="text-green-400 hover:text-green-300 font-medium">{T('signInLink')}</button>
            </p>
          </>)}

          {/* ════ VERIFY EMAIL ════ */}
          {(screen === 'verify') && (<>
            <div className="flex items-center gap-2 mb-4">
              <BackBtn to="login" />
              <span className="text-gray-400 text-xs">{T('signInLink')}</span>
            </div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-1">{T('verifyEmail')}</h2>
              <p className="text-gray-500 text-sm">{T('verifyDesc')}</p>
              <p className="text-green-400 text-sm font-medium mt-1">{pendingEmail}</p>
            </div>
            <ErrorBox /><SuccessBox />
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">{T('verifyCode')}</label>
                <input value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && handleVerify()} placeholder="○ ○ ○ ○ ○ ○" maxLength={6}
                  className="w-full bg-[#0a0e1a] border border-[#1e2a3a] rounded-lg px-3 py-3 text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-green-500 transition-colors" />
              </div>
              <BtnPrimary onClick={handleVerify}>{T('verifyBtn')}</BtnPrimary>
              <button onClick={() => handleSendCode(pendingEmail, 'verify')} disabled={resendTimer > 0 || loading}
                className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {resendTimer > 0 ? `${T('resendIn')} ${resendTimer}${T('seconds')}` : T('resendCode')}
              </button>
            </div>
          </>)}

          {/* ════ FORGOT - Step 1: Email ════ */}
          {screen === 'forgot' && (<>
            <div className="flex items-center gap-2 mb-4"><BackBtn to="login" />
              <div>
                <h2 className="text-white text-xl font-bold">{T('Forgot Password')}</h2>
              </div>
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

          {/* ════ FORGOT - Step 2: Reset Code ════ */}
          {screen === 'resetVerify' && (<>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-7 h-7 text-orange-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-1">{T('Reset Code')}</h2>
              <p className="text-gray-500 text-sm">{T('verifyDesc')}</p>
              <p className="text-green-400 text-sm font-medium mt-1">{forgotEmail}</p>
            </div>
            <ErrorBox /><SuccessBox />
            <div className="space-y-4">
              <input value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleResetVerify()} placeholder="○ ○ ○ ○ ○ ○" maxLength={6}
                className="w-full bg-[#0a0e1a] border border-[#1e2a3a] rounded-lg px-3 py-3 text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-orange-500 transition-colors" />
              <BtnPrimary onClick={handleResetVerify}>{T('verifyBtn')}</BtnPrimary>
              <button onClick={() => handleSendCode(forgotEmail, 'reset')} disabled={resendTimer > 0 || loading}
                className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {resendTimer > 0 ? `${T('resendIn')} ${resendTimer}${T('seconds')}` : T('resendCode')}
              </button>
            </div>
          </>)}

          {/* ════ FORGOT - Step 3: New Password ════ */}
          {screen === 'newPassword' && (<>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">{T('New Password')}</h2>
              </div>
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
                  <div className="mt-3 space-y-2 p-3 rounded-xl bg-black/20 border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{isAr ? 'شروط كلمة المرور' : 'Password Requirements'}</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                      {[
                        { label: isAr ? '6+ أحرف' : '6+ chars', met: newPassword.length >= 6 },
                        { label: isAr ? 'حرف كبير' : 'Uppercase', met: /[A-Z]/.test(newPassword) },
                        { label: isAr ? 'حرف صغير' : 'Lowercase', met: /[a-z]/.test(newPassword) },
                        { label: isAr ? 'رقم' : 'Number', met: /[0-9]/.test(newPassword) },
                        { label: isAr ? 'رمز خاص' : 'Special', met: /[^A-Za-z0-9]/.test(newPassword) },
                      ].map((rule, i) => (
                        <div key={i} className={`flex items-center gap-1.5 text-[10px] transition-all ${rule.met ? 'text-green-400' : 'text-gray-500'}`}>
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

        {/* Language and theme switcher — updates localStorage and fires global events */}
        <div className="flex justify-center gap-2 mt-4">
          {(['en', 'ar'] as Lang[]).map(l => (
            <button key={l} onClick={() => {
              const s = JSON.parse(localStorage.getItem('ransomguard_settings') || '{}')
              localStorage.setItem('ransomguard_settings', JSON.stringify({ ...s, lang: l }))
              setLang(l); window.dispatchEvent(new Event('lang-changed'))
            }} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow ${lang === l ? 'bg-green-500 text-white' : isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-[#1e2a3a] text-gray-300 hover:text-white'}`}>
              {l === 'en' ? 'English' : 'العربية'}
            </button>
          ))}
          <button onClick={() => {
            const newT = theme === 'dark' ? 'light' : 'dark'
            setTheme(newT)
            setThemeStorage(newT)
            applyTheme(newT)
          }} className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow ${isLight ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}>
            {isLight ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
            {isLight ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>
    </div>
  )
}
