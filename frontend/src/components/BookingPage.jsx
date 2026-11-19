import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, Mic, MicOff, QrCode, Sparkles } from 'lucide-react'
import { speechLocale, t } from '../i18n/translations.js'
import { createSpeechRecognition } from '../utils/speechRecognition.js'
import ImageSlot from './ImageSlot.jsx'

const API = 'http://localhost:8000'

function BookingPage({ language = 'en', ppbNumber = 'T05060123456', profile = null, onProfileUpdate, onNavigateHistory }) {
  const copy = (key) => t(language, key)
  const speechLang = speechLocale(language)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [steps, setSteps] = useState([])
  const [farmerProfile, setFarmerProfile] = useState(profile)
  const [listening, setListening] = useState(false)
  const [transcriptPreview, setTranscriptPreview] = useState('')
  const recognitionRef = useRef(null)
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10'
  const labelClass = 'mb-1.5 block text-xs font-bold text-slate-700'

  useEffect(() => { if (profile) setFarmerProfile(profile) }, [profile])
  useEffect(() => () => recognitionRef.current?.abort(), [])
  useEffect(() => {
    let active = true
    fetch(`${API}/farmers/${encodeURIComponent(ppbNumber)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((saved) => { if (active && saved) { setFarmerProfile(saved); onProfileUpdate?.(saved) } })
      .catch(() => {})
    return () => { active = false }
  }, [ppbNumber])

  async function refreshProfile() {
    try {
      const response = await fetch(`${API}/farmers/${encodeURIComponent(ppbNumber)}`)
      if (!response.ok) return
      const saved = await response.json()
      setFarmerProfile(saved)
      onProfileUpdate?.(saved)
    } catch { /* Retain the last profile while the API is unavailable. */ }
  }

  async function submitBooking(event) {
    event.preventDefault()
    setLoading(true); setError(''); setResult(null); setSteps([])
    try {
      const response = await fetch(`${API}/agent-book?live=true`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, ppb_number: ppbNumber, language }),
      })
      const started = await response.json()
      if (!response.ok || !started.job_id) throw new Error(started.detail || copy('bookingRequestFailed'))
      for (let attempt = 0; attempt < 300; attempt += 1) {
        const statusResponse = await fetch(`${API}/agent-book/status/${started.job_id}`)
        const status = await statusResponse.json()
        if (!statusResponse.ok) throw new Error(status.detail || copy('bookingRequestFailed'))
        setSteps(status.steps || [])
        if (status.status === 'success' || status.status === 'error') {
          if (status.status === 'success') await refreshProfile()
          setResult(status.result || {
            intent: status.intent || started.intent,
            booking_result: { status: 'error', message: status.error || '' },
            confirmation_en: '', confirmation_te: '', confirmation_localized: copy('bookingFailed'),
          })
          return
        }
        await new Promise((resolve) => window.setTimeout(resolve, 650))
      }
      throw new Error(copy('bookingRequestFailed'))
    } catch (requestError) { setError(requestError.message || copy('bookingRequestFailed')) }
    finally { setLoading(false) }
  }

  function dictate() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* Recognition may already be stopping. */ }
      setListening(false)
      return
    }
    setError('')
    setTranscriptPreview('')
    const startingText = message.trim()
    try {
      recognitionRef.current = createSpeechRecognition(speechLang, {
        onTranscript: (finalTranscript, interimTranscript) => {
          if (finalTranscript) setMessage(startingText ? `${startingText} ${finalTranscript}` : finalTranscript)
          setTranscriptPreview(interimTranscript)
        },
        onError: (key) => { setError(copy(key)); setListening(false); recognitionRef.current = null },
        onEnd: () => { setListening(false); setTranscriptPreview(''); recognitionRef.current = null },
      })
      setListening(true)
    } catch (error) {
      setError(copy(error.message || 'micUnavailable'))
      setListening(false)
    }
  }

  function resetAgent() { setResult(null); setSteps([]); setError(''); setMessage('') }

  return <div className="agri-page space-y-6">
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="glass-panel rounded-3xl p-5 sm:p-7">
        <div className="mb-6 flex gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Sparkles size={21} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">{copy('bookingEyebrow')}</p><h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{copy('bookingTitle')}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{copy('bookingDesc')}</p></div></div>
        <form onSubmit={submitBooking} className="space-y-4">
          <div><label htmlFor="booking-prompt" className={labelClass}>{copy('bookingRequest')}</label><div className="relative"><textarea id="booking-prompt" rows="3" required value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy('bookingPlaceholder')} className={`${inputClass} resize-y pr-12`} /><button type="button" onClick={dictate} aria-pressed={listening} title={listening ? copy('listening') : copy('speakQuery')} className={`absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-lg ${listening ? 'animate-pulse-ring bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>{listening ? <MicOff size={17} /> : <Mic size={17} />}</button></div>{listening && <p aria-live="polite" className="mt-2 text-xs text-slate-500">{transcriptPreview || copy('listeningHelp')}</p>}<p className="mt-2 text-xs text-slate-500">{copy('routedShopHint').replace('{shop}', farmerProfile?.preferred_shop || farmerProfile?.mandal || 'Shadnagar')}</p></div>
          <div className="flex flex-wrap items-center gap-2"><span className="self-center text-[11px] font-bold uppercase tracking-wide text-slate-400">{copy('examples')}</span>{[['productUrea', 'Urea'], ['productDap', 'DAP'], ['productNpk', 'NPK 10-26-26'], ['productSsp', 'SSP']].map(([key, product]) => <button key={key} type="button" onClick={() => setMessage(copy('bookProductPrompt').replace('{product}', product))} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-950 transition duration-300 hover:-translate-y-0.5 hover:bg-amber-100">{copy(key)}</button>)}</div>
          <div><label htmlFor="booking-ppb" className={labelClass}>{copy('bookingPpb')}</label><input id="booking-ppb" value={ppbNumber} readOnly className={`${inputClass} bg-slate-50`} /></div>
          <button type="submit" disabled={loading || !message.trim()} className="animate-shimmer-sweep inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#043927] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#065F46] hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300">{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}{loading ? copy('agentNavigating') : copy('startAgent')}</button>
        </form>
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      </section>
      <section className="glass-panel min-h-[480px] rounded-3xl p-5 sm:p-7">
        {!loading && !result && <ImageSlot id="booking-agent-hero" aspectClass="aspect-[16/9]" badge={copy('agentProgressTitle')} title={copy('bookingTitle')} subtitle={copy('bookingDesc')} />}
        {(loading || steps.length > 0) && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5"><div className="mb-4 flex items-center gap-3"><span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white text-emerald-800"><LoaderCircle size={19} className={loading ? 'animate-spin' : ''} />{loading && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />}</span><p className="text-sm font-extrabold text-emerald-950">{copy('agentProgressTitle')}</p></div>{steps.length === 0 && <p className="mb-3 text-xs font-semibold text-emerald-800">{copy('agentPreparing')}</p>}<ol className="space-y-2.5">{[['navigating', 'stepNavigating'], ['filling', 'stepFilling'], ['selecting', 'stepSelecting'], ['confirming', 'stepConfirming']].map(([step, label]) => { const latest = [...steps].reverse().find((item) => item.step === step); const complete = latest?.status === 'completed'; const active = latest?.status === 'active'; return <li key={step} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'bg-white font-bold text-emerald-950 shadow-sm' : complete ? 'text-emerald-900' : 'text-slate-500'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full ${complete ? 'bg-emerald-700 text-white' : active ? 'animate-pulse-ring bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>{active ? <LoaderCircle size={14} className="animate-spin" /> : complete ? <CheckCircle2 size={14} /> : <span className="size-1.5 rounded-full bg-current" />}</span>{copy(label)}</li> })}</ol></div>}
        {result && <div className="mt-5 space-y-4"><div className={`rounded-2xl border p-4 ${result.booking_result?.status === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">{result.booking_result?.status === 'success' ? <CheckCircle2 size={18} className="text-emerald-700" /> : <AlertTriangle size={18} className="text-rose-700" />}{copy(result.booking_result?.status === 'success' ? 'bookingCompleted' : 'bookingFailed')}</p><p className="mt-2 text-sm leading-6 text-slate-700">{result.confirmation_localized || result.confirmation_en}</p>{result.intent && <div className="mt-3 flex flex-wrap gap-2">{[[result.intent.fertilizer_type, copy('fertilizer')], [`${result.intent.bags} ${copy('bags')}`, copy('quantity')], [result.intent.shop_keyword, copy('preferredShop')]].map(([value, label]) => <span key={label} className="rounded-lg border border-white bg-white/80 px-2.5 py-1.5 text-xs text-slate-600"><b className="text-slate-900">{value}</b> · {label}</span>)}</div>}</div>{result.booking_result?.status === 'success' && <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-slate-900"><QrCode size={17} className="text-emerald-700" />{copy('bookingReceipt')}</p><a href="/govt-portal" className="text-xs font-bold text-emerald-800 hover:underline">{copy('viewPortal')} →</a></div><p className="mb-2 text-xs text-slate-500">{copy('selectedShop')}: <span className="font-semibold text-slate-800">{result.booking_result.shop_selected}</span></p><pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-xs leading-5 text-slate-700">{result.booking_result.receipt_text}</pre><button type="button" onClick={onNavigateHistory} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-900">{copy('viewBookingHistory')}<ArrowRight size={16} /></button></div>}<button type="button" onClick={resetAgent} className="inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-900">{copy('resetAgent')}</button></div>}
      </section>
    </div>
  </div>
}

export default BookingPage
