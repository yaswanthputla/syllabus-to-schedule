// Vercel serverless function (Google Gemini version): keeps your API key on the server.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Setup needed: add GEMINI_API_KEY in Vercel > Settings > Environment Variables, then redeploy.' });
  const model = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
  const { system = '', prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 60000) return res.status(400).json({ error: 'Invalid or too-long input.' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: String(system).slice(0, 8000) || 'You are a helpful study assistant.' }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000 }
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI request failed' });
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const text = parts.map(p => p.text || '').join('');
    if (!text) return res.status(502).json({ error: 'The AI returned an empty answer. Try again.' });
    res.json({ text });
  } catch (e) { res.status(500).json({ error: 'Server error: ' + e.message }); }
};
