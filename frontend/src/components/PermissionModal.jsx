import { Camera, Check, Globe2, LockKeyhole, Mic, ShieldCheck, Sparkles } from 'lucide-react'
import { LANGUAGES, t } from '../i18n/translations.js'

function PermissionModal({ language, onLanguageChange, onAccept }) {
  const copy = (key) => t(language, key)
  const permissions = [
    { icon: Mic, title: 'microphonePermission', description: 'microphonePermissionDesc' },
    { icon: Camera, title: 'cameraPermission', description: 'cameraPermissionDesc' },
    { icon: Sparkles, title: 'agentPermission', description: 'agentPermissionDesc' },
  ]

  return (
    <div className="fixed inset-0 z-50 grid min-h-screen place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-md sm:p-8">
      <section role="dialog" aria-modal="true" aria-labelledby="permission-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/70 bg-white/95 shadow-[0_30px_100px_-28px_rgba(2,30,19,.55)] backdrop-blur-xl animate-fade-slide-up">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#043927] to-[#065F46] px-5 py-4 text-white sm:px-7">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-700"><LockKeyhole size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">KisanSathi AI</p><h1 id="permission-title" className="mt-0.5 text-lg font-extrabold sm:text-xl">{copy('consentTitle')}</h1></div></div>
          <label className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-2"><Globe2 size={15} /><span className="sr-only">{copy('language')}</span><select aria-label={copy('language')} value={language} onChange={(event) => onLanguageChange(event.target.value)} className="max-w-28 bg-transparent text-xs font-bold text-white outline-none [&>option]:text-slate-900">{LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        </div>
        <div className="p-5 sm:p-8">
          <p className="mb-5 text-sm leading-6 text-slate-700 sm:text-base">{copy('consentIntro')}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {permissions.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-[0_14px_40px_-18px_rgba(4,57,39,.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"><div className="mb-4 flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-900"><Icon size={23} /></span><span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-white"><Check size={16} strokeWidth={3} /></span></div><h2 className="font-extrabold text-slate-900">{copy(title)}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{copy(description)}</p></div>)}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950"><ShieldCheck size={16} className="mt-0.5 shrink-0" />{copy('permissionNote')}</p>
          <button type="button" autoFocus onClick={onAccept} className="animate-shimmer-sweep mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[#043927] px-5 py-4 text-center text-base font-extrabold text-white shadow-lg shadow-emerald-900/20 transition duration-300 hover:-translate-y-0.5 hover:bg-[#065F46] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/40 sm:text-lg">{copy('acceptAll')}</button>
        </div>
      </section>
    </div>
  )
}

export default PermissionModal
