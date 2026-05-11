// Vercel serverless function: POST /api/subscribe
// Receives an email from the landing page form, calls Beehiiv's API server-side
// using the secret API key (never exposed to browser).

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  // Basic email validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const PUB_ID = process.env.BEEHIIV_PUB_ID;
  const API_KEY = process.env.BEEHIIV_API_KEY;

  if (!PUB_ID || !API_KEY) {
    console.error('Missing Beehiiv environment variables');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'qadvantage.io',
          utm_medium: 'website',
          utm_campaign: 'landing-page'
        })
      }
    );

    const data = await beehiivResponse.json();

    if (beehiivResponse.ok) {
      return res.status(200).json({ success: true });
    } else {
      console.error('Beehiiv API error:', data);
      return res.status(beehiivResponse.status).json({
        error: data.errors?.[0]?.message || 'Subscription failed'
      });
    }
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}