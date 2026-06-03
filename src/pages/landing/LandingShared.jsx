export function SectionIntro({ eyebrow, title, desc, centered = false }) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">{eyebrow}</p>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl dark:text-white">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg dark:text-slate-300">{desc}</p>
    </div>
  )
}
