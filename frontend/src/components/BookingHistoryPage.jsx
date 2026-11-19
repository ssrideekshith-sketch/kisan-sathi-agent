import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarClock, LoaderCircle, QrCode, RefreshCw, Sparkles } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { t } from '../i18n/translations.js'
import ImageSlot from './ImageSlot.jsx'

const API = 'http://localhost:8000'
const LOCALES = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', ml: 'ml-IN' }

function BookingHistoryPage({ language = 'en', identifier, profile = null, onProfileUpdate, onNavigateBooking }) {
  const copy = (key) => t(language, key)
  const [farmer, setFarmer] = useState(profile)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const onProfileUpdateRef = useRef(onProfileUpdate)

  useEffect(() => { onProfileUpdateRef.current = onProfileUpdate }, [onProfileUpdate])

  const loadFarmer = useCallback(async () => {
    if (!identifier) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API}/farmers/${encodeURIComponent(identifier)}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(copy('serviceUnavailable'))
      setFarmer(payload)
      onProfileUpdateRef.current?.(payload)
    } catch {
      setError(copy('serviceUnavailable'))
    } finally {
      setLoading(false)
    }
  }, [identifier, language])

  useEffect(() => { loadFarmer() }, [loadFarmer])

  const bookings = farmer?.bookings || []
  const dateLocale = LOCALES[language] || 'en-IN'

  const totalBags = bookings.reduce((sum, booking) => sum + (Number(booking.bags) || 0), 0)
  return <div className="agri-page space-y-6">
    <section className="grid items-center gap-5 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-[#043927] to-[#065F46] p-5 text-white shadow-[0_20px_52px_-28px_rgba(4,57,39,.55)] sm:p-7 lg:grid-cols-[1fr_.75fr]">
      <div>
      <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-300">{copy('farmerPortal')}</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{copy('welcomeFarmer').replace('{name}', farmer?.full_name || '')}</h2>
      <p className="mt-2 text-sm text-emerald-100/80">{copy('ppbNumber')}: <span className="font-mono font-bold text-white">{farmer?.ppb_number || identifier}</span></p>
      <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold">{bookings.length} {copy('bookingCount')}</span><span className="rounded-xl border border-amber-200/25 bg-amber-100/10 px-3 py-2 text-xs font-bold text-amber-100">{totalBags} {copy('totalBags')}</span></div>
      </div>
      <ImageSlot id="history-banner" aspectClass="aspect-[16/7]" badge={copy('yourBookings')} title={copy('bookingReceipt')} subtitle={copy('bookingDate')} overlay icon={QrCode} />
    </section>

    <section className="glass-panel rounded-3xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><QrCode size={21} /></span>
          <div><h2 className="text-xl font-bold text-slate-900">{copy('yourBookings')}</h2><p className="mt-1 text-sm text-slate-500">{bookings.length} {copy('bookingCount')}</p></div>
        </div>
        <button type="button" onClick={loadFarmer} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-900 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{copy('refresh')}</button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {loading && !farmer ? <div className="flex items-center justify-center gap-2 py-12 text-sm font-medium text-slate-500"><LoaderCircle size={18} className="animate-spin" />{copy('loadingProfile')}</div> : bookings.length === 0 ? <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center"><p className="font-bold text-slate-800">{copy('noBookings')}</p><p className="mt-1 text-sm text-slate-500">{copy('noBookingsDesc')}</p><button type="button" onClick={onNavigateBooking} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"><Sparkles size={16} />{copy('startAgent')}</button></div> : <div className="grid gap-4 lg:grid-cols-2">{[...bookings].reverse().map((booking, index) => {
        const date = new Date(booking.timestamp)
        const dateText = Number.isNaN(date.getTime()) ? booking.timestamp : new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
        const qrPayload = booking.qr_payload || `${booking.booking_id} | ${farmer?.ppb_number || identifier} | ${booking.shop_selected} | ${booking.bags}`
        return <article key={`${booking.booking_id}-${index}`} className="group flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_14px_40px_-20px_rgba(4,57,39,.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><div className="inline-block rounded-xl bg-[#043927] px-3 py-2 text-white"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald-200">{copy('bookingId')}</p><p className="font-mono text-sm font-extrabold">{booking.booking_id}</p></div><p className="mt-3 text-lg font-extrabold text-slate-900">{booking.fertilizer_type}</p><p className="mt-0.5 text-sm font-bold text-amber-700">{booking.bags} {copy('bags')}</p><div className="mt-3 space-y-1 text-xs leading-5 text-slate-600"><p>{copy('selectedShop')}: <b className="text-slate-800">{booking.shop_selected}</b></p><p>{copy('bookingDistrictMandal')}: <b className="text-slate-800">{booking.district} / {booking.mandal}</b></p><p className="flex items-center gap-1"><CalendarClock size={12} />{copy('bookingDate')}: {dateText}</p></div></div>
          <div className="mx-auto grid shrink-0 place-items-center rounded-2xl border-4 border-emerald-50 bg-white p-2 shadow-inner sm:mx-0"><QRCodeSVG value={qrPayload} size={104} level="M" includeMargin /></div>
        </article>
      })}</div>}
    </section>
  </div>
}

export default BookingHistoryPage
