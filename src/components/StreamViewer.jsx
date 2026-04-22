import React, { useEffect, useRef, useState } from 'react';
import { Camera, Radio, Play, AlertCircle } from 'lucide-react';
import Peer from 'peerjs';

const StreamViewer = ({ streamId }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!streamId) return;

    const peer = new Peer();
    
    peer.on('open', (id) => {
      console.log('Viewer Peer ID:', id);
      // Initiate call to the streamer
      const call = peer.call(streamId, new MediaStream()); // Send empty stream
      
      call.on('stream', (remoteStream) => {
        setStream(remoteStream);
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
        }
        setLoading(false);
      });

      call.on('error', (err) => {
        console.error('Call error:', err);
        setError('Erro ao conectar à transmissão: ' + err.message);
        setLoading(false);
      });
    });

    peer.on('error', (err) => {
      console.error('Peer viewer error:', err);
      setError('Erro de PeerJS: ' + err.type);
      setLoading(false);
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, [streamId]);

  return (
    <div className="card" style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', position: 'relative' }}>
      {loading && !error && (
        <div style={{ textAlign: 'center' }}>
          <Radio size={48} className="icon-pulse" color="var(--accent-primary)" style={{ animation: 'pulse 2s infinite' }} />
          <h2 style={{ marginTop: '1.5rem' }}>Conectando à transmissão...</h2>
          <p style={{ opacity: 0.5 }}>Aguardando sinal de {streamId}</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: '#ff4444', padding: '2rem' }}>
          <AlertCircle size={48} />
          <h2 style={{ marginTop: '1.5rem' }}>Ops! Algo deu errado</h2>
          <p style={{ opacity: 0.7 }}>{error}</p>
          <button className="primary" onClick={() => window.location.reload()} style={{ marginTop: '2rem' }}>Tentar Novamente</button>
        </div>
      )}

      {stream && (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1rem', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '10px', height: '10px', background: '#ff0000', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>ASSISTINDO AO VIVO</span>
          </div>
        </>
      )}
    </div>
  );
};

export default StreamViewer;
