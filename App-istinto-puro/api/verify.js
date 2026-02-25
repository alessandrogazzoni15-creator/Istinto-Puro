module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante." });

    const prompt = `Trova i calciatori famosi che hanno giocato sia nel ${teams[0]} che nel ${teams[1]}. 
    Rispondi SOLO con questo formato JSON: {"calciatori": [{"nome": "Nome", "squadre_confermate": "SQUADRE", "fonte_url": "URL_GOOGLE"}]}`;

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

    // Verifichiamo se abbiamo una risposta valida
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      try {
        const parsed = JSON.parse(text);
        return res.status(200).json(parsed);
      } catch (e) {
        console.error("Errore parse JSON:", text);
      }
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno: " + err.message });
  }
};
