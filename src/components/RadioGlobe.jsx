import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
]

async function radioFetch(path) {
  for (const server of API_SERVERS) {
    try {
      const res = await fetch(`${server}${path}`, { headers: { 'User-Agent': 'StyxMediaApp/1.0' } })
      if (res.ok) return res.json()
    } catch { /* try next */ }
  }
  throw new Error('All servers failed')
}

export default function RadioGlobe({ onStationClick }) {
  const containerRef = useRef(null)
  const globeRef     = useRef(null)
  const GlobeComp    = useRef(null)
  const [stations, setStations] = useState([])
  const [loading, setLoading]   = useState(true)
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    import('react-globe.gl').then(m => { GlobeComp.current = m.default; setReady(true) })
    radioFetch('/json/stations/search?limit=500&order=clickcount&reverse=true&hidebroken=true&has_geo_info=true')
      .then(data => {
        const valid = data.filter(s => s.geo_lat && s.geo_long && s.url_resolved)
        setStations(valid)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const GC = GlobeComp.current

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', position:'relative' }}>
      {(loading || !ready) && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <Loader2 size={36} color="var(--accent-primary)" style={{ animation:'spin 1s linear infinite' }} />
          <p style={{ marginTop:'1rem', opacity:0.6, fontSize:'0.9rem' }}>Carregando globo...</p>
        </div>
      )}

      {GC && !loading && (
        <GC
          ref={globeRef}
          width={containerRef.current?.clientWidth  || 600}
          height={containerRef.current?.clientHeight || 500}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          atmosphereColor="#7000ff"
          atmosphereAltitude={0.12}
          pointsData={stations}
          pointLat={d => parseFloat(d.geo_lat)}
          pointLng={d => parseFloat(d.geo_long)}
          pointColor={d => d.url_resolved?.startsWith('https') ? '#00f2ff' : '#ff6b00'}
          pointAltitude={0.025}
          pointRadius={0.5}
          pointLabel={d =>
            `<div style="background:rgba(0,0,0,0.85);padding:4px 10px;border-radius:8px;border:1px solid #00f2ff;font-size:12px;color:white">
               <b>${d.name}</b><br/><span style="opacity:0.6">${d.country}</span>
             </div>`
          }
          onPointClick={d => onStationClick({ stationuuid:d.stationuuid, name:d.name, url_resolved:d.url_resolved, country:d.country, favicon:d.favicon })}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
