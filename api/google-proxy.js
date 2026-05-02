import { MercadoPagoConfig, Preference } from 'mercadopago'; // Unused here but kept for context if needed

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { code, client_id, redirect_uri } = req.body;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET; // Aceita qualquer um dos dois nomes

  if (!CLIENT_SECRET) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_SECRET (ou VITE_GOOGLE_CLIENT_SECRET) not configured in Vercel' });
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret: CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
