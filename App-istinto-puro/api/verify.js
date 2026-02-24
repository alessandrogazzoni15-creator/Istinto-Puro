export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) {
      return res.status(500).json({ error: "Chiave mancante su Vercel." });
    }

    const prompt = `Trova calciatori famosi che hanno giocato in tutte queste squadre: ${teams.join(', ')}. Rispondi solo con un JSON: {"collegamento_trovato": true, "calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}`;

    // MODIFICA CRUCIALE: Passiamo da v1beta a v1
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: "Errore Google: " + data.error.message });
    }

    if (data.candidates && data.candidates[0]) {
      let textResponse = data.candidates[0].content.parts[0].text;
      
      // Pulizia markdown se l'IA risponde con ```json
      const cleanJson = textResponse.replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(cleanJson));
    }

    return res.status(200).json({ collegamento_trovato: false, calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno: " + err.message });
  }
}
