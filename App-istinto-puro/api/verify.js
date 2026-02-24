export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });

    const prompt = `Trova calciatori che hanno giocato in: ${teams.join(', ')}. Rispondi SOLO con un oggetto JSON: {"collegamento_trovato": true, "calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. Non aggiungere commenti.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" } // Forza Google a rispondere in JSON
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: "Errore Google: " + data.error.message });
    }

    if (data.candidates && data.candidates[0]) {
      const textResponse = data.candidates[0].content.parts[0].text;
      // Parsing ultra-sicuro: cerca la prima '{' e l'ultima '}'
      const start = textResponse.indexOf('{');
      const end = textResponse.lastIndexOf('}') + 1;
      const jsonString = textResponse.substring(start, end);
      
      return res.status(200).json(JSON.parse(jsonString));
    }

    return res.status(200).json({ collegamento_trovato: false, calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno: " + err.message });
  }
}
