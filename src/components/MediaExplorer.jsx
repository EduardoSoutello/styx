import React from 'react';
import { FolderClosed, Music, Video, FileQuestion, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const MediaExplorer = ({ files, onFileClick, onFolderClick, currentFileId, isPlaying }) => {
  if (!files || files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <p>Nenhum arquivo encontrado ou permissão não concedida.</p>
      </div>
    );
  }

  const getIcon = (mimeType, size = 28) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <FolderClosed size={size} color="var(--accent-primary)" />;
    if (mimeType.startsWith('audio/')) return <Music size={size} color="#a855f7" />;
    if (mimeType.startsWith('video/')) return <Video size={size} color="#06b6d4" />;
    return <FileQuestion size={size} opacity={0.4} />;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '0.75rem'
    }}>
      {files.map((file) => {
        const isActive = currentFileId === file.id;
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
        return (
          <motion.div
            key={file.id}
            className="card"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => isFolder ? onFolderClick(file) : onFileClick(file)}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              padding: '0.75rem',
              border: isActive ? '1px solid var(--accent-primary)' : undefined,
              boxShadow: isActive ? 'var(--shadow-glow)' : undefined,
            }}
          >
            <div style={{
              width: '100%',
              aspectRatio: '1',
              background: isActive ? 'rgba(0,242,255,0.08)' : 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.6rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {file.thumbnailLink ? (
                <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
              ) : (
                getIcon(file.mimeType)
              )}
              {isActive && isPlaying && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '22px' }}>
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <div key={i} style={{
                        width: '4px', background: 'var(--accent-primary)', borderRadius: '2px',
                        animation: `equalize 0.8s ease-in-out ${delay}s infinite alternate`
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <h4 style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
              {file.name}
            </h4>
            <p style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: '2px' }}>
              {file.mimeType.split('/').pop().replace('vnd.google-apps.', '').toUpperCase().slice(0, 6)}
            </p>
          </motion.div>
        );
      })}

      <style>{`
        @keyframes equalize {
          from { height: 6px; }
          to   { height: 18px; }
        }
      `}</style>
    </div>
  );
};

export default MediaExplorer;
