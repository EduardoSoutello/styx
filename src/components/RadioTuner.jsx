import { useState, useEffect } from 'react'
import { Radio, Search, Globe, Play, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

const COUNTRIES = [
  { name: 'Brasil', code: 'BR', flag: 'https://flagcdn.com/w320/br.png' },
  { name: 'Russia', code: 'RU', flag: 'https://flagcdn.com/w320/ru.png' },
  { name: 'China', code: 'CN', flag: 'https://flagcdn.com/w320/cn.png' },
  { name: 'India', code: 'IN', flag: 'https://flagcdn.com/w320/in.png' },
  { name: 'Mix Latino', tag: 'latino', flag: 'https://images.unsplash.com/photo-1518107616385-ad30833dd607?q=80&w=320&auto=format&fit=crop' }
]

const RADIO_API_BASE = 'https://at1.api.radio-browser.info/json'

function RadioTuner({ onStationClick }) {
  const [activeFilter, setActiveFilter] = useState(COUNTRIES[0])
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStations()
  }, [activeFilter])

  const fetchStations = async (search = '') => {
    setLoading(true)
    setError(null)
    try {
      // is_https=true é CRUCIAL para funcionar no Vercel/HTTPS
      let url = `${RADIO_API_BASE}/stations/search?limit=30&order=clickcount&reverse=true&hidebroken=true&is_https=true`
      
      if (search) {
        url += `&name=${encodeURIComponent(search)}`
      } else if (activeFilter.code) {
        url += `&countrycode=${activeFilter.code}`
      } else if (activeFilter.tag) {
        url += `&tag=${activeFilter.tag}`
      }

      const response = await fetch(url, {
        headers: { 'User-Agent': 'StyxMediaApp/1.0' }
      })
      
      if (!response.ok) throw new Error('Falha ao carregar rádios')
      
      const data = await response.json()
      setStations(data)
    } catch (err) {
      setError('Não foi possível carregar as estações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchStations(searchTerm)
  }

  return (
    <div className="radio-tuner">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Radio color="var(--accent-primary)" /> Sintonizador Global
        </h2>

        <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome (Sintonizando HTTPS...)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%',
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '0.75rem 1rem 0.75rem 3rem', 
              color: 'white' 
            }} 
          />
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {COUNTRIES.map((country) => (
            <button
              key={country.name}
              onClick={() => { setActiveFilter(country); setSearchTerm(''); }}
              style={{
                height: '80px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '12px',
                border: activeFilter.name === country.name ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: 'none',
                padding: 0,
                cursor: 'pointer'
              }}
            >
              <img 
                src={country.flag} 
                alt="" 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  opacity: activeFilter.name === country.name ? 0.6 : 0.3,
                  transition: 'opacity 0.3s ease'
                }} 
              />
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
                fontWeight: 800,
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: activeFilter.name === country.name ? 'var(--accent-primary)' : 'white'
              }}>
                {country.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <p>Sintonizando estações seguras...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ border: '1px solid #ff4444', color: '#ff4444', textAlign: 'center' }}>
          <p>{error}</p>
          <button onClick={() => fetchStations()} style={{ marginTop: '1rem', marginInline: 'auto' }}>Tentar Novamente</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {stations.length > 0 ? stations.map((station) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={station.stationuuid}
              className="card radio-card"
              onClick={() => onStationClick(station)}
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                padding: '1rem'
              }}
            >
              <div 
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px', 
                  background: 'rgba(0, 242, 255, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}
              >
                {station.favicon ? (
                  <img src={station.favicon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <Globe size={20} color="var(--accent-primary)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</h4>
                <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>{station.country} • {station.bitrate}kbps</p>
              </div>
              <Play size={16} color="var(--accent-primary)" />
            </motion.div>
          )) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
              Nenhuma rádio HTTPS encontrada. Tente outro filtro.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RadioTuner
