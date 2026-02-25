const path = require('path');
const fs = require('fs');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { teamA, teamB } = req.body;
    
    // Caricamento sicuro del database squadre
    const filePath = path.join(process.cwd(), 'api', 'teams.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const teamsDatabase = JSON.parse(fileData);

    const idA = teamsDatabase[teamA.toLowerCase().trim()];
    const idB = teamsDatabase[teamB.toLowerCase().trim()];

    if (!idA || !idB) {
      return res.status(404).json({ error: `Squadra non trovata nel database: ${!idA ? teamA : teamB}` });
    }

    // Chiamata a Gemini con istruzioni ferree
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Trova esattamente 3 calciatori famosi in comune tra ${teamA} e ${teamB}. Rispondi esclusivamente con un oggetto JSON così: {"candidati": [{"nome": "Nome Cognome"}]}. Non aggiungere altro testo.` }] }]
      })
    });

    const data = await response.json();
    
    // Se Gemini fallisce o finisce la quota, lo intercettiamo qui
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Gemini non ha restituito risultati. Controlla la GEMINI_API_KEY.");
    }

    let rawText = data.candidates[0].content.parts[0].text;
    
    // Pulizia estrema del JSON (rimuove eventuali ```json ... ```)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Risposta AI non valida.");
    
    const result = JSON.parse(jsonMatch[0]);

    return res.status(200).json({
      success: true,
      teamIds: { a: idA, b: idB },
      candidati: result.candidati || []
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
