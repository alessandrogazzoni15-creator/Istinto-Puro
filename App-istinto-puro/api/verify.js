module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');

    // STEP 1: Gemini suggerisce candidati (max 5)
    const prompt = `Sei un esperto di calcio mondiale. Trova calciatori che hanno giocato in TUTTE queste squadre: ${teamsList}.
Restituisci MASSIMO 5 candidati di cui sei più sicuro.
Rispondi SOLO con JSON valido: {"calciatori": [{"nome": "Nome Cognome"}]}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
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

    // STEP 2: Verifica tutti i candidati su Wikipedia IN PARALLELO
    const risultati = await Promise.all(candidati.map(async (candidato) => {
      try {
        const nomeEncoded = encodeURIComponent(candidato.nome.replace(/ /g, '_'));

        const [resIT, resEN] = await Promise.all([
          fetch(`https://it.wikipedia.org/w/api.php?action=query&titles=${nomeEncoded}&prop=extracts&explaintext=true&format=json&exintro=false`),
          fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${nomeEncoded}&prop=extracts&explaintext=true&format=json&exintro=false`)
        ]);

        const [dataIT, dataEN] = await Promise.all([resIT.json(), resEN.json()]);

        const estraiTesto = (data) => {
          const pages = data?.query?.pages;
          if (!pages) return '';
          const page = Object.values(pages)[0];
          return page?.extract ? page.extract.toLowerCase() : '';
        };

        const testoIT = estraiTesto(dataIT);
        const testoEN = estraiTesto(dataEN);
        const testo = testoIT + ' ' + testoEN;

        if (!testo.trim()) return null;

        // Verifica che tutte le squadre siano nel testo Wikipedia
        const squadreConfermate = teams.filter(team => testo.includes(team.toLowerCase()));

        if (squadreConfermate.length !== teams.length) return null;

        const urlIT = `https://it.wikipedia.org/wiki/${nomeEncoded}`;
        const urlEN = `https://en.wikipedia.org/wiki/${nomeEncoded}`;

        return {
          nome: candidato.nome,
          squadre_confermate: squadreConfermate.join(', '),
          fonte_url: testoIT ? urlIT : urlEN
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
