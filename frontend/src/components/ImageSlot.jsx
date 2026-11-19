import { useState } from 'react'
import { Image, Leaf } from 'lucide-react'

function ImageSlot({ aspectClass = 'aspect-[16/10]', badge, id, subtitle, title, overlay = false, icon: Icon = Leaf }) {
  const [loaded, setLoaded] = useState(true)
  return <div className={`group relative isolate overflow-hidden rounded-2xl ${aspectClass} ${overlay ? 'text-white' : 'text-emerald-950'}`}>
    {loaded && <img src={`/images/${id}.png`} alt={title || ''} onError={() => setLoaded(false)} className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />}
    {loaded && badge && <span className="absolute left-4 top-4 z-10 rounded-full border border-white/25 bg-slate-950/35 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-white backdrop-blur-md">{badge}</span>}
    {!loaded && <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_20%,rgba(16,185,129,.38),transparent_42%),radial-gradient(circle_at_82%_80%,rgba(245,158,11,.42),transparent_40%),linear-gradient(135deg,#063b2a,#0d7656_58%,#d6a23d)]">
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -right-10 -top-12 size-44 rounded-full border-[26px] border-white/10" /><div className="absolute -bottom-20 -left-8 size-56 rounded-full border-[38px] border-amber-200/10" />
      <div className="absolute inset-x-4 top-4 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-md"><Icon size={22} /></span>{badge && <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-white backdrop-blur-md">{badge}</span>}</div>
      <div className={`absolute inset-x-5 bottom-4 ${overlay ? 'rounded-xl bg-slate-950/35 p-3 backdrop-blur-sm' : ''}`}><p className="text-base font-extrabold leading-snug text-white">{title}</p>{subtitle && <p className="mt-1 text-xs leading-5 text-white/85">{subtitle}</p>}<p className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-white/65"><Image size={12} />public/images/{id}.png</p></div>
    </div>}
    {loaded && overlay && <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />}
    {loaded && overlay && <div className="absolute inset-x-5 bottom-4"><p className="text-base font-extrabold">{title}</p>{subtitle && <p className="mt-1 text-xs text-white/85">{subtitle}</p>}</div>}
  </div>
}

export default ImageSlot
