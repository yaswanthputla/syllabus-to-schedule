// Vercel serverless function: keeps your API key on the server.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Setup needed: add ANTHROPIC_API_KEY in Vercel > Settings > Environment Variables, then redeploy.' });
  const { system = '', prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 60000) return res.status(400).json({ error: 'Invalid or too-long input.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system: String(system).slice(0, 8000), messages: [{ role: 'user', content: prompt }] })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed' });
    res.json({ text: j.content.map(c => c.text || '').join('') });
  } catch (e) { res.status(500).json({ error: 'Server error: ' + e.message }); }
};
