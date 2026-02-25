module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');
    const prompt = `Sei un esperto di calcio mondiale. Trova calciatori che hanno giocato in TUTTE queste squadre: ${teamsList}. Includi SOLO calciatori di cui sei assolutamente certo. Meglio 0 che uno sbagliato. Rispondi SOLO con JSON valido: {"calciatori": [{"nome": "Nome Cognome"}]}`;
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
    const verificati = [];

    for (const candidato of candidati) {
      try {
        const nomeEncoded = encodeURIComponent(candidato.nome.replace(/ /g, '_'));

        // Cerca il testo completo della pagina su IT e EN
        const [resIT, resEN] = await Promise.all([
          fetch(`https://it.wikipedia.org/w/api.php?action=query&titles=${nomeEncoded}&prop=extracts&explaintext=true&format=json`),
          fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${nomeEncoded}&prop=extracts&explaintext=true&format=json`)
        ]);

        const [dataIT, dataEN] = await Promise.all([
          resIT.json(),
          resEN.json()
        ]);

        const estraiTesto = (data) => {
          const pages = data?.query?.pages;
          if (!pages) return '';
          const page = Object.values(pages)[0];
          return page?.extract ? page.extract.toLowerCase() : '';
        };

        const testo = estraiTesto(dataIT) + ' ' + estraiTesto(dataEN);
        if (!testo.trim()) continue;

        // Cerca le squadre con varianti comuni
        const squadreConfermate = teams.filter(team => {
          const t = team.toLowerCase();
          return testo.includes(t);
        });

        const urlIT = `https://it.wikipedia.org/wiki/${nomeEncoded}`;
        const urlEN = `https://en.wikipedia.org/wiki/${nomeEncoded}`;

        if (squadreConfermate.length === teams.length) {
          verificati.push({
            nome: candidato.nome,
            squadre_confermate: squadreConfermate.join(', '),
            fonte_url: estraiTesto(dataIT) ? urlIT : urlEN
          });
        }
      } catch (e) {
        continue;
      }
    }

    return res.status(200).json({ calciatori: verificati });
  } catch (err) {
    return res.status(500).json({ error: "Errore: " + err.message });
  }
};
