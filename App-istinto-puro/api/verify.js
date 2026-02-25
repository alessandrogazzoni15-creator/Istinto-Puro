export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    // Prompt ottimizzato per trovare RISULTATI REALI
    const prompt = `Elenca almeno 1 calciatore che ha giocato sia nel ${teams.join(' che nel ')}. 
    Rispondi esclusivamente con questo schema JSON:
    {"calciatori": [{"nome": "Nome Calciatore", "squadre_confermate": "Squadre", "fonte_url": "https://www.google.com/search?q=Nome+Calciatore+transfermarkt"}]}
    Se non trovi nessuno, scrivi {"calciatori": []}. 
    Non aggiungere chiacchiere.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      // Parsing sicuro del JSON
      return res.status(200).json(JSON.parse(text));
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore: " + err.message });
  }
}
