module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "Chiave mancante." });

    const prompt = `Trova da 1 a 5 calciatori famosi che hanno giocato sia nel ${teams[0]} che nel ${teams[1]}. 
    Rispondi SOLO con questo JSON: {"calciatori": [{"nome": "Nome", "squadre_confermate": "Squadre", "fonte_url": "[https://www.google.com/search?q=trasferimenti+Nome](https://www.google.com/search?q=trasferimenti+Nome)"}]}`;

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
      let text = data.candidates[0].content.parts[0].text.trim();
      
      // Estrazione sicura: cerca la prima { e l'ultima }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const cleanJson = text.substring(firstBrace, lastBrace + 1);
        try {
          const parsedData = JSON.parse(cleanJson);
          return res.status(200).json(parsedData);
        } catch (e) {
          console.error("Errore parse:", text);
        }
      }
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
