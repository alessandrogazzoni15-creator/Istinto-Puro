export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { teams } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) return res.status(500).json({ error: 'Chiave API mancante su Vercel' });

  const prompt = `Trova calciatori che hanno giocato in: ${teams.join(', ')}. Rispondi SOLO JSON: {"collegamento_trovato": true, "calciatori": []}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();

    // SE GOOGLE DA ERRORE, LO VEDREMO QUI
    if (data.error) {
      return res.status(500).json({ error: "ERRORE GOOGLE REALE: " + data.error.message });
    }

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: "Google non ha restituito risultati.", debug: data });
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    res.status(200).json(JSON.parse(textResponse));

  } catch (e) {
    res.status(500).json({ error: "Errore interno: " + e.message });
  }
}
