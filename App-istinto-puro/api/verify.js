const teamsDatabase = require('./teams.json'); 

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { teamA, teamB } = req.body;
    const idA = teamsDatabase[teamA.toLowerCase().trim()];
    const idB = teamsDatabase[teamB.toLowerCase().trim()];

    if (!idA || !idB) {
      return res.status(404).json({ error: `Squadra non trovata: ${!idA ? teamA : teamB}` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Trova 3 calciatori famosi che hanno giocato sia nel ${teamA} che nel ${teamB}. Rispondi SOLO con un JSON: {"candidati": [{"nome": "Nome Cognome"}]}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());

    return res.status(200).json({
      success: true,
      teamIds: { a: idA, b: idB },
      candidati: result.candidati
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
