import { useState, useEffect } from 'react'
import { Radio, Search, Globe, Play, Loader2, List, Wifi } from 'lucide-react'
import { motion } from 'framer-motion'
import RadioGlobe from './RadioGlobe'

const COUNTRIES = [
  { name: 'Brasil',     code: 'BR', flag: 'https://flagcdn.com/w320/br.png' },
  { name: 'Russia',     code: 'RU', flag: 'https://flagcdn.com/w320/ru.png' },
  { name: 'China',      code: 'CN', flag: 'https://flagcdn.com/w320/cn.png' },
  { name: 'India',      code: 'IN', flag: 'https://flagcdn.com/w320/in.png' },
  { name: 'Mix Latino', tag: 'latino', flag: 'https://flagcdn.com/w320/mx.png' },
]

// Multiple API servers as fallback
const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
]

async function radioFetch(path) {
  for (const server of API_SERVERS) {
    try {
      const res = await fetch(`${server}${path}`, {
        headers: { 'User-Agent': 'StyxMediaApp/1.0', 'Content-Type': 'application/json' },
      })
      if (res.ok) return res.json()
    } catch { /* try next server */ }
  }
  throw new Error('Todos os servidores falharam')
}

export default function RadioTuner({ onStationClick }) {
  const [activeFilter, setActiveFilter] = useState(COUNTRIES[0])
  const [stations, setStations]         = useState([])
  const [loading, setLoading]           = useState(false)
  const [searchTerm, setSearchTerm]     = useState('')
  const [error, setError]               = useState(null)
  const [viewMode, setViewMode]         = useState('list')
  const [failedIds, setFailedIds]       = useState(new Set())

  useEffect(() => { if (viewMode === 'list') fetchStations() }, [activeFilter, viewMode])

  const buildPath = (search = '') => {
    // Note: NO is_https filter – we accept all and let the audio element decide
    let path = `/json/stations/search?limit=40&order=clickcount&reverse=true&hidebroken=true`
    if (search)             path += `&name=${encodeURIComponent(search)}`
    else if (activeFilter.code) path += `&countrycode=${activeFilter.code}`
    else if (activeFilter.tag)  path += `&tag=${activeFilter.tag}`
    return path
  }

  const fetchStations = async (search = '') => {
    setLoading(true); setError(null); setFailedIds(new Set())
    try {
      const data = await radioFetch(buildPath(search))
      // Prefer HTTPS, then HTTP as fallback
      const sorted = [...data].sort((a, b) => {
        const aHttps = a.url_resolved?.startsWith('https') ? 0 : 1
        const bHttps = b.url_resolved?.startsWith('https') ? 0 : 1
        return aHttps - bHttps
      })
      setStations(sorted)
    } catch (e) { setError('Não foi possível carregar as estações.') }
    finally { setLoading(false) }
  }

  const handleSearch = (e) => { e.preventDefault(); fetchStations(searchTerm) }

  const handleStationClick = (station) => {
    onStationClick(station)
  }

  const markFailed = (id) => setFailedIds(s => new Set([...s, id]))

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h2 style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <Radio color="var(--accent-primary)" /> Sintonizador Global
        </h2>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <button onClick={() => setViewMode('list')} title="Lista"
            style={{ padding:'0.6rem', background: viewMode==='list' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
              color: viewMode==='list' ? 'black' : 'white', border:'none' }}>
            <List size={20} />
          </button>
          <button onClick={() => setViewMode('globe')} title="Globo 3D"
            style={{ padding:'0.6rem', background: viewMode==='globe' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
              color: viewMode==='globe' ? 'black' : 'white', border:'none' }}>
            <Globe size={20} />
          </button>
        </div>
      </div>

      {/* ── GLOBE ── */}
      {viewMode === 'globe' && (
        <div style={{ width:'100%', height:'65vh', borderRadius:'20px', overflow:'hidden',
          background:'rgba(0,0,0,0.3)', border:'1px solid var(--border-color)' }}>
          <RadioGlobe onStationClick={onStationClick} />
        </div>
      )}

      {/* ── LIST ── */}
      {viewMode === 'list' && (
        <>
          <form onSubmit={handleSearch} style={{ position:'relative', marginBottom:'1.5rem' }}>
            <Search style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', opacity:0.5 }} size={20} />
            <input type="text" placeholder="Buscar estação..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border-color)',
                borderRadius:'12px', padding:'0.75rem 1rem 0.75rem 3rem', color:'white' }} />
          </form>

          {/* Country flags */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:'0.75rem', marginBottom:'2rem' }}>
            {COUNTRIES.map(c => (
              <button key={c.name} onClick={() => { setActiveFilter(c); setSearchTerm('') }}
                style={{ height:'72px', position:'relative', overflow:'hidden', borderRadius:'12px',
                  border: activeFilter.name===c.name ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background:'none', padding:0, cursor:'pointer' }}>
                <img src={c.flag} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%',
                  objectFit:'cover', opacity: activeFilter.name===c.name ? 0.65 : 0.28, transition:'opacity 0.3s' }} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                  background:'rgba(0,0,0,0.45)', fontWeight:800, fontSize:'0.78rem',
                  textTransform:'uppercase', letterSpacing:'0.5px',
                  color: activeFilter.name===c.name ? 'var(--accent-primary)' : 'white' }}>
                  {c.name}
                </div>
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'4rem', opacity:0.5 }}>
              <Loader2 style={{ margin:'0 auto 1rem', animation:'spin 1s linear infinite' }} />
              <p>Buscando estações...</p>
            </div>
          ) : error ? (
            <div className="card" style={{ border:'1px solid #ff4444', color:'#ff4444', textAlign:'center' }}>
              <p>{error}</p>
              <button onClick={() => fetchStations()} style={{ marginTop:'1rem', marginInline:'auto' }}>Tentar Novamente</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'0.75rem' }}>
              {stations.length > 0 ? stations.map(s => {
                const isFailed = failedIds.has(s.stationuuid)
                const isHttps  = s.url_resolved?.startsWith('https')
                return (
                  <motion.div layout initial={{ opacity:0 }} animate={{ opacity:1 }}
                    key={s.stationuuid}
                    className="card"
                    onClick={() => !isFailed && handleStationClick(s)}
                    style={{ cursor: isFailed ? 'not-allowed' : 'pointer', display:'flex',
                      alignItems:'center', gap:'0.75rem', padding:'0.85rem',
                      opacity: isFailed ? 0.4 : 1 }}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'8px',
                      background:'rgba(0,242,255,0.08)', display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                      {s.favicon
                        ? <img src={s.favicon} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
                        : <Wifi size={18} color="var(--accent-primary)" />
                      }
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <h4 style={{ fontSize:'0.85rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</h4>
                      <p style={{ fontSize:'0.68rem', opacity:0.45 }}>
                        {s.country} {s.bitrate ? `• ${s.bitrate}kbps` : ''} {isHttps ? '🔒' : '⚠️'}
                      </p>
                    </div>
                    <Play size={14} color="var(--accent-primary)" />
                  </motion.div>
                )
              }) : (
                <p style={{ gridColumn:'1/-1', textAlign:'center', opacity:0.4, padding:'3rem' }}>
                  Nenhuma estação encontrada. Tente o globo 🌍
                </p>
              )}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
