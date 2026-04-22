import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCcw, Circle, Square, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Peer from 'peerjs';

const CameraStreamer = () => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  
  // PeerJS state
  const [peer, setPeer] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connections, setConnections] = useState(0);

  useEffect(() => {
    // Initialize PeerJS
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on('error', (err) => {
      console.error("Peer error:", err);
      setError("Erro na conexão PeerJS: " + err.type);
    });

    return () => {
      if (newPeer) newPeer.destroy();
    };
  }, []);

  // Listen for calls when streaming
  useEffect(() => {
    if (peer && stream && isStreaming) {
      peer.on('call', (call) => {
        console.log("Receiving call from:", call.peer);
        call.answer(stream);
        setConnections(prev => prev + 1);
        
        call.on('close', () => {
          setConnections(prev => Math.max(0, prev - 1));
        });
      });
    }
    return () => {
      if (peer) peer.off('call');
    };
  }, [peer, stream, isStreaming]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsStreaming(false);
      setConnections(0);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?streamId=${peerId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card" style={{ height: '75vh', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Transmissão ao Vivo</h3>
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>{isStreaming ? `Conectado: ${connections} espectadores` : 'Aguardando início'}</p>
        </div>
        
        {peerId && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.05)', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ opacity: 0.5 }}>ID:</span>
              <span style={{ fontWeight: 'bold' }}>{peerId}</span>
              <button onClick={copyLink} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
                {copied ? <Check size={14} color="var(--accent-primary)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', background: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Camera size={64} opacity={0.1} />
            <p style={{ opacity: 0.5 }}>Câmera pronta para iniciar</p>
          </div>
        )}

        {isStreaming && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background: 'rgba(255, 0, 0, 0.8)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }}></div>
              LIVE
            </motion.div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', padding: '0.5rem' }}>
        <button 
          onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
          disabled={!stream}
          style={{ width: '50px', height: '50px', borderRadius: '50%', padding: 0, justifyContent: 'center', opacity: !stream ? 0.5 : 1 }}
        >
          <RefreshCcw size={20} />
        </button>

        {!stream ? (
          <button className="primary" onClick={startCamera} style={{ padding: '0.75rem 2.5rem', borderRadius: '30px' }}>
            Ligar Câmera
          </button>
        ) : (
          <>
            {!isStreaming ? (
              <button 
                className="primary" 
                onClick={() => setIsStreaming(true)} 
                style={{ padding: '0.75rem 2.5rem', borderRadius: '30px', background: 'var(--accent-secondary)' }}
              >
                Transmitir via Link
              </button>
            ) : (
              <button 
                onClick={() => setIsStreaming(false)} 
                style={{ background: '#ff4444', color: 'white', padding: '0.75rem 2.5rem', borderRadius: '30px', border: 'none' }}
              >
                Parar Live
              </button>
            )}
            <button onClick={stopCamera} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '30px', border: 'none' }}>
              Desligar
            </button>
          </>
        )}

        <button 
          onClick={() => setIsRecording(!isRecording)}
          disabled={!stream}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            padding: 0, 
            justifyContent: 'center',
            opacity: !stream ? 0.5 : 1,
            borderColor: isRecording ? '#ff4444' : 'var(--border-color)'
          }}
        >
          {isRecording ? <Square size={20} fill="#ff4444" color="#ff4444" /> : <Circle size={20} fill="#ff4444" color="#ff4444" />}
        </button>
      </div>
    </div>
  );
};

export default CameraStreamer;
