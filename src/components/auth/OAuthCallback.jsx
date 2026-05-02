import { useEffect, useState, useRef } from 'react'
import { CloudManager } from '../../services/CloudManager'
import { exchangeDropboxCode } from '../../services/providers/DropboxProvider'
import { exchangeOneDriveCode } from '../../services/providers/OneDriveProvider'

export default function OAuthCallback({ provider }) {
  const [status, setStatus] = useState('Processando autenticação...')
  const [error, setError] = useState(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    async function processAuth() {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const errorParam = params.get('error')

        if (errorParam) {
          throw new Error(params.get('error_description') || 'Acesso negado ou erro na autorização.')
        }

        if (!code) {
          throw new Error('Nenhum código de autorização encontrado na URL.')
        }

        setStatus(`Conectando com ${provider}...`)

        if (provider === 'dropbox') {
          const tokenData = await exchangeDropboxCode(code)
          if (!tokenData.access_token) throw new Error('Falha ao obter token do Dropbox')
          await CloudManager.connectDropbox(tokenData)
        } else if (provider === 'onedrive') {
          const tokenData = await exchangeOneDriveCode(code)
          if (!tokenData.access_token) throw new Error('Falha ao obter token do OneDrive')
          await CloudManager.connectOneDrive(tokenData)
        } else {
          throw new Error('Provedor desconhecido: ' + provider)
        }

        setStatus('Sucesso! Redirecionando...')
        
        // Wait a brief moment and redirect home
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)

      } catch (err) {
        console.error('OAuth Callback Error:', err)
        setError(err.message || 'Falha na autenticação')
      }
    }

    processAuth()
  }, [provider])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
        {error ? (
          <>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Erro na Autenticação</h2>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error}</p>
            <button className="primary" onClick={() => window.location.href = '/'} style={{ width: '100%', justifyContent: 'center' }}>
              Voltar ao Início
            </button>
          </>
        ) : (
          <>
            <div className="spin-small" style={{ width: 40, height: 40, margin: '0 auto 1.5rem', borderWidth: 3 }} />
            <h2 style={{ marginBottom: '0.5rem' }}>Aguarde...</h2>
            <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{status}</p>
          </>
        )}
      </div>
    </div>
  )
}
