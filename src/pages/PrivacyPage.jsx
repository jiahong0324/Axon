import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import { Shield, Lock, Eye, Database, Sparkles, CheckCircle2, AlertTriangle, FileText, Globe } from 'lucide-react'

export default function PrivacyPage() {
  const [lang, setLang] = useState('en') // 'en' | 'bm'

  return (
    <>
      <SEO
        title="Privacy Policy | Personal Data Protection Act 2010 | Axon Malaysia"
        description="Official Personal Data Protection Notice in accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia."
        keywords="Axon privacy policy Malaysia, PDPA 2010, Akta Perlindungan Data Peribadi 2010, Notis Privasi Malaysia, student data security"
      />
      <main
        className="h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#E0E7FF,#EEF4FB_55%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top,#1E1040,#0F172A_55%)] dark:text-white px-4 py-10 transition-colors duration-300"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="mx-auto max-w-4xl glass rounded-3xl p-6 sm:p-10 shadow-2xl mb-12">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                <Shield className="h-3.5 w-3.5" /> PDPA 2010 Compliant &bull; Malaysia
              </div>
              <h1 className="text-3xl font-extrabold font-heading text-slate-950 dark:text-white">
                {lang === 'en' ? 'Personal Data Protection Notice' : 'Notis Perlindungan Data Peribadi'}
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {lang === 'en'
                  ? 'Issued pursuant to Section 7 of the Personal Data Protection Act 2010 (Act 709) of Malaysia'
                  : 'Dikeluarkan menurut Seksyen 7 Akta Perlindungan Data Peribadi 2010 (Akta 709) Malaysia'}
              </p>
            </div>

            {/* Bilingual Switcher (Section 7(3) of PDPA Mandate) */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-200 dark:border-white/10 p-1 bg-white/40 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    lang === 'en'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang('bm')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    lang === 'bm'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Bahasa Malaysia
                </button>
              </div>
              <Link to="/terms" className="btn-ghost text-sm">
                Terms
              </Link>
            </div>
          </div>

          {/* Core Guarantees Banner */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Lock className="h-5 w-5 text-theme-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'en' ? 'Zero Data Selling' : 'Tiada Penjualan Data'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'en'
                  ? 'We never sell, rent, license, or monetize student records to advertisers or third parties.'
                  : 'Kami tidak akan sekali-kali menjual, menyewakan atau memperdagangkan data pelajar kepada pihak ketiga.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Sparkles className="h-5 w-5 text-amber-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'en' ? 'Private AI Assistance' : 'Bantuan AI Peribadi'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'en'
                  ? 'Your study notes and questions are never used to train public foundation AI models.'
                  : 'Nota dan soalan anda tidak digunakan untuk melatih model asas kecerdasan buatan awam.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4">
              <Database className="h-5 w-5 text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'en' ? 'Multi-Tenant Isolation' : 'Pengasingan Data RLS'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'en'
                  ? 'Row-Level Security (RLS) ensures only your authenticated account can access your timetable.'
                  : 'Keselamatan Peringkat Baris (RLS) memastikan hanya akaun anda yang boleh mengakses rekod anda.'}
              </p>
            </div>
          </div>

          {/* ENGLISH POLICY CONTENT */}
          {lang === 'en' ? (
            <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Statutory Notice under PDPA 2010 (Act 709)
                </h2>
                <p className="mb-2">
                  This Personal Data Protection Notice (&ldquo;Notice&rdquo;) is issued by Axon (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, or the &ldquo;Data User&rdquo;) pursuant to the <strong>Personal Data Protection Act 2010 (Act 709)</strong> of Malaysia (&ldquo;PDPA&rdquo;) to all registered students, guest users, and visitors (&ldquo;you&rdquo; or the &ldquo;Data Subject&rdquo;).
                </p>
                <p>
                  By accessing or using the Axon web application, progressive web app, AI Study Helper, or related digital services, you consent to the processing of your personal data in accordance with the seven (7) Personal Data Protection Principles under the PDPA as detailed in this Notice.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Description of Personal Data Collected
                </h2>
                <p className="mb-2">We process the following categories of personal data in connection with the Service:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li><strong className="text-slate-800 dark:text-slate-200">Account Credentials (Obligatory for Registration):</strong> Full name, university or personal email address, cryptographically salted password hashes, and profile preferences.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">Academic Records (Voluntary / Functional):</strong> Course codes, class schedules, lecture venues, assignment titles, deadlines, exam dates, syllabus notes, and grade calculation inputs.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">AI Helper Queries &amp; Uploads (Voluntary):</strong> Text prompts, study questions, equations, and timetable screenshot images uploaded to the OCR parser or AI Study Helper.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">Technical State:</strong> Language settings, active theme (dark/light), selected accent color, and session tokens stored locally in browser storage.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Purposes of Personal Data Processing
                </h2>
                <p className="mb-2">In compliance with the General Principle (Section 6 of Act 709), personal data is processed solely for lawful purposes directly related to providing the Service:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>To render and display your customized student timetable, assignment list, and exam countdowns.</li>
                  <li>To trigger and deliver scheduled deadline notifications and class alerts.</li>
                  <li>To provide contextual AI explanations, flashcards, and study revision schedules.</li>
                  <li>To synchronize data across your smartphone, tablet, and computer.</li>
                  <li>To maintain the integrity, security, and technical functionality of the Service.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> Absolute User Prohibition on Sensitive Personal Data
                </h2>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                  <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> STATUTORY PROHIBITION ON SENSITIVE PERSONAL DATA
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Pursuant to Section 40 of Act 709, you are <strong>STRICTLY FORBIDDEN</strong> from uploading, storing, or transmitting through Axon (including notes, prompts, and attachments) any sensitive personal data, including:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>Malaysian National Registration Identity Card (NRIC) numbers or passport numbers.</li>
                    <li>Payment card details, bank account numbers, or financial credentials.</li>
                    <li>Physical or mental health diagnoses, medical history, or religious beliefs.</li>
                    <li>Confidential, classified, or leaked examination papers and grading keys.</li>
                  </ul>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    Axon wholly disclaims all liability and legal responsibility if a user elects to upload prohibited sensitive information.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Security Safeguards &amp; Inherent Risk Disclaimer
                </h2>
                <p className="mb-2">
                  In compliance with the Security Principle (Section 9 of Act 709), we employ practical and robust technical safeguards:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                  <li><strong>TLS 1.3 Encryption:</strong> All communications between your device and our servers are encrypted in transit.</li>
                  <li><strong>AES-256 Cloud Encryption:</strong> Database volumes are encrypted at rest using industry standards.</li>
                  <li><strong>PostgreSQL Row-Level Security:</strong> Strict database isolation ensures users cannot view data belonging to other students.</li>
                </ul>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-red-700 dark:text-red-300 uppercase block mb-1">
                    NO WARRANTY OF ABSOLUTE IMMUNITY:
                  </strong>
                  WHILE WE TAKE ALL REASONABLE AND PRACTICAL STEPS REQUIRED UNDER MALAYSIAN LAW, NO METHOD OF INTERNET TRANSMISSION OR CLOUD STORAGE CAN BE WARRANTED AS 100% IMPENETRABLE. WE DISCLAIM LIABILITY FOR UNFORESEEN CYBERATTACKS, ZERO-DAY HARDWARE VULNERABILITIES, UNAUTHORIZED INTERCEPTIONS, OR LOSS RESULTING FROM COMPROMISED USER PASSWORDS.
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Third-Party Sub-processors &amp; Cross-Border Transfers (Section 129 PDPA)
                </h2>
                <p className="mb-2">
                  Pursuant to Section 129 of the PDPA 2010, personal data may be processed on servers hosted by enterprise cloud service providers located outside Malaysia (including Supabase Inc. for database hosting, Vercel Inc. for edge CDN hosting, and foundation AI API providers).
                </p>
                <p>
                  By using the Service, you explicitly consent to the transfer and processing of your personal data to these vetted enterprise infrastructure providers solely for the performance of the Service. We mandate that our AI partners maintain strict zero-data-retention training policies.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Data Retention &amp; Guest Mode Ephemeral Storage
                </h2>
                <p className="mb-2">
                  In compliance with the Retention Principle (Section 10 of Act 709), personal data is retained only for the duration necessary to provide the Service or until you request account deletion.
                </p>
                <p>
                  <strong>Guest Mode Data Loss Warning:</strong> Guest mode data is stored solely in your local browser cache (<code className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-xs">localStorage</code>). Clearing browser history, using incognito browsing, or changing browsers permanently destroys guest data. Axon accepts zero responsibility for unrecoverable guest records.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Right of Access, Correction &amp; Erasure (Sections 30 &amp; 34 PDPA)
                </h2>
                <p className="mb-2">
                  Under the Access Principle and Sections 30 and 34 of the Personal Data Protection Act 2010, you have the right to:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                  <li><strong>Request Access:</strong> Request confirmation and an export of the personal data held about you.</li>
                  <li><strong>Request Correction:</strong> Correct, update, or amend any inaccurate or incomplete academic entries.</li>
                  <li><strong>Withdraw Consent / Erasure:</strong> Delete your account and request permanent erasure of your personal data from our active database.</li>
                </ul>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You can exercise these rights directly within your student Settings screen or by contacting us in writing.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Age Eligibility &amp; Parental Consent
                </h2>
                <p>
                  Axon is designed for university, college, and secondary students. In accordance with the <strong>Age of Majority Act 1971</strong> and child digital consent principles, individuals under 18 years of age should obtain consent from a parent or legal guardian prior to registering an account or uploading study data.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">10.</span> Inquiries &amp; Data Protection Officer Contact
                </h2>
                <p>
                  Pursuant to Section 7(1)(f) of Act 709, if you have inquiries, complaints, or wish to exercise your statutory rights regarding your personal data, please contact us via our{' '}
                  <Link to="/contact" className="text-theme-600 dark:text-theme-400 font-semibold hover:underline">
                    Contact Form
                  </Link>.
                </p>
              </section>
            </div>
          ) : (
            /* BAHASA MALAYSIA STATUTORY NOTICE (SEKSYEN 7(3) AKTA 709) */
            <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">1.</span> Notis Menurut Akta Perlindungan Data Peribadi 2010 (Akta 709)
                </h2>
                <p className="mb-2">
                  Notis Perlindungan Data Peribadi ini (&ldquo;Notis&rdquo;) dikeluarkan oleh Axon (&ldquo;kami&rdquo; atau &ldquo;Pengguna Data&rdquo;) menurut <strong>Akta Perlindungan Data Peribadi 2010 (Akta 709)</strong> Malaysia (&ldquo;APDP&rdquo;) kepada semua pelajar, pengguna tetamu, dan pelawat (&ldquo;anda&rdquo; atau &ldquo;Subjek Data&rdquo;).
                </p>
                <p>
                  Dengan mengakses atau menggunakan aplikasi web Axon, aplikasi web progresif (PWA), Pembantu Pembelajaran AI, atau perkhidmatan digital berkaitan, anda bersetuju dengan pemprosesan data peribadi anda menurut tujuh (7) Prinsip Perlindungan Data Peribadi di bawah APDP seperti yang dinyatakan dalam Notis ini.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">2.</span> Kategori Data Peribadi yang Diproses
                </h2>
                <p className="mb-2">Kami memproses data peribadi berikut untuk membolehkan perkhidmatan beroperasi:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li><strong className="text-slate-800 dark:text-slate-200">Maklumat Akaun (Wajib untuk Pendaftaran):</strong> Nama penuh, alamat e-mel peribadi/universiti, kata laluan yang disulitkan secara kriptografi, dan tetapan profil.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">Rekod Akademik (Sukarela / Fungsi):</strong> Kod kursus, jadual waktu kuliah, lokasi dewan, tajuk tugasan, tarikh akhir penghantaran, tarikh peperiksaan, dan anggaran gred.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">Pertanyaan Pembantu AI &amp; Muat Naik (Sukarela):</strong> Teks soalan, formula matematik, dan tangkapan skrin jadual yang dimuat naik ke Pembantu AI untuk tujuan analisis masa nyata.</li>
                  <li><strong className="text-slate-800 dark:text-slate-200">Data Teknikal:</strong> Pilihan bahasa, tema (gelap/terang), warna tema, dan token sesi yang disimpan secara setempat dalam pelayar anda.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">3.</span> Maksud Pemprosesan Data Peribadi (Prinsip Am)
                </h2>
                <p className="mb-2">Menurut Seksyen 6 Akta 709, data peribadi anda hanya diproses untuk tujuan sah yang berkaitan secara langsung dengan perkhidmatan:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>Menjana dan memaparkan jadual waktu pelajar, senarai tugasan, dan kiraan detik peperiksaan anda.</li>
                  <li>Menghantar peringatan tarikh akhir tugasan dan notifikasi kelas ke peranti anda.</li>
                  <li>Menyediakan bantuan pembelajaran berasaskan AI dan jadual ulang kaji.</li>
                  <li>Menyegerakkan data antara telefon pintar, tablet, dan komputer anda.</li>
                  <li>Memastikan keselamatan, kestabilan, dan integriti teknikal aplikasi.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">4.</span> Larangan Menyeluruh Terhadap Data Peribadi Sensitif
                </h2>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                  <p className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> LARANGAN MUTLAK DATA PERIBADI SENSITIF (SEKSYEN 40 APDP)
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Anda <strong>DILARANG SAMA SEKALI</strong> daripada memuat naik, menyimpan, atau menghantar melalui Axon sebarang data peribadi sensitif, termasuk:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <li>Nombor Kad Pengenalan Malaysia (No. MyKad) atau nombor pasport.</li>
                    <li>Maklumat kad kredit, nombor akaun bank, atau butiran kewangan.</li>
                    <li>Rekod kesihatan fizikal atau mental dan kepercayaan agama.</li>
                    <li>Kertas soalan peperiksaan sulit atau skema pemarkahan yang bocor.</li>
                  </ul>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    Axon melepaskan semua liabiliti sekiranya pengguna melanggar larangan ini dan memuat naik data sensitif tersebut.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">5.</span> Prinsip Keselamatan &amp; Penafian Risiko Siber
                </h2>
                <p className="mb-2">
                  Menurut Seksyen 9 Akta 709, kami mengambil langkah teknikal dan organisasi yang munasabah untuk melindungi data anda:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-3">
                  <li>Penyulitan TLS 1.3 / HTTPS semasa penghantaran data.</li>
                  <li>Penyulitan pangkalan data AES-256 pada pelayan awan.</li>
                  <li>Pengasingan keselamatan baris (Row-Level Security) PostgreSQL bagi mengelakkan akses tanpa kebenaran antara pengguna.</li>
                </ul>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong className="text-red-700 dark:text-red-300 uppercase block mb-1">
                    TIADA JAMINAN KEKEBALAN MUTLAK:
                  </strong>
                  WALAUPUN KAMI MENGAMBIL SEMUA LANGKAH KESELAMATAN YANG DIPERLUKAN DI BAWAH UNDANG-UNDANG MALAYSIA, TIADA PENGHANTARAN INTERNET ATAU STORAN AWAN YANG BOLEH DIJAMIN 100% BEBAS DARI SERANGAN SIBER. KAMI TIDAK BERTANGGUNGJAWAB ATAS SERANGAN SIBER YANG TIDAK DIJANGKA, KECURIAN KATA LALUAN OLEH PENGGUNA, ATAU GANGGUAN DI LUAR KAWALAN KAMI.
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">6.</span> Pemindahan Data ke Luar Malaysia (Seksyen 129 APDP)
                </h2>
                <p>
                  Menurut Seksyen 129 Akta 709, anda dengan ini memberi persetujuan nyata bahawa data peribadi anda boleh diproses di pelayan storan awan pihak ketiga perusahaan yang terletak di luar Malaysia (seperti Supabase Inc., Vercel Inc., dan penyedia API AI perusahaan) semata-mata untuk pelaksanaan fungsi aplikasi. Rakan AI kami terikat dengan dasar ketiadaan pengekalan data (zero data retention) bagi latihan model awam.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">7.</span> Prinsip Penyimpanan &amp; Mod Tetamu
                </h2>
                <p className="mb-2">
                  Menurut Seksyen 10 Akta 709, data peribadi anda hanya disimpan sepanjang akaun anda aktif atau sehingga permohonan pemadaman dibuat.
                </p>
                <p>
                  <strong>Amaran Mod Tetamu:</strong> Sesi mod tetamu disimpan secara setempat dalam pelayar peranti anda sahaja. Membersihkan sejarah pelayar akan memadamkan rekod tetamu secara kekal. Axon tidak bertanggungjawab terhadap kehilangan data tetamu.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">8.</span> Hak Mengakses dan Membetulkan Data (Seksyen 30 &amp; 34 APDP)
                </h2>
                <p className="mb-2">
                  Di bawah Seksyen 30 dan 34 Akta Perlindungan Data Peribadi 2010, anda berhak untuk:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400 mb-2">
                  <li><strong>Akses Data:</strong> Meminta salinan data peribadi anda yang kami simpan.</li>
                  <li><strong>Pembetulan Data:</strong> Membetulkan maklumat akademik atau profil yang tidak tepat.</li>
                  <li><strong>Penarikan Persetujuan:</strong> Memadamkan akaun anda secara kekal dari pangkalan data kami.</li>
                </ul>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Anda boleh melaksanakan hak ini secara langsung melalui menu Tetapan (Settings) atau menghubungi kami secara bertulis.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
                  <span className="font-heading text-theme-600 dark:text-theme-400">9.</span> Hubungi Kami &amp; Pegawai Perlindungan Data
                </h2>
                <p>
                  Sekiranya anda mempunyai sebarang pertanyaan, aduan, atau ingin melaksanakan hak undang-undang anda berkenaan data peribadi di bawah APDP 2010, sila hubungi kami melalui{' '}
                  <Link to="/contact" className="text-theme-600 dark:text-theme-400 font-semibold hover:underline">
                    Borang Hubungi Kami
                  </Link>.
                </p>
              </section>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/terms" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-theme-600 dark:hover:text-white">
              &larr; {lang === 'en' ? 'View Terms and Conditions of Use' : 'Lihat Terma dan Syarat Penggunaan'}
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-ghost text-sm">
                {lang === 'en' ? 'Back to Sign In' : 'Kembali ke Log Masuk'}
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                {lang === 'en' ? 'Create Free Account' : 'Daftar Akaun Percuma'}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
