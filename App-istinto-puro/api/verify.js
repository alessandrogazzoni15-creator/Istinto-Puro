export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante." });

    // Prompt più rigido per evitare chiacchiere dall'IA
    const prompt = `Trova calciatori famosi in comune tra: ${teams.join(', ')}. 
    Rispondi SOLO con questo JSON: {"calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. 
    Se non trovi nessuno: {"calciatori": []}. 
    Niente testo prima o dopo il JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    // 1. Gestione errore esplicito di Google
    if (data.error) {
      return res.status(500).json({ error: "Google API Error: " + data.error.message });
    }

    // 2. Gestione blocco per sicurezza (Safety)
    if (data.candidates && data.candidates[0].finishReason === "SAFETY") {
        return res.status(200).json({ calciatori: [], message: "Ricerca bloccata dai filtri di sicurezza di Google." });
    }

    // 3. Estrazione e invio
    if (data.candidates && data.candidates[0].content) {
      const textResponse = data.candidates[0].content.parts[0].text;
      try {
        // Pulizia e parsing
        const cleanJson = textResponse.substring(textResponse.indexOf('{'), textResponse.lastIndexOf('}') + 1);
        return res.status(200).json(JSON.parse(cleanJson));
      } catch (e) {
        console.error("Errore parse:", textResponse);
        return res.status(500).json({ error: "Formato risposta non valido." });
      }
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno server: " + err.message });
  }
}
