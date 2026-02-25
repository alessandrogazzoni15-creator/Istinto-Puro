// Importiamo il file .js che Vercel non può "perdere"
const teamsDatabase = require('./teams.js'); 

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { teamA, teamB } = req.body;
    
    // Pulizia e normalizzazione
    const nameA = teamA.toLowerCase().trim();
    const nameB = teamB.toLowerCase().trim();

    const idA = teamsDatabase[nameA];
    const idB = teamsDatabase[nameB];

    if (!idA || !idB) {
      return res.status(404).json({ 
        error: `Squadra non mappata: ${!idA ? teamA : teamB}. Usa nomi come milan, inter, juventus.` 
      });
    }

    // Chiamata a Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rispondi SOLO in JSON. Trova 3 calciatori famosi in comune tra ${teamA} e ${teamB}. Formato: {"candidati": [{"nome": "Nome Cognome"}]}` }] }]
      })
    });

    const data = await response.json();
    if (!data.candidates) throw new Error("Errore Gemini: Controlla la chiave API.");

    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      teamIds: { a: idA, b: idB },
      candidati: result.candidati
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}