// Usa require per includere il JSON direttamente nel pacchetto di deploy
const teamsDatabase = require('./teams.json'); 

export default async function handler(req, res) {
  // Header CORS obbligatori
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { teamA, teamB } = req.body;
    
    // Normalizzazione input per matchare le chiavi del JSON
    const nameA = teamA.toLowerCase().trim();
    const nameB = teamB.toLowerCase().trim();

    const idA = teamsDatabase[nameA];
    const idB = teamsDatabase[nameB];

    // Se la squadra non è nel JSON, invia un errore chiaro
    if (!idA || !idB) {
      return res.status(404).json({ 
        error: `Squadra non trovata: ${!idA ? teamA : teamB}. Verifica che sia nel database.` 
      });
    }

    // Chiamata a Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Rispondi solo con un JSON. Trova 3 calciatori famosi che hanno giocato sia nel ${teamA} che nel ${teamB}. Formato: {"candidati": [{"nome": "Nome Cognome"}]}` }] }]
      })
    });

    const data = await response.json();
    
    if (!data.candidates) throw new Error("L'AI non ha risposto. Controlla la chiave API.");

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
