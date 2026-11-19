import { useEffect, useState } from 'react'
import { Globe2, Leaf, LogOut, Sprout } from 'lucide-react'
import GovtPortal from './GovtPortal.jsx'
import FarmerAssistant from './components/FarmerAssistant.jsx'
import BookingPage from './components/BookingPage.jsx'
import BookingHistoryPage from './components/BookingHistoryPage.jsx'
import CropLoansPage from './components/CropLoansPage.jsx'
import ImageSlot from './components/ImageSlot.jsx'
import Login from './components/Login.jsx'
import OfficerDashboard from './components/OfficerDashboard.jsx'
import PermissionModal from './components/PermissionModal.jsx'
import { LANGUAGES, t } from './i18n/translations.js'

const SESSION_KEY = 'kisansathi-session'
const LANGUAGE_KEY = 'kisansathi-language'
const CONSENT_KEY = 'kisansathi-permissions-consent'

function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return value && ['farmer', 'officer'].includes(value.role) ? value : null
  } catch {
    return null
  }
}

function MainApp() {
  const [session, setSession] = useState(readSession)
  const [hasConsent, setHasConsent] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY) === 'accepted' } catch { return false }
  })
  const [language, setLanguage] = useState(() => {
    const stored = sessionStorageSafeLanguage()
    return session?.language || stored
  })
  const [farmerView, setFarmerView] = useState('assistant')
  const copy = (key) => t(language, key)

  useEffect(() => {
    document.documentElement.lang = language || 'en'
  }, [language])

  function chooseLanguage(code) {
    setLanguage(code)
    try {
      localStorage.setItem(LANGUAGE_KEY, code)
      if (session) {
        const updated = { ...session, language: code }
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
        setSession(updated)
      }
    } catch { /* The app remains usable when browser storage is disabled. */ }
  }

  function login(user) {
    const nextSession = { role: user.role, identifier: user.identifier, language: user.language, ...(user.ppb_number ? { ppb_number: user.ppb_number } : {}), ...(user.profile ? { profile: user.profile } : {}) }
    setSession(nextSession)
    setHasConsent(false)
    setLanguage(user.language)
    setFarmerView('assistant')
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      localStorage.setItem(LANGUAGE_KEY, user.language)
      localStorage.removeItem(CONSENT_KEY)
    } catch { /* In-memory session remains active for this page. */ }
  }

  function acceptPermissions() {
    setHasConsent(true)
    try { localStorage.setItem(CONSENT_KEY, 'accepted') } catch { /* Keep consent for this page session. */ }
  }

  function updateFarmerProfile(profile) {
    setSession((current) => {
      if (!current) return current
      const updated = { ...current, profile }
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(updated)) } catch { /* Keep the updated profile in memory. */ }
      return updated
    })
  }

  function logout() {
    setSession(null)
    setHasConsent(false)
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(CONSENT_KEY)
    } catch { /* Ignore disabled storage. */ }
  }

  if (!session) return <Login language={language} onLanguageChange={chooseLanguage} onLogin={login} />
  if (!hasConsent) return <PermissionModal language={language} onLanguageChange={chooseLanguage} onAccept={acceptPermissions} />

  return (
    <div className="min-h-screen bg-transparent text-slate-800">
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/85 shadow-[0_8px_28px_-18px_rgba(4,57,39,0.32)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
          <a href="/" className="flex items-center gap-3" aria-label="KisanSathi AI"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-800 text-white shadow-sm"><Sprout size={23} /></span><span><span className="block text-lg font-extrabold leading-tight tracking-tight text-slate-900">KisanSathi <span className="text-emerald-700">AI</span></span><span className="block text-[11px] font-medium tracking-wide text-slate-500">{copy('brandLine')}</span></span></a>
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {session.role === 'farmer' && <div className="order-last flex w-full gap-2 sm:order-none sm:w-auto">
              {[
                ['assistant', 'priceProtectionNav'],
                ['booking', 'bookingAgentNav'],
                ['history', 'bookingHistoryNav'],
                ['schemes', 'cropLoansNav'],
              ].map(([view, label]) => <button key={view} type="button" onClick={() => setFarmerView(view)} aria-current={farmerView === view ? 'page' : undefined} className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition-all duration-300 sm:flex-none ${farmerView === view ? 'bg-[#043927] text-white shadow-md shadow-emerald-950/15' : 'border border-stone-200/80 bg-white/75 text-slate-700 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50'}`}>{copy(label)}</button>)}
            </div>}
            <a href="/govt-portal" className="hidden rounded-lg border border-emerald-800/20 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50 sm:inline-flex">{copy('portalLink')}</a>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"><Globe2 size={15} className="text-slate-500" /><span className="sr-only">{copy('language')}</span><select aria-label={copy('language')} value={language} onChange={(event) => chooseLanguage(event.target.value)} className="max-w-28 bg-transparent text-xs font-bold text-slate-700 outline-none sm:max-w-none">{LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
            <span className="hidden max-w-40 truncate rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 md:inline">{session.identifier}</span>
            <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"><LogOut size={14} />{copy('logout')}</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-7 sm:px-7 sm:pt-10">
        <section className="relative mb-7 grid items-center gap-6 overflow-hidden rounded-[30px] border border-emerald-900/10 bg-gradient-to-br from-[#032B1D] via-[#064E3B] to-[#047857] px-6 py-7 text-white shadow-[0_20px_52px_-28px_rgba(4,57,39,.65)] sm:px-9 sm:py-9 lg:grid-cols-[1.2fr_.8fr]">
          <div className="pointer-events-none absolute -right-8 -top-24 size-72 rounded-full border-[36px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"><Leaf size={14} />{copy('brandLine')}</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{session.role === 'farmer' ? copy('welcomeFarmer').replace('{name}', session.profile?.full_name || '') : copy('welcome')}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/75">{copy('welcomeText')}</p></div><a href="/govt-portal" className="inline-flex w-fit rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:hidden">{copy('portalLink')} →</a></div>
          {session.role === 'farmer' && <ImageSlot id="farmer-banner" aspectClass="aspect-[16/8] lg:aspect-[16/9]" badge={copy('farmerPortal')} title={copy('welcome')} subtitle={session.profile?.mandal || copy('welcomeText')} overlay icon={Sprout} />}
        </section>
        {session.role === 'farmer'
          ? farmerView === 'assistant'
            ? <FarmerAssistant language={language} ppbNumber={session.ppb_number || session.identifier} profile={session.profile} onProfileUpdate={updateFarmerProfile} />
            : farmerView === 'booking'
              ? <BookingPage language={language} ppbNumber={session.ppb_number || session.identifier} profile={session.profile} onProfileUpdate={updateFarmerProfile} onNavigateHistory={() => setFarmerView('history')} />
              : farmerView === 'history'
                ? <BookingHistoryPage language={language} identifier={session.ppb_number || session.identifier} profile={session.profile} onProfileUpdate={updateFarmerProfile} onNavigateBooking={() => setFarmerView('booking')} />
                : <CropLoansPage language={language} />
          : <OfficerDashboard language={language} />}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">KisanSathi AI · {copy('footer')}</footer>
    </div>
  )
}

function sessionStorageSafeLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    return LANGUAGES.some((item) => item.code === stored) ? stored : 'en'
  } catch {
    return 'en'
  }
}

function App() {
  if (window.location.pathname === '/govt-portal') return <GovtPortal />
  return <MainApp />
}

export default App
