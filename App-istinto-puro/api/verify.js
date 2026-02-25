const teamsDatabase = require('./teams.json'); 

export default async function handler(req, res) {
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { teamA, teamB } = req.body;

    // Normalizzazione input
    const normalizedA = teamA.toLowerCase().trim();
    const normalizedB = teamB.toLowerCase().trim();

    const idA = teamsDatabase[normalizedA];
    const idB = teamsDatabase[normalizedB];

    if (!idA || !idB) {
      return res.status(404).json({ 
        error: `Squadra non mappata: ${!idA ? teamA : teamB}` 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Trova 3 calciatori famosi che hanno giocato sia nel ${teamA} che nel ${teamB}. 
    Rispondi SOLO con un JSON: {"candidati": [{"nome": "Nome Cognome"}]}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson);

    // Risposta corretta per il frontend aggiornato
    return res.status(200).json({
      success: true,
      teamIds: { a: idA, b: idB },
      candidati: result.candidati
    });

  } catch (error) {
    return res.status(500).json({ error: "Errore: " + error.message });
  }
}
