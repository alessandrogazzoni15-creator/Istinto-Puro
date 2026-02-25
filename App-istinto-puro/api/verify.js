function normalizza(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');

    const prompt = `Sei un esperto di calcio mondiale. Trova calciatori che hanno giocato in TUTTE queste squadre: ${teamsList}.
Restituisci MASSIMO 5 candidati di cui sei più sicuro.
Rispondi SOLO con JSON valido: {"calciatori": [{"nome": "Nome Cognome"}]}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const geminiData = await geminiRes.json();
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ calciatori: [] });
    }

    const cleaned = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const candidati = JSON.parse(cleaned).calciatori || [];
    console.log("Candidati Gemini:", JSON.stringify(candidati
