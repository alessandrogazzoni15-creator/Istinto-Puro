module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante." });

    const prompt = `Trova calciatori famosi che hanno giocato sia nel ${teams[0]} che nel ${teams[1]}. 
    Rispondi ESCLUSIVAMENTE con questo formato JSON senza testo extra: 
    {"calciatori": [{"nome": "Nome Calciatore", "squadre_confermate": "${teams[0]} e ${teams[1]}", "fonte_url": "https://www.google.com/search?q=trasferimenti+Nome+Calciatore"}]}`;

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
      try {
        const parsed = JSON.parse(text);
        // Forza la risposta ad avere sempre la chiave "calciatori"
        const result = parsed.calciatori ? parsed : { calciatori: Object.values(parsed)[0] || [] };
        return res.status(200).json(result);
      } catch (e) {
        return res.status(200).json({ calciatori: [] });
      }
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
