import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Building2, CalendarClock, IndianRupee, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { t } from '../i18n/translations.js'
import ImageSlot from './ImageSlot.jsx'

const API = 'http://localhost:8000'
const locales = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', ml: 'ml-IN' }

function formatDate(value, language) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locales[language] || 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function StatCard({ icon: Icon, label, value, tone = 'green', hint }) {
  const tones = { green: 'bg-emerald-50 text-emerald-800 ring-emerald-100', amber: 'bg-amber-50 text-amber-800 ring-amber-100', red: 'bg-rose-50 text-rose-800 ring-rose-100' }
  return <div className="glass-panel rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-500">{hint}</p></div><span className={`grid size-10 place-items-center rounded-xl ring-1 ${tones[tone]}`}><Icon size={19} /></span></div></div>
}

function OfficerDashboard({ language = 'en' }) {
  const copy = (key) => t(language, key)
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('all')

  const loadComplaints = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`${API}/complaints`)
      const payload = await response.json()
      if (!response.ok) throw new Error(copy('serviceUnavailable'))
      setComplaints(Array.isArray(payload) ? payload : [])
    } catch { setError(copy('serviceUnavailable')) }
    finally { setLoading(false) }
  }, [language])

  useEffect(() => { loadComplaints() }, [loadComplaints])
  const totalOvercharge = complaints.reduce((total, item) => total + (Number(item.overcharge_amount) || 0), 0)
  const districts = [...new Set(complaints.map((item) => item.district?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const filteredComplaints = complaints.filter((item) => {
    const matchesDistrict = selectedDistrict === 'all' || item.district === selectedDistrict
    const searchable = [item.id, item.farmer_name, item.ppb_number, item.shop_name, item.district, item.fertilizer_name].join(' ').toLowerCase()
    return matchesDistrict && searchable.includes(query.trim().toLowerCase())
  })
  const headers = ['complaintTimestamp', 'farmerPpb', 'shopDistrict', 'fertilizer', 'officialCharged', 'overcharge']

  return (
    <div className="agri-page space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800"><ShieldCheck size={15} />{copy('marketOversight')}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{copy('officerTitle')}</h2><p className="mt-1 text-sm text-slate-500">{copy('officerDesc')}</p></div><button type="button" onClick={loadComplaints} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-900 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{copy('refresh')}</button></section>
      {error && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={19} />{error}<button onClick={loadComplaints} className="ml-auto font-bold underline">{copy('retry')}</button></div>}
      <section className="mb-4"><ImageSlot id="officer-banner" aspectClass="aspect-[16/5] md:aspect-[16/3]" badge={copy('marketOversight')} title={copy('officerTitle')} subtitle={copy('officerDesc')} overlay icon={ShieldCheck} /></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard icon={AlertTriangle} label={copy('totalReports')} value={complaints.length} tone="amber" hint={copy('complaintsFiled')} /><StatCard icon={IndianRupee} label={copy('totalOvercharge')} value={`₹${totalOvercharge.toLocaleString(locales[language] || 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} tone="red" hint={copy('combinedTotal')} /><StatCard icon={MapPin} label={copy('districtsCovered')} value={districts.length} tone="green" hint={copy('districtCountHint')} /></section>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy('searchComplaints')} className="w-full rounded-xl border border-stone-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-700/10" /></label><select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)} aria-label={copy('district')} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600"><option value="all">{copy('allDistricts')}</option>{districts.map((district) => <option key={district} value={district}>{district}</option>)}</select></div>
      <section className="glass-panel overflow-hidden rounded-3xl">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6"><div><h3 className="font-bold text-slate-900">{copy('reportList')}</h3><p className="mt-1 text-xs text-slate-500">{copy('reportListDesc')}</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600"><Users size={14} />{complaints.length} {copy('reports')}</span></div>
        {loading && complaints.length === 0 ? <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm font-medium text-slate-500"><LoaderCircle className="animate-spin" size={18} />{copy('loadingRecords')}</div> : complaints.length === 0 ? <div className="px-6 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><ShieldCheck size={23} /></span><p className="mt-3 font-bold text-slate-800">{copy('noComplaints')}</p><p className="mt-1 text-sm text-slate-500">{copy('noComplaintsDesc')}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{headers.map((key, index) => <th key={key} className={`${index === 0 || index === 5 ? 'px-5' : 'px-4'} py-3 font-bold ${index >= 4 ? 'text-right' : ''}`}>{copy(key)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredComplaints.map((complaint, index) => <tr key={complaint.id || `${complaint.ppb_number}-${index}`} className="align-top transition hover:bg-slate-50/70"><td className="px-5 py-4"><span className="block font-mono text-xs font-bold text-emerald-900">{complaint.id || '—'}</span><span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500"><CalendarClock size={12} />{formatDate(complaint.timestamp, language)}</span></td><td className="px-4 py-4"><span className="block font-semibold text-slate-900">{complaint.farmer_name || '—'}</span><span className="mt-1 block font-mono text-xs text-slate-500">{complaint.ppb_number || '—'}</span></td><td className="px-4 py-4"><span className="block font-semibold text-slate-800">{complaint.shop_name || '—'}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Building2 size={12} />{complaint.district || '—'}</span></td><td className="px-4 py-4"><span className="inline-flex max-w-44 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{complaint.fertilizer_name || '—'}</span></td><td className="px-4 py-4 text-right tabular-nums"><span className="block text-xs text-slate-500">{copy('mrp')} ₹{Number(complaint.official_mrp || 0).toFixed(2)}</span><span className="mt-1 block font-bold text-slate-900">{copy('charged')} ₹{Number(complaint.charged_price || 0).toFixed(2)}</span></td><td className="px-5 py-4 text-right"><span className="inline-flex rounded-lg bg-rose-50 px-2.5 py-1.5 font-bold tabular-nums text-rose-800">₹{Number(complaint.overcharge_amount || 0).toFixed(2)}</span></td></tr>)}</tbody></table></div>}
      </section>
      <p className="text-center text-xs text-slate-400">{copy('assignReports')}</p>
    </div>
  )
}

export default OfficerDashboard
