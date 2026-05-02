import { useLang } from '../i18n'

const LANGS = [
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'zh', label: 'ZH' },
]

const LANG_COLORS = {
  pt: '#00ff41',
  en: '#00f2ff',
  es: '#ff00cc',
  zh: '#ffd700',
}

export default function LanguageSelector() {
  const { lang, setLang } = useLang()

  return (
    <div className="neblina-lang-selector">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`neblina-lang-btn${lang === l.code ? ' active' : ''}`}
          data-lang={l.code}
          aria-label={l.label}
          style={{ color: LANG_COLORS[l.code] }}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
