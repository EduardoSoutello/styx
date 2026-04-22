import React from 'react';
import { FolderClosed, Music, Video, FileQuestion, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MediaExplorer = ({ files, onFileClick, onFolderClick }) => {
  if (!files || files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
        <p>Nenhum arquivo encontrado ou permissão não concedida.</p>
      </div>
    );
  }

  const getIcon = (mimeType) => {
    if (mimeType === 'application/vnd.google-apps.folder') return <FolderClosed size={48} className="icon-folder" />;
    if (mimeType.startsWith('audio/')) return <Music size={48} className="icon-music" />;
    if (mimeType.startsWith('video/')) return <Video size={48} className="icon-video" />;
    return <FileQuestion size={48} />;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
      {files.map((file) => (
        <motion.div
          key={file.id}
          className="card"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? onFolderClick(file) : onFileClick(file)}
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{ 
            width: '100%', 
            aspectRatio: '1', 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {file.thumbnailLink ? (
              <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            ) : (
              <div style={{ opacity: 0.5 }}>{getIcon(file.mimeType)}</div>
            )}
            {file.mimeType === 'application/vnd.google-apps.folder' && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                <ChevronRight size={16} />
              </div>
            )}
          </div>
          <h4 style={{ 
            fontSize: '0.9rem', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            padding: '0 0.5rem'
          }}>
            {file.name}
          </h4>
          <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '4px' }}>
            {file.mimeType.split('/').pop().toUpperCase()}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default MediaExplorer;
