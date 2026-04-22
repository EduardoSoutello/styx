import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Radio } from 'lucide-react'

const RADIO_API = 'https://at1.api.radio-browser.info/json'

function RadioGlobe({ onStationClick }) {
  const globeRef = useRef(null)
  const Globe = useRef(null)
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredStation, setHoveredStation] = useState(null)
  const [globeReady, setGlobeReady] = useState(false)
  const containerRef = useRef(null)

  // Lazy-load react-globe.gl (it's heavy)
  useEffect(() => {
    import('react-globe.gl').then((mod) => {
      Globe.current = mod.default
      setGlobeReady(true)
    })
  }, [])

  useEffect(() => {
    fetchGlobeStations()
  }, [])

  const fetchGlobeStations = async () => {
    setLoading(true)
    try {
      const url = `${RADIO_API}/stations/search?limit=300&order=clickcount&reverse=true&hidebroken=true&is_https=true&has_geo_info=true`
      const res = await fetch(url, { headers: { 'User-Agent': 'StyxMediaApp/1.0' } })
      const data = await res.json()
      const valid = data.filter(s => s.geo_lat && s.geo_long && parseFloat(s.geo_lat) !== 0)
      setStations(valid)
    } catch (err) {
      console.error('Globe fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePointClick = useCallback((point) => {
    onStationClick({
      stationuuid: point.stationuuid,
      name: point.name,
      url_resolved: point.url_resolved,
      country: point.country,
    })
  }, [onStationClick])

  const GlobeComponent = Globe.current

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {(loading || !globeReady) && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 10
        }}>
          <Loader2 size={40} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', opacity: 0.6 }}>Carregando estações no globo...</p>
        </div>
      )}

      {hoveredStation && (
        <div style={{
          position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid var(--accent-primary)', borderRadius: '12px',
          padding: '0.75rem 1.5rem', zIndex: 20, textAlign: 'center',
          pointerEvents: 'none', maxWidth: '300px',
          boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)'
        }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--accent-primary)' }}>
            {hoveredStation.name}
          </h4>
          <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>{hoveredStation.country}</p>
        </div>
      )}

      {GlobeComponent && !loading && (
        <GlobeComponent
          ref={globeRef}
          width={containerRef.current?.clientWidth || 600}
          height={containerRef.current?.clientHeight || 500}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#7000ff"
          atmosphereAltitude={0.15}
          pointsData={stations}
          pointLat={(d) => parseFloat(d.geo_lat)}
          pointLng={(d) => parseFloat(d.geo_long)}
          pointColor={() => '#00f2ff'}
          pointAltitude={0.02}
          pointRadius={0.4}
          pointLabel={(d) => `<div style="background:rgba(0,0,0,0.85);padding:4px 8px;border-radius:6px;border:1px solid #00f2ff;font-size:12px;color:white">${d.name}<br/><span style="opacity:0.6;font-size:10px">${d.country}</span></div>`}
          onPointClick={handlePointClick}
          onPointHover={(point) => setHoveredStation(point || null)}
          pointsMerge={false}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default RadioGlobe
