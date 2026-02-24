export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { teams } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) return res.status(500).json({ error: 'Chiave API mancante su Vercel' });

  const prompt = `Trova calciatori che hanno giocato in queste squadre: ${teams.join(', ')}. Rispondi ESCLUSIVAMENTE con un JSON con questa struttura: {"collegamento_trovato": true, "calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. Non aggiungere testo prima o dopo il JSON.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: "Errore Google: " + data.error.message });
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(textResponse));

  } catch (e) {
    console.error("Errore Backend:", e);
    res.status(500).json({ error: "Il server non ha potuto elaborare la richiesta." });
  }
}
