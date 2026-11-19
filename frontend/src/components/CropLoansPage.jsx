import { useEffect, useState } from 'react'
import { ArrowUpRight, Landmark, Sparkles, Sprout, Volume2 } from 'lucide-react'
import { cropLoansData, MAJOR_CROPS } from '../data/cropLoansData.js'
import { t } from '../i18n/translations.js'
import ImageSlot from './ImageSlot.jsx'

const SPEECH_LANGUAGES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', ml: 'ml-IN' }

function CropLoansPage({ language = 'en' }) {
  const copy = (key) => t(language, key)
  const [selectedCrop, setSelectedCrop] = useState('all')
  const [speakingId, setSpeakingId] = useState(null)
  const matchingSchemes = selectedCrop === 'all'
    ? cropLoansData
    : cropLoansData.filter((scheme) => scheme.crops.includes(selectedCrop))

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  function listenToScheme(scheme) {
    if (!('speechSynthesis' in window)) return
    if (speakingId === scheme.id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const cropNames = scheme.crops.map((crop) => copy(MAJOR_CROPS.find((item) => item.id === crop)?.labelKey)).join(', ')
    const utterance = new SpeechSynthesisUtterance(`${copy(scheme.titleKey)}. ${copy(scheme.descriptionKey)}. ${copy('cropCoverage')}: ${cropNames}. ${copy('schemeDisclaimer')}`)
    utterance.lang = SPEECH_LANGUAGES[language] || 'en-IN'
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    setSpeakingId(scheme.id)
    window.speechSynthesis.speak(utterance)
  }

  return <div className="agri-page space-y-6">
    <section className="grid items-center gap-5 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-[#043927] to-[#065F46] p-5 text-white shadow-[0_20px_52px_-28px_rgba(4,57,39,.55)] sm:p-7 lg:grid-cols-[1.1fr_.75fr]">
      <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-emerald-200"><Landmark size={24} /></span><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">{copy('cropLoansNav')}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{copy('cropLoansTitle')}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/85">{copy('cropLoansIntro')}</p></div></div>
      <ImageSlot id="loans-banner" aspectClass="aspect-[16/7]" badge={copy('cropLoansNav')} title={copy('cropLoansTitle')} subtitle={copy('cropLoansIntro')} overlay icon={Landmark} />
    </section>

    <section className="glass-panel rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Sprout size={19} className="text-emerald-700" />{copy('filterByCrop')}</h2><span aria-live="polite" className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">{matchingSchemes.length} {copy('schemesAvailable')}</span></div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={copy('filterByCrop')}>
        <CropFilter active={selectedCrop === 'all'} onClick={() => setSelectedCrop('all')} icon={Sparkles}>{copy('filterAll')}</CropFilter>
        {MAJOR_CROPS.map((crop) => <CropFilter key={crop.id} active={selectedCrop === crop.id} onClick={() => setSelectedCrop(crop.id)} icon={Sprout}>{copy(crop.labelKey)}</CropFilter>)}
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      {matchingSchemes.map((scheme) => <article key={scheme.id} className="group rounded-3xl border border-stone-200/80 bg-white/90 p-5 shadow-[0_14px_40px_-14px_rgba(4,57,39,0.14)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
        <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Landmark size={19} /></span><div className="min-w-0 flex-1"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{copy(scheme.kindKey)}</span><h2 className="mt-2 text-lg font-bold leading-snug text-slate-900">{copy(scheme.titleKey)}</h2></div><button type="button" onClick={() => listenToScheme(scheme)} aria-label={`${copy(speakingId === scheme.id ? 'listeningScheme' : 'listenScheme')}: ${copy(scheme.titleKey)}`} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${speakingId === scheme.id ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'}`}><Volume2 size={15} />{copy(speakingId === scheme.id ? 'listeningScheme' : 'listenScheme')}</button></div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{copy(scheme.descriptionKey)}</p>
        <div className="mt-5"><p className="mb-2 text-xs font-bold text-slate-700">{copy('cropCoverage')}</p><div className="flex flex-wrap gap-1.5">{scheme.crops.map((cropId) => { const crop = MAJOR_CROPS.find((item) => item.id === cropId); return <span key={cropId} className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">{copy(crop.labelKey)}</span> })}</div></div>
        <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950">{copy('officialSource')}: {copy(scheme.sourceLabelKey)}<ArrowUpRight size={14} /></a>
      </article>)}
    </div>
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">{copy('schemeDisclaimer')}</p>
  </div>
}

function CropFilter({ active, onClick, children, icon: Icon }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-300 ${active ? 'border-[#043927] bg-[#043927] text-white shadow-md shadow-emerald-950/15' : 'border-stone-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50'}`}><Icon size={15} />{children}</button>
}

export default CropLoansPage
