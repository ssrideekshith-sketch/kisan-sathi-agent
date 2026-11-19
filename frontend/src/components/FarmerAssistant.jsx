import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, CircleDollarSign, Copy, ImagePlus, LoaderCircle, Mic, MicOff, Phone, Send, ShieldCheck, Volume2 } from 'lucide-react'
import { speechLocale, t } from '../i18n/translations.js'
import { createSpeechRecognition } from '../utils/speechRecognition.js'
import ImageSlot from './ImageSlot.jsx'

const API = 'http://localhost:8000'

function CardHeader({ icon: Icon, eyebrow, title, description }) {
  return <div className="mb-6 flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={21} /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">{eyebrow}</p><h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{description}</p></div></div>
}

function ErrorMessage({ children }) {
  return children ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{children}</p> : null
}

function FarmerAssistant({ language = 'en', ppbNumber = 'T05060123456', profile = null, onProfileUpdate }) {
  const copy = (key) => t(language, key)
  const speechLang = speechLocale(language)
  const [fertilizer, setFertilizer] = useState('')
  const [quotedPrice, setQuotedPrice] = useState('')
  const [image, setImage] = useState(null)
  const [checking, setChecking] = useState(false)
  const [priceResult, setPriceResult] = useState(null)
  const [priceError, setPriceError] = useState('')
  const [complaint, setComplaint] = useState({ farmer_name: profile?.full_name || '', ppb_number: ppbNumber, shop_name: profile?.preferred_shop || profile?.mandal || '', district: profile?.district || '' })
  const [submittingComplaint, setSubmittingComplaint] = useState(false)
  const [complaintError, setComplaintError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [copiedHelpline, setCopiedHelpline] = useState('')
  const [priceListening, setPriceListening] = useState(false)
  const [priceTranscriptPreview, setPriceTranscriptPreview] = useState('')
  const [farmerProfile, setFarmerProfile] = useState(profile)
  const recognitionRef = useRef(null)
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10'
  const labelClass = 'mb-1.5 block text-xs font-bold text-slate-700'

  useEffect(() => {
    if (profile) setFarmerProfile(profile)
  }, [profile])

  useEffect(() => {
    let isActive = true
    fetch(`${API}/farmers/${encodeURIComponent(ppbNumber)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((savedProfile) => {
        if (!isActive || !savedProfile) return
        setFarmerProfile(savedProfile)
        onProfileUpdate?.(savedProfile)
      })
      .catch(() => {})
    return () => { isActive = false }
  }, [ppbNumber])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  async function checkPrice(event) {
    event.preventDefault()
    setChecking(true); setPriceError(''); setPriceResult(null); setTicket(null)
    const data = new FormData()
    if (image) data.append('file', image)
    if (fertilizer.trim()) data.append('fertilizer_text', fertilizer.trim())
    if (quotedPrice !== '') data.append('quoted_price', quotedPrice)
    data.append('language', language)
    try {
      const response = await fetch(`${API}/verify-price`, { method: 'POST', body: data })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.detail || copy('priceCheckFailed'))
      setPriceResult(payload)
      if (payload.is_overcharged) setComplaint({ farmer_name: farmerProfile?.full_name || '', ppb_number: ppbNumber, shop_name: farmerProfile?.preferred_shop || farmerProfile?.mandal || '', district: farmerProfile?.district || '' })
    } catch {
      setPriceError(copy('priceCheckFailed'))
    } finally { setChecking(false) }
  }

  async function fileComplaint(event) {
    event.preventDefault()
    if (!priceResult) return
    setSubmittingComplaint(true); setComplaintError(''); setTicket(null)
    const payload = {
      ...complaint,
      farmer_name: farmerProfile?.full_name || complaint.farmer_name,
      ppb_number: farmerProfile?.ppb_number || ppbNumber || complaint.ppb_number,
      shop_name: farmerProfile?.preferred_shop || farmerProfile?.mandal || complaint.shop_name,
      district: farmerProfile?.district || complaint.district,
      fertilizer_name: priceResult.fertilizer_name,
      official_mrp: Number(priceResult.official_mrp),
      charged_price: Number(priceResult.quoted_price),
      overcharge_amount: Number(priceResult.overcharge_amount),
    }
    try {
      const response = await fetch(`${API}/file-complaint`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saved = await response.json()
      if (!response.ok) throw new Error(saved.detail || copy('complaintFailed'))
      setTicket(saved)
    } catch { setComplaintError(copy('complaintFailed')) }
    finally { setSubmittingComplaint(false) }
  }

  function listenToResult() {
    if (!('speechSynthesis' in window) || !priceResult) return
    window.speechSynthesis.cancel()
    const text = priceResult.explanation_localized || (language === 'te' ? priceResult.explanation_te : priceResult.explanation_en)
    const speech = new SpeechSynthesisUtterance(text || copy(priceResult.is_overcharged ? 'overcharged' : 'noOvercharge'))
    speech.lang = speechLang
    window.speechSynthesis.speak(speech)
  }

  async function copyHelpline(number) {
    try {
      await navigator.clipboard.writeText(number)
      setCopiedHelpline(number)
      window.setTimeout(() => setCopiedHelpline(''), 1800)
    } catch {
      setPriceError(copy('copyHelplineFailed'))
    }
  }

  function focusComplaintForm() {
    const form = document.getElementById('complaint-form')
    form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    form?.querySelector('button[type="submit"]')?.focus({ preventScroll: true })
  }

  function dictate() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* Recognition may already be stopping. */ }
      setPriceListening(false)
      return
    }
    setPriceError('')
    setPriceTranscriptPreview('')
    const startingText = fertilizer.trim()
    try {
      recognitionRef.current = createSpeechRecognition(speechLang, {
        onTranscript: (finalTranscript, interimTranscript) => {
          if (finalTranscript) setFertilizer(startingText ? `${startingText} ${finalTranscript}` : finalTranscript)
          setPriceTranscriptPreview(interimTranscript)
        },
        onError: (key) => { setPriceError(copy(key)); setPriceListening(false); recognitionRef.current = null },
        onEnd: () => { setPriceListening(false); setPriceTranscriptPreview(''); recognitionRef.current = null },
      })
      setPriceListening(true)
    } catch (error) {
      setPriceError(copy(error.message || 'micUnavailable'))
      setPriceListening(false)
    }
  }

  return (
    <div className="agri-page space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-950 to-emerald-800 p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">{copy('farmerPortal')}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">{copy('welcomeFarmer').replace('{name}', farmerProfile?.full_name || '')}</h2><p className="mt-2 text-sm text-emerald-100/80">{copy('ppbNumber')}: <span className="font-mono font-bold text-white">{farmerProfile?.ppb_number || ppbNumber}</span></p></div><div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:min-w-[420px]"><ProfileFact label={copy('village')} value={farmerProfile?.village} /><ProfileFact label={copy('mandal')} value={farmerProfile?.mandal} /><ProfileFact label={copy('district')} value={farmerProfile?.district} /><ProfileFact label={copy('landSize')} value={farmerProfile?.land_acres != null ? `${farmerProfile.land_acres} ${copy('acres')}` : ''} /></div></div>
        {farmerProfile?.preferred_shop && <p className="mt-5 w-fit rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-emerald-50">{copy('registeredShop')}: <b>{farmerProfile.preferred_shop}</b></p>}
      </section>
      <section className="glass-panel grid gap-5 rounded-3xl p-5 sm:p-7 lg:grid-cols-2">
        <div className="lg:col-span-2"><CardHeader icon={CircleDollarSign} eyebrow={copy('farmerEyebrow')} title={copy('scannerTitle')} description={copy('scannerDesc')} /></div>
        <div className="min-w-0 space-y-4">
          <ImageSlot id="fertilizer-sample" aspectClass="aspect-[16/6]" badge={copy('scannerTitle')} title={copy('uploadImage')} subtitle={copy('imageHelp')} />
        <form onSubmit={checkPrice} className="space-y-4">
          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-4 transition hover:border-emerald-400 hover:bg-emerald-50">
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => setImage(event.target.files?.[0] || null)} />
            <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-emerald-800 shadow-sm"><ImagePlus size={19} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{image ? `${copy('imageSelected')}: ${image.name}` : copy('uploadImage')}</span><span className="mt-0.5 block text-xs text-slate-500">{copy('imageHelp')}</span></span><ArrowRight size={16} className="text-emerald-700" /></span>
          </label>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400"><span className="h-px flex-1 bg-slate-200" />{copy('orDetails')}<span className="h-px flex-1 bg-slate-200" /></div>
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]"><div><label className={labelClass} htmlFor="fertilizer-name">{copy('fertilizerName')}</label><input id="fertilizer-name" value={fertilizer} onChange={(event) => setFertilizer(event.target.value)} placeholder={copy('fertilizerPlaceholder')} className={inputClass} /></div><div><label className={labelClass} htmlFor="quoted-price">{copy('shopQuote')}</label><input id="quoted-price" type="number" min="0" step="0.01" value={quotedPrice} onChange={(event) => setQuotedPrice(event.target.value)} placeholder={copy('quotePlaceholder')} className={inputClass} /></div></div>
          <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={dictate} aria-pressed={priceListening} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${priceListening ? 'animate-pulse-ring border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{priceListening ? <MicOff size={16} /> : <Mic size={16} />}{priceListening ? copy('listening') : copy('speakQuery')}</button><button type="submit" disabled={checking || (!image && !fertilizer.trim() && quotedPrice === '')} className="animate-shimmer-sweep inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#043927] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#065F46] hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300">{checking ? <LoaderCircle className="animate-spin" size={17} /> : <ShieldCheck size={17} />}{checking ? copy('checkingPrice') : copy('checkPrice')}</button></div>
          {priceListening && <p aria-live="polite" className="text-xs text-slate-500">{priceTranscriptPreview || copy('listeningHelp')}</p>}
        </form>
        <ErrorMessage>{priceError}</ErrorMessage>
        </div>

        <div className="min-w-0 space-y-4">
        {!priceResult && <ImageSlot id="price-shield" aspectClass="aspect-[16/6]" badge={copy('scannerTitle')} title={copy('fairPrice')} subtitle={copy('scannerDesc')} />}

        {priceResult && <div className={`mt-6 overflow-hidden rounded-2xl border ${priceResult.is_overcharged ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className={`flex items-start gap-3 px-4 py-4 ${priceResult.is_overcharged ? 'bg-rose-100/70' : 'bg-emerald-100/70'}`}>{priceResult.is_overcharged ? <AlertTriangle className="mt-0.5 shrink-0 text-rose-700" size={21} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={21} />}<div className="min-w-0 flex-1"><p className={`font-extrabold ${priceResult.is_overcharged ? 'text-rose-900' : 'text-emerald-900'}`}>{copy(priceResult.is_overcharged ? 'overcharged' : 'fairPrice')}</p><p className="mt-0.5 text-sm font-semibold text-slate-700">{priceResult.fertilizer_name}</p></div><button type="button" onClick={listenToResult} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/75 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-white"><Volume2 size={15} />{copy('listen')}</button></div>
          <div className="grid grid-cols-3 gap-2 px-4 py-4"><Metric label={copy(priceResult.mrp_status === 'market_estimate' ? 'typicalMarketPrice' : 'officialMrp')} value={priceResult.official_mrp} /><Metric label={copy('quotedPrice')} value={priceResult.quoted_price} /><Metric label={copy('overcharge')} value={priceResult.overcharge_amount} alert={priceResult.is_overcharged} /></div>
          <div className="px-4 pb-4 text-sm leading-6 text-slate-700"><p lang={language}><span className="mr-1 font-bold text-slate-900">{copy('explanationLabel')}:</span>{language === 'te' ? priceResult.explanation_te : language === 'en' ? priceResult.explanation_en : priceResult.explanation_localized || priceResult.explanation_en}</p></div>
        </div>}

        <aside className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" aria-label={copy('helplineTitle')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold text-emerald-950">{copy('helplineTitle')}</h3><p className="mt-1 text-xs leading-5 text-emerald-900/80">{copy('helplineHelp')}</p></div>{priceResult?.is_overcharged && <button type="button" onClick={focusComplaintForm} className="shrink-0 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900">{copy('openComplaint')}</button>}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">{[
            [copy('callKisanCentre'), '1800-180-1551'],
            [copy('callConsumerHelpline'), '1915'],
            [copy('callConsumerHelpline'), '1800-11-4000'],
          ].map(([name, number]) => <div key={number} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-500">{name}</p><a className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-900 underline decoration-emerald-300 underline-offset-2" href={`tel:${number}`}><Phone size={13} />{number}</a></div><button type="button" onClick={() => copyHelpline(number)} aria-label={`${copy(copiedHelpline === number ? 'numberCopied' : 'copyNumber')} ${number}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-2 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100">{copiedHelpline === number ? <Check size={14} /> : <Copy size={14} />}{copy(copiedHelpline === number ? 'numberCopied' : 'copyNumber')}</button></div>)}
          </div>
        </aside>

        {priceResult?.is_overcharged && <form id="complaint-form" tabIndex={-1} onSubmit={fileComplaint} className="rounded-2xl border-2 border-rose-200 bg-white p-4 shadow-[0_14px_40px_-18px_rgba(127,29,29,.18)] animate-fade-slide-up sm:p-5">
          <div className="mb-4 flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle size={18} /></span><div><h3 className="font-bold text-slate-900">{copy('reportTitle')}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy('reportDesc')}</p></div></div>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-rose-50/70 p-3 text-xs"><p className="col-span-2 font-bold text-slate-800">{priceResult.fertilizer_name}</p><p className="text-slate-600">{copy(priceResult.mrp_status === 'market_estimate' ? 'typicalMarketPrice' : 'officialMrp')} <b className="text-slate-900">₹{Number(priceResult.official_mrp).toFixed(2)}</b></p><p className="text-slate-600">{copy('charged')} <b className="text-rose-800">₹{Number(priceResult.quoted_price).toFixed(2)}</b></p><p className="col-span-2 text-slate-600">{copy('overcharge')} <b className="text-rose-800">₹{Number(priceResult.overcharge_amount).toFixed(2)}</b></p></div>
          <div className="grid gap-3 sm:grid-cols-2">{[['farmer_name', 'farmerName', 'farmerNamePlaceholder'], ['ppb_number', 'ppbNumber', 'ppbPlaceholder'], ['shop_name', 'shopName', 'shopPlaceholder'], ['district', 'district', 'districtPlaceholder']].map(([key, label, placeholder]) => {
            const values = { farmer_name: farmerProfile?.full_name || complaint.farmer_name, ppb_number: farmerProfile?.ppb_number || ppbNumber, shop_name: farmerProfile?.preferred_shop || farmerProfile?.mandal || complaint.shop_name, district: farmerProfile?.district || complaint.district }
            return <div key={key}><label className={labelClass} htmlFor={`complaint-${key}`}>{copy(label)}</label><input id={`complaint-${key}`} required value={values[key]} readOnly placeholder={copy(placeholder)} className={`${inputClass} bg-slate-50`} /></div>
          })}</div>
          <button type="submit" disabled={submittingComplaint} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-800 disabled:bg-slate-300">{submittingComplaint ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{submittingComplaint ? copy('submittingComplaint') : copy('submitComplaint')}</button>
          <ErrorMessage>{complaintError}</ErrorMessage>
          {ticket && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-xs font-semibold text-emerald-800">{copy('complaintSuccess')}</p><p className="mt-1 font-mono text-lg font-extrabold text-emerald-950">{ticket.id}</p></div>}
        </form>}
        </div>
      </section>

    </div>
  )
}

function ProfileFact({ label, value }) {
  return <div><p className="text-[11px] font-semibold text-emerald-200">{label}</p><p className="mt-0.5 font-bold text-white">{value || '—'}</p></div>
}

function Metric({ label, value, alert = false }) {
  return <div className="rounded-xl border border-white/80 bg-white/80 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-base font-extrabold tabular-nums ${alert ? 'text-rose-700' : 'text-slate-900'}`}>₹{Number(value || 0).toFixed(2)}</p></div>
}

export default FarmerAssistant
