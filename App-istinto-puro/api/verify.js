function normalizza(str) {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;
    const sportKey = process.env.SPORTAPI_KEY;
    if (!geminiKey) return res.status(500).json({ error: "Chiave Gemini mancante." });
    if (!sportKey) return res.status(500).json({ error: "Chiave SportAPI mancante." });

    const teamsList = teams.join(', ');

    // STEP 1: Gemini suggerisce 3 candidati con ID SportAPI
    const prompt = `Sei un esperto di calcio mondiale. Trova calciatori che hanno giocato in TUTTE queste squadre: ${teamsList}.
Restituisci MASSIMO 3 candidati di cui sei assolutamente certo.
Per ogni calciatore fornisci:
- nome completo
- slug (nome in minuscolo con trattini, es. "cristiano-ronaldo")
- id numerico SportAPI/SofaScore se lo conosci, altrimenti null

Rispondi SOLO con JSON valido: {"calciatori": [{"nome": "Nome Cognome", "slug": "nome-cognome", "id": 12345}]}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const geminiData = await geminiRes.json();
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(200).json({ calciatori: [] });
    }

    const cleaned = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const candidati = JSON.parse(cleaned).calciatori || [];

    // STEP 2: Verifica ogni candidato su SportAPI
    const risultati = await Promise.all(candidati.map(async (candidato) => {
      try {
        let playerId = candidato.id;

        // Solo se Gemini non conosce l'ID, lo cerchiamo (fallback)
        if (!playerId) {
          const detailsRes = await fetch(`https://sportapi7.p.rapidapi.com/api/v1/player/${candidato.slug}`, {
            headers: {
              'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
              'x-rapidapi-key': sportKey
            }
          });
          const detailsData = await detailsRes.json();
          playerId = detailsData?.player?.id;
          if (!playerId) return null;
        }

        // Ottieni storico trasferimenti
        const transferRes = await fetch(`https://sportapi7.p.rapidapi.com/api/v1/player/${playerId}/transfer-history`, {
          headers: {
            'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
            'x-rapidapi-key': sportKey
          }
        });
        const transferData = await transferRes.json();
        const transfers = transferData?.transferHistory || [];

        // Raccogli tutte le squadre in cui ha giocato
        const squadreGiocate = new Set();
        transfers.forEach(t => {
          if (t.fromTeamName) squadreGiocate.add(normalizza(t.fromTeamName));
          if (t.toTeamName) squadreGiocate.add(normalizza(t.toTeamName));
        });

        // Verifica che tutte le squadre richieste siano presenti
        const squadreConfermate = teams.filter(team =>
          squadreGiocate.has(normalizza(team))
        );

        if (squadreConfermate.length !== teams.length) return null;

        return {
          nome: candidato.nome,
          squadre_confermate: squadreConfermate.join(', '),
          fonte_url: `https://www.sofascore.com/player/${candidato.slug}/${playerId}`
        };

      } catch (e) {
        return null;
      }
    }));

    const verificati = risultati.filter(r => r !== null);
    return res.status(200).json({ calciatori: verificati });

  } catch (err) {
    return res.status(500).json({ error: "Errore: " + err.message });
  }
};
