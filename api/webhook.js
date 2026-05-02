import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Inicializa Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } catch (e) {
    console.error('Firebase Admin Init Error:', e);
  }
}

const db = admin.firestore();
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { query } = req;
  const topic = query.topic || query.type || (req.body && req.body.type);

  try {
    // Mercado Pago envia notificações de diferentes tópicos
    if (topic === 'payment' || topic === 'payment.updated') {
      const paymentId = query.id || (req.body && req.body.data && req.body.data.id);
      
      if (!paymentId) return res.status(400).send('No Payment ID');

      const payment = new Payment(client);
      const data = await payment.get({ id: paymentId });

      if (data.status === 'approved') {
        const userId = data.external_reference;
        const amount = data.transaction_amount;
        const planType = data.metadata?.plan_type || 'monthly';
        
        // Calcula data de expiração
        const expiryDate = new Date();
        if (planType === 'annual') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
        
        // Atualiza o usuário para PRO no Firestore
        await db.collection('users').doc(userId).set({
          plan: 'pro',
          paymentStatus: 'approved',
          lastPaymentDate: new Date().toISOString(),
          expiryDate: expiryDate.toISOString(), // Data de validade calculada
          paymentAmount: amount,
          planDuration: planType
        }, { merge: true });
        
        console.log(`User ${userId} upgraded to PRO via Webhook!`);
      }
    }
    
    // Mercado Pago exige retorno 200 ou 201
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send(error.message);
  }
}
