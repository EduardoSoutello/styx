import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { userId, planType, email } = req.body;

  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            title: `Neblina Pro - ${planType === 'annual' ? 'Anual' : 'Mensal'}`,
            quantity: 1,
            unit_price: planType === 'annual' ? 21.99 : 1.99,
            currency_id: 'BRL'
          }
        ],
        payer: {
          email: email
        },
        external_reference: userId, // Vincula o pagamento ao ID do usuário
        metadata: {
          plan_type: planType // 'monthly' ou 'annual'
        },
        back_urls: {
          success: 'https://neblina-cloud.vercel.app/?payment=success',
          failure: 'https://neblina-cloud.vercel.app/?payment=failure',
          pending: 'https://neblina-cloud.vercel.app/?payment=pending'
        },
        auto_return: 'approved',
        notification_url: 'https://neblina-cloud.vercel.app/api/webhook'
      }
    });

    res.status(200).json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error('MP Error:', error);
    res.status(500).json({ error: error.message });
  }
}
