import { useState } from 'react'
import { PackageCheck } from 'lucide-react'
import ImageSlot from './components/ImageSlot.jsx'

const shops = [
  { name: 'Shadnagar Agro Kendra', stock: 45, label: 'Shadnagar Agro Kendra - Urea: 45 bags' },
  { name: 'Chevella Rythu Seva', stock: 30, label: 'Chevella Rythu Seva - Urea: 30 bags' },
  { name: 'Maheshwaram Agri Depot', stock: 0, label: 'Maheshwaram Agri Depot - Urea: 0 bags' },
]

const fertilizers = ['Urea', 'DAP', 'MOP', 'SSP', 'NPK 10-26-26', 'NPK 12-32-16', 'NPK complex (other grade)', 'Ammonium Sulphate', 'TSP', 'MAP']

function StepHeading({ number, title, complete }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${complete ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}>{complete ? '✓' : number}</span>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    </div>
  )
}

function GovtPortal() {
  const [step, setStep] = useState(1)
  const [passbook, setPassbook] = useState('')
  const [otp, setOtp] = useState('')
  const [shopIndex, setShopIndex] = useState('0')
  const [fertilizerType, setFertilizerType] = useState('Urea')
  const [bags, setBags] = useState(1)
  const [receipt, setReceipt] = useState(null)

  function submitOtp(event) {
    event.preventDefault()
    if (/^\d{4}$/.test(otp)) setStep(3)
  }

  function confirmBooking(event) {
    event.preventDefault()
    const shop = shops[Number(shopIndex)]
    setReceipt({ id: `FFS-TS-2026-${Math.random().toString(10).slice(2, 6)}`, shop: shop.name, bags: Number(bags), fertilizerType })
  }

  return (
    <div className="agri-page min-h-screen bg-transparent text-slate-800">
      <header className="border-b border-stone-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5 sm:px-8">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-800 text-2xl text-white" aria-hidden="true">✳</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Central fertilizer support • Local authorized sale</p>
            <h1 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-xl">Central Fertilizer Distribution Booking Portal</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-12">
        <section className="glass-panel rounded-3xl p-6 sm:p-9">
          <div className="mb-8 border-b border-slate-100 pb-6">
            <p className="text-sm font-semibold text-emerald-800">Fertilizer booking</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Book a supported fertilizer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choose a centrally supported fertilizer and reserve it through a nearby authorized shop.</p>
          </div>

          <form onSubmit={(event) => { event.preventDefault(); setStep(2) }} className="space-y-8">
            <section>
              <StepHeading number="1" title="Farmer identification" complete={step > 1} />
              <label htmlFor="ppb-number" className="mb-2 block text-sm font-semibold text-slate-700">Pattadar Passbook / Aadhaar number</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="ppb-number" value={passbook} onChange={(event) => setPassbook(event.target.value)} placeholder="Enter Pattadar Passbook / Aadhaar No." required className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" />
                <button id="get-otp-btn" type="submit" className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900">Send OTP</button>
              </div>
            </section>

            {step >= 2 && <section>
              <StepHeading number="2" title="Verify mobile number" complete={step > 2} />
              <label htmlFor="otp-input" className="mb-2 block text-sm font-semibold text-slate-700">Enter the 4-digit OTP</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="otp-input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Enter 4-digit OTP" required className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" />
                <button id="verify-otp-btn" type="button" onClick={submitOtp} className="rounded-xl border border-emerald-800 px-5 py-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-50">Verify OTP</button>
              </div>
            </section>}

            {step >= 3 && <section>
              <StepHeading number="3" title="Choose shop and quantity" />
              <label htmlFor="fertilizer-select" className="mb-2 block text-sm font-semibold text-slate-700">Central fertilizer product or grade</label>
              <select id="fertilizer-select" value={fertilizerType} onChange={(event) => setFertilizerType(event.target.value)} className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10">
                {fertilizers.map((fertilizer) => <option key={fertilizer} value={fertilizer}>{fertilizer}</option>)}
              </select>
              <label htmlFor="shop-select" className="mb-2 block text-sm font-semibold text-slate-700">Authorized fertilizer shop</label>
              <select id="shop-select" value={shopIndex} onChange={(event) => setShopIndex(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10">
                {shops.map((shop, index) => <option key={shop.name} value={index}>{shop.label.replace('Urea', fertilizerType)}</option>)}
              </select>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="w-36">
                  <label htmlFor="bags-input" className="mb-2 block text-sm font-semibold text-slate-700">Number of bags</label>
                  <input id="bags-input" type="number" min="1" max="5" value={bags} onChange={(event) => setBags(Math.max(1, Math.min(5, Number(event.target.value))))} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10" />
                </div>
                <p className="pb-3 text-xs text-slate-500">Maximum 5 bags per booking</p>
              </div>
              <button id="confirm-btn" type="button" onClick={confirmBooking} disabled={shops[Number(shopIndex)].stock === 0} className="mt-6 w-full rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300">Confirm Fertilizer Booking</button>
              {shops[Number(shopIndex)].stock === 0 && <p className="mt-2 text-sm text-rose-700">This shop is currently out of stock. Please select another shop.</p>}
            </section>}
          </form>

          {receipt && <section id="booking-receipt" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6" aria-live="polite">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-800">Booking confirmed</p>
                <p className="mt-1 text-xs text-emerald-900/70">Keep this receipt for collection</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div><dt className="inline text-slate-500">Booking ID: </dt><dd className="inline font-bold text-slate-900">{receipt.id}</dd></div>
                  <div><dt className="inline text-slate-500">Shop: </dt><dd className="inline font-semibold text-slate-900">{receipt.shop}</dd></div>
                  <div><dt className="inline text-slate-500">Product: </dt><dd className="inline font-semibold text-slate-900">{receipt.fertilizerType}</dd></div>
                  <div><dt className="inline text-slate-500">Quantity: </dt><dd className="inline font-semibold text-slate-900">{receipt.bags} {receipt.bags === 1 ? 'bag' : 'bags'}</dd></div>
                </dl>
              </div>
              <div className="grid size-28 shrink-0 place-items-center self-center rounded-xl border-4 border-white bg-white shadow-sm sm:self-auto" aria-label="QR code placeholder">
                <div className="grid size-[72px] grid-cols-5 grid-rows-5 gap-1" aria-hidden="true">{Array.from({ length: 25 }, (_, i) => <span key={i} className={`rounded-[2px] ${[0,1,2,4,5,7,9,10,12,14,15,17,18,20,22,24].includes(i) ? 'bg-slate-900' : 'bg-emerald-100'}`} />)}</div>
              </div>
            </div>
          </section>}
        </section>

        <aside className="h-fit rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-[#032B1D] to-[#065F46] p-5 text-white shadow-[0_20px_52px_-28px_rgba(4,57,39,.6)] sm:p-7">
          <ImageSlot id="fertilizer-distribution" aspectClass="aspect-[16/8]" badge="Central distribution" title="Choose your fertilizer" subtitle="Reserve through a local authorized shop" overlay icon={PackageCheck} />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">How it works</p>
          <h2 className="mt-2 text-xl font-bold">A simple, verified process</h2>
          <ol className="mt-6 space-y-5 text-sm text-emerald-50/90">
            <li className="flex gap-3"><span className="font-bold text-emerald-300">01</span><span>Enter your farmer ID and request an OTP.</span></li>
            <li className="flex gap-3"><span className="font-bold text-emerald-300">02</span><span>Verify the 4-digit OTP to continue.</span></li>
            <li className="flex gap-3"><span className="font-bold text-emerald-300">03</span><span>Select an in-stock shop and reserve up to five bags.</span></li>
          </ol>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-emerald-100/80">Booking demonstration portal. OTP verification and reservations are simulated for this preview.</div>
        </aside>
      </main>
      <footer className="border-t border-slate-200 bg-white px-5 py-5 text-center text-xs text-slate-500">Central fertilizer support • Local authorized sale simulation</footer>
    </div>
  )
}

export default GovtPortal
