// Usiamo require per massima compatibilità con la tua configurazione Vercel
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  // Gestione metodo
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "API Key mancante su Vercel." });

    const prompt = `Agisci come un esperto di storia del calcio. 
Trova i calciatori famosi che hanno giocato sia nella squadra di calcio "${teams[0]}" che nella squadra di calcio "${teams[1]}".
Puoi restituire da 1 a un massimo di 5 nomi. Se ne trovi solo uno, va bene lo stesso.
Rispondi ESCLUSIVAMENTE con questo formato JSON:
{"calciatori": [{"nome": "Nome", "squadre_confermate": "${teams[0].toUpperCase()}, ${teams[1].toUpperCase()}", "fonte_url": "https://www.google.com/search?q=trasferimenti+Nome+calciatore"}]}
Se non trovi alcun collegamento certo, rispondi rigorosamente con: {"calciatori": []}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 
        }
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      let text = data.candidates[0].content.parts[0].text;
      const cleanJson = text.replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(cleanJson));
    }

    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: "Errore interno: " + err.message });
  }
};
