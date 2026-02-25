export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante." });

    const prompt = `Trova calciatori famosi in comune tra: ${teams.join(', ')}. Rispondi SOLO con questo JSON: {"calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. Se non trovi nessuno: {"calciatori": []}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Estrazione ultra-sicura del testo
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const rawText = data.candidates[0].content.parts[0].text;
      
      // Togliamo eventuali blocchi markdown ```json ... ``` se presenti
      const cleanJson = rawText.replace(/```json|```/gi, "").trim();
      
      try {
        const parsed = JSON.parse(cleanJson);
        return res.status(200).json(parsed);
      } catch (e) {
        // Se il parse fallisce, mandiamo una risposta vuota invece di un errore 500
        console.error("Errore di parsing:", rawText);
        return res.status(200).json({ calciatori: [] });
      }
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno: " + err.message });
  }
}
