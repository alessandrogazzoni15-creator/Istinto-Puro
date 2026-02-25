module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');

    const prompt = `Sei un database enciclopedico del calcio mondiale. 
Trova calciatori professionisti che hanno giocato in TUTTE queste squadre: ${teamsList}.

REGOLE ASSOLUTE:
- Includi un calciatore SOLO se hai la certezza assoluta che ha giocato in OGNUNA delle squadre elencate
- Verifica mentalmente ogni calciatore: anno per anno, squadra per squadra
- Se hai anche solo un 1% di dubbio su una squadra, NON includere il calciatore
- Includi sia calciatori famosi che meno noti
- Meglio restituire 0 risultati che uno sbagliato

Rispondi SOLO con JSON valido, nessun testo aggiuntivo:
{"calciatori": [{"nome": "Nome Cognome", "squadre_confermate": "Squadra1 (anno-anno), Squadra2 (anno-anno)", "fonte_url": "https://it.wikipedia.org/wiki/Nome_Cognome"}]}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    const geminiData = await geminiRes.json();
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ calciatori: [] });
    }

    const cleaned = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const risultato = JSON.parse(cleaned);
    return res.status(200).json(risultato);

  } catch (err) {
    return res.status(500).json({ error: "Errore: " + err.message });
  }
};
