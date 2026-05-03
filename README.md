# ☁️ Neblina

**Neblina** é um gerenciador de armazenamento multi-nuvem (Multi-Cloud Manager) projetado para unificar o acesso aos seus arquivos espalhados por diferentes provedores, como Google Drive, Dropbox, OneDrive e MEGA, em uma única interface moderna e centralizada.

---

## 🚀 Funcionalidades Principais

- **Múltiplos Provedores:** Conecte contas do Google Drive, Dropbox, OneDrive e MEGA.
- **Interface Unificada:** Navegue por pastas, visualize e gerencie arquivos de diferentes provedores no mesmo layout fluido.
- **Transferência Inter-nuvens:** Transfira arquivos diretamente de uma nuvem para outra de forma intuitiva.
- **Baixar Pastas Completas:** Gere arquivos `.zip` de diretórios inteiros automaticamente.
- **Segurança de Tokens:** Utilização de servidor proxy Serverless na Vercel para proteger chaves e senhas confidenciais de vazamento (ex: `GOOGLE_CLIENT_SECRET`).

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, Framer Motion (para animações) e Tailwind/CSS Vanilla.
- **Autenticação:** Firebase Auth (Google) + Firestore (para persistência de contas conectadas).
- **Integrações (APIs):**
  - Google Drive API v3
  - Dropbox API
  - Microsoft Graph API (OneDrive)
  - MEGA (via credenciais criptografadas localmente).
- **Backend / Proxy:** Vercel Serverless Functions (`/api/google-proxy.js`).

## ⚙️ Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto contendo as seguintes variáveis:

```env
# Google OAuth (Apenas o Client ID vai pro front-end)
VITE_GOOGLE_CLIENT_ID=seu-google-client-id.apps.googleusercontent.com

# Firebase Config (Substitua pelos dados do seu projeto)
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=neblina-cloud.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neblina-cloud
VITE_FIREBASE_STORAGE_BUCKET=neblina-cloud.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
VITE_FIREBASE_APP_ID=seu-app-id

# Outros Provedores
VITE_DROPBOX_CLIENT_ID=seu-dropbox-client-id
VITE_ONEDRIVE_CLIENT_ID=seu-onedrive-client-id
```

### 🔒 Vercel (Produção)
Na dashboard da **Vercel**, além das variáveis acima, você **DEVE** adicionar a seguinte variável de ambiente (sem o prefixo `VITE_`):

```env
GOOGLE_CLIENT_SECRET=sua-chave-secreta-do-google
```

## 📦 Como Rodar Localmente

1. Clone o repositório: `git clone https://github.com/EduardoSoutello/neblina.git`
2. Instale as dependências: `npm install`
3. Execute o servidor de desenvolvimento: `npm run dev`

*(Nota: Quando executado em `localhost`, a aplicação se comunica diretamente com a API do Google para autenticação. Em produção, a requisição passa pelo arquivo de proxy para ocultar o `CLIENT_SECRET`.)*

## 📜 Licença

Desenvolvido por Eduardo Soutello. Uso restrito e pessoal.
