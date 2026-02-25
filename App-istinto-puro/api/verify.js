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
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');

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
    console.log("Candidati Gemini:", JSON.stringify(candidati));

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
          return page?.extract ? normalizza(page.extract) : '';
        };

        const testoIT = estraiTesto(dataIT);
        const testoEN = estraiTesto(dataEN);
        const testo = testoIT + ' ' + testoEN;

        if (!testo.trim()) {
          console.log(`[${candidato.nome}] nessun testo Wikipedia trovato`);
          return null;
        }

        const squadreConfermate = teams.filter(team => {
          const teamNorm = normalizza(team);
          const trovata = testo.includes(teamNorm);
          console.log(`[${candidato.nome}] squadra "${team}" → "${teamNorm}" trovata: ${trovata}`);
          return trovata;
        });

        if (squadreConfermate.length !== teams.length) return null;

        const urlIT = `https://it.wikipedia.org/wiki/${nomeEncoded}`;
        const urlEN = `https://en.wikipedia.org/wiki/${nomeEncoded}`;

        return {
          nome: candidato.nome,
          squadre_confermate: squadreConfermate.join(', '),
          fonte_url: testoIT ? urlIT : urlEN
        };

      } catch (e) {
        console.log(`[${candidato.nome}] errore:`, e.message);
        return null;
      }
    }));

    const verificati = risultati.filter(r => r !== null);
    return res.status(200).json({ calciatori: verificati });

  } catch (err) {
    return res.status(500).json({ error: "Errore: " + err.message });
  }
};
