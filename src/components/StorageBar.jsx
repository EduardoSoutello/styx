export default function StorageBar({ used = 0, total = 0, color = '#00f2ff' }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0

  const fmt = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const barColor = pct > 90 ? '#ff4444' : pct > 70 ? '#f59e0b' : color

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
        <span style={{ fontSize: '0.68rem', opacity: 0.5 }}>{fmt(used)} usado</span>
        <span style={{ fontSize: '0.68rem', opacity: 0.5 }}>{total ? fmt(total) : '∞'}</span>
      </div>
      <div style={{
        height: '4px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: barColor,
          borderRadius: '4px',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: `0 0 8px ${barColor}66`
        }} />
      </div>
    </div>
  )
}
