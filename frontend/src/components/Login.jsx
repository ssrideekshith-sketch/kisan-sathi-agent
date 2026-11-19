import { useState } from 'react'
import { BookOpen, Headphones, Leaf, MapPin, Ruler, ShieldCheck, Sprout, UserRound } from 'lucide-react'
import { LANGUAGES, speechLocale, t } from '../i18n/translations.js'
import ImageSlot from './ImageSlot.jsx'

const API = 'http://localhost:8000'

function Login({ language, onLanguageChange, onLogin }) {
  const [role, setRole] = useState('farmer')
  const [identifier, setIdentifier] = useState('T05060123456')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [farmerMode, setFarmerMode] = useState('signin')
  const [registering, setRegistering] = useState(false)
  const [registration, setRegistration] = useState({ full_name: '', mobile: '', ppb_number: '', district: '', mandal: '', village: '', land_acres: '' })
  const copy = (key) => t(language, key)

  function switchRole(nextRole) {
    setRole(nextRole)
    setIdentifier(nextRole === 'farmer' ? 'T05060123456' : 'TS-AGRI-8821')
    setOtp('')
    setOtpSent(false)
    setPassword('')
    setFarmerMode('signin')
    setMessage('')
    setError('')
  }

  function speakGuide() {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const text = role === 'farmer'
      ? `${copy('farmerLogin')}. ${copy('mobileOrPpb')}. ${copy('sendOtp')}. ${copy('otp')}. ${copy('verifyLogin')}.`
      : `${copy('officerLogin')}. ${copy('employeeId')}. ${copy('password')}. ${copy('officerSubmit')}.`
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = speechLocale(language)
    window.speechSynthesis.speak(utterance)
  }

  async function submitFarmer(event) {
    event.preventDefault()
    setError('')
    if (!otpSent) {
      setOtpSent(true)
      setMessage('otpSent')
      return
    }
    if (otp !== '1234') {
      setError('invalidOtp')
      return
    }
    setRegistering(true)
    try {
      const response = await fetch(`${API}/farmers/${encodeURIComponent(identifier.trim())}`)
      const profile = await response.json()
      if (!response.ok) {
        setError(response.status === 404 ? 'profileNotFound' : 'serviceUnavailable')
        return
      }
      onLogin({ role: 'farmer', identifier: identifier.trim(), ppb_number: profile.ppb_number, profile, language })
    } catch {
      setError('serviceUnavailable')
    } finally {
      setRegistering(false)
    }
  }

  async function submitRegistration(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setRegistering(true)
    const payload = {
      ...registration,
      preferred_shop: registration.mandal,
      land_acres: Number(registration.land_acres),
    }
    try {
      const response = await fetch(`${API}/farmers/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const profile = await response.json()
      if (!response.ok) {
        setError(response.status === 409 ? 'profileConflict' : 'registrationError')
        return
      }
      onLogin({ role: 'farmer', identifier: profile.ppb_number, ppb_number: profile.ppb_number, profile, language })
    } catch {
      setError('serviceUnavailable')
    } finally {
      setRegistering(false)
    }
  }

  function submitOfficer(event) {
    event.preventDefault()
    setError('')
    if (password !== 'admin' && password !== '1234') {
      setError('invalidOfficer')
      return
    }
    onLogin({ role: 'officer', identifier: identifier.trim(), language })
  }

  const inputClass = 'w-full rounded-xl border border-stone-200/90 bg-white/90 px-4 py-3.5 text-base text-slate-900 outline-none transition duration-300 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-700/10'

  return (
    <main className="min-h-screen px-4 py-6 text-slate-800 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl items-start gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
      <aside className="relative order-2 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#032B1D] via-[#064E3B] to-[#047857] p-5 text-white shadow-[0_24px_64px_-24px_rgba(4,57,39,.6)] lg:sticky lg:top-8 lg:order-1 lg:p-7">
        <div className="pointer-events-none absolute -right-12 top-12 size-64 rounded-full border-[38px] border-white/5" />
        <div className="relative"><div className="mb-5 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-emerald-200"><Sprout size={25} /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">KisanSathi AI</p><h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{copy('loginTitle')}</h1></div></div>
          <ImageSlot id="login-hero" aspectClass="aspect-[16/9]" badge={copy('loginPillPortal')} title={copy('loginImageTitle')} subtitle={copy('loginImageSubtitle')} overlay icon={Sprout} />
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">{copy('loginPillPortal')}</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">{copy('loginPillMrp')}</span><span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/90">{copy('loginPillLanguages')}</span></div>
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"><p className="mb-3 text-sm font-extrabold">{copy('loginGuideTitle')}</p><ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{['loginStepOne', 'loginStepTwo', 'loginStepThree'].map((key, index) => <li key={key} className="flex items-center gap-2 text-xs leading-5 text-emerald-50/90"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-300 font-extrabold text-emerald-950">{index + 1}</span>{copy(key)}</li>)}</ol></div>
        </div>
      </aside>
      <div className="order-1 mx-auto w-full max-w-2xl lg:order-2">
        <section className="glass-panel mb-5 rounded-3xl p-5 sm:p-7">
          <h2 className="mb-4 text-sm font-extrabold text-slate-800">{copy('chooseLanguage')}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LANGUAGES.map(({ code, label }) => <button key={code} type="button" onClick={() => onLanguageChange(code)} aria-pressed={language === code} className={`min-h-14 rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition ${language === code ? 'border-emerald-800 bg-emerald-800 text-white shadow-md' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-600 hover:bg-emerald-50'}`}>{label}</button>)}
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-[30px]">
          <header className="bg-gradient-to-r from-[#043927] to-[#065F46] px-6 py-7 text-white sm:px-9 sm:py-9">
            <div className="flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white"><Sprout size={29} /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">KisanSathi AI</p><h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{copy('loginTitle')}</h1></div></div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-100/80">{copy('loginSubtitle')}</p>
          </header>

          <div className="p-5 sm:p-9">
            <div className="mb-6 grid grid-cols-2 gap-3" role="tablist" aria-label={copy('chooseLanguage')}>
              <button type="button" role="tab" aria-selected={role === 'farmer'} onClick={() => switchRole('farmer')} className={`flex min-h-24 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${role === 'farmer' ? 'border-emerald-700 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><UserRound size={23} /></span><span><span className="block text-sm font-extrabold sm:text-base">{copy('farmerPortal')}</span><span className="mt-1 hidden text-xs leading-4 text-slate-500 sm:block">{copy('farmerLoginHint')}</span></span></button>
              <button type="button" role="tab" aria-selected={role === 'officer'} onClick={() => switchRole('officer')} className={`flex min-h-24 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${role === 'officer' ? 'border-emerald-700 bg-emerald-50 text-emerald-950 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><ShieldCheck size={23} /></span><span><span className="block text-sm font-extrabold sm:text-base">{copy('officerPortal')}</span><span className="mt-1 hidden text-xs leading-4 text-slate-500 sm:block">{copy('officerLoginHint')}</span></span></button>
            </div>

            {role === 'farmer' ? <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => { setFarmerMode('signin'); setError(''); setMessage('') }} className={`rounded-lg px-3 py-2.5 text-xs font-bold transition sm:text-sm ${farmerMode === 'signin' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600'}`}>{copy('signInExisting')}</button><button type="button" onClick={() => { setFarmerMode('register'); setOtpSent(false); setError(''); setMessage('') }} className={`rounded-lg px-3 py-2.5 text-xs font-bold transition sm:text-sm ${farmerMode === 'register' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600'}`}>{copy('firstTimeRegistration')}</button></div>
              {farmerMode === 'signin' ? <form onSubmit={submitFarmer} className="animate-fade-slide-up space-y-4"><p className="text-xs text-slate-500">{copy('existingFarmerHint')}</p><div><label htmlFor="login-identifier" className="mb-2 block text-sm font-bold text-slate-800">{copy('mobileOrPpb')}</label><input id="login-identifier" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={copy('mobileOrPpbPlaceholder')} className={inputClass} /></div>
                {!otpSent ? <button type="button" onClick={() => { setOtpSent(true); setMessage('otpSent') }} className="animate-shimmer-sweep w-full rounded-xl bg-[#043927] px-5 py-4 text-base font-extrabold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-[#065F46] hover:shadow-xl">{copy('sendOtp')}</button> : <><div><label htmlFor="login-otp" className="mb-2 block text-sm font-bold text-slate-800">{copy('otp')}</label><input id="login-otp" required inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder={copy('otpPlaceholder')} className={`${inputClass} tracking-[0.4em]`} /></div><button type="submit" disabled={registering} className="w-full rounded-xl bg-emerald-800 px-5 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-900 disabled:bg-slate-300">{registering ? copy('loadingProfile') : copy('verifyLogin')}</button></>}
                </form>
                : <form onSubmit={submitRegistration} className="animate-fade-slide-up space-y-3">
                  <div className="relative"><UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required value={registration.full_name} onChange={(event) => setRegistration({ ...registration, full_name: event.target.value })} placeholder={copy('fullName')} aria-label={copy('fullName')} className={`${inputClass} pl-10`} /></div>
                  <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">+91</span><input required type="tel" inputMode="numeric" pattern="[0-9]{10}" value={registration.mobile} onChange={(event) => setRegistration({ ...registration, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder={copy('mobileNumberPlaceholder')} className={`${inputClass} pl-12`} aria-label={copy('mobileNumber')} /></div>
                  <div className="relative"><BookOpen size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required value={registration.ppb_number} onChange={(event) => setRegistration({ ...registration, ppb_number: event.target.value })} placeholder={copy('ppbNumber')} aria-label={copy('ppbNumber')} className={`${inputClass} pl-10`} /></div>
                  <div className="grid gap-3 sm:grid-cols-2"><div className="relative"><MapPin size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select required value={registration.district} onChange={(event) => setRegistration({ ...registration, district: event.target.value })} className={`${inputClass} appearance-none pl-10`} aria-label={copy('district')}><option value="">{copy('districtPlaceholder')}</option>{['Rangareddy', 'Medak', 'Nalgonda', 'Karimnagar', 'Warangal'].map((district) => <option key={district}>{district}</option>)}</select></div><div className="relative"><MapPin size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select required value={registration.mandal} onChange={(event) => setRegistration({ ...registration, mandal: event.target.value })} className={`${inputClass} appearance-none pl-10`} aria-label={copy('mandalPlaceholder')}><option value="">{copy('mandalPlaceholder')}</option>{['Shadnagar', 'Chevella', 'Ibrahimpatnam', 'Maheshwaram'].map((mandal) => <option key={mandal}>{mandal}</option>)}</select></div></div>
                  <div className="relative"><MapPin size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required value={registration.village} onChange={(event) => setRegistration({ ...registration, village: event.target.value })} placeholder={copy('villagePlaceholder')} aria-label={copy('village')} className={`${inputClass} pl-10`} /></div>
                  <div className="relative"><Ruler size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="number" min="0" step="0.1" value={registration.land_acres} onChange={(event) => setRegistration({ ...registration, land_acres: event.target.value })} placeholder={copy('landSizePlaceholder')} className={`${inputClass} pl-10`} aria-label={copy('landSize')} /></div>
                  <button type="submit" disabled={registering} className="w-full rounded-xl bg-emerald-800 px-5 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-emerald-900 disabled:bg-slate-300">{registering ? copy('savingProfile') : copy('registerFarmer')}</button>
                </form>}
            </div> : <form onSubmit={submitOfficer} className="animate-fade-slide-up space-y-4">
              <div><label htmlFor="employee-id" className="mb-2 block text-sm font-bold text-slate-800">{copy('employeeId')}</label><input id="employee-id" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={copy('employeePlaceholder')} className={inputClass} /></div>
              <div><label htmlFor="officer-password" className="mb-2 block text-sm font-bold text-slate-800">{copy('password')}</label><input id="officer-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy('passwordPlaceholder')} className={inputClass} /></div>
              <button type="submit" className="animate-shimmer-sweep w-full rounded-xl bg-[#043927] px-5 py-4 text-base font-extrabold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-[#065F46] hover:shadow-xl">{copy('officerSubmit')}</button>
            </form>}

            <button type="button" onClick={speakGuide} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-800/20 bg-white px-4 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50"><Headphones size={19} />{copy('audioGuide')}</button>
            {message && <p role="status" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">{copy(message)}</p>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"><p>{copy(error)}</p>{farmerMode === 'register' && error === 'profileConflict' && <button type="button" onClick={() => { setFarmerMode('signin'); setIdentifier(registration.mobile); setOtp(''); setOtpSent(false); setError(''); setMessage('') }} className="mt-2 font-extrabold underline">{copy('signInWithRegisteredMobile')}</button>}</div>}
            <p className="mt-5 text-center text-xs leading-5 text-slate-500">{copy('loginHelp')}</p>
          </div>
        </section>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><Leaf size={14} className="text-emerald-700" />{copy('brandLine')}</p>
      </div>
      </div>
    </main>
  )
}

export default Login
