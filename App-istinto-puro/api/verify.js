module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
    const teamsList = teams.join(', ');
    const prompt = `Sei un esperto di calcio italiano. Trova calciatori che hanno giocato in TUTTE queste squadre: ${teamsList}. Includi SOLO calciatori di cui sei assolutamente certo. Meglio 0 che uno sbagliato. Rispondi SOLO con JSON valido: {"calciatori": [{"nome": "Nome Cognome"}]}`;
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
        const searchRes = await fetch(`https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidato.nome.replace(/ /g, '_'))}`);
        const searchData = await searchRes.json();
        if (!searchData.extract) continue;
        const testo = searchData.extract.toLowerCase();
        const url = searchData.content_urls?.desktop?.page || `https://it.wikipedia.org/wiki/${encodeURIComponent(candidato.nome.replace(/ /g, '_'))}`;
        const squadreConfermate = teams.filter(team => testo.includes(team.toLowerCase()));
        if (squadreConfermate.length === teams.length) {
          verificati.push({
            nome: candidato.nome,
            squadre_confermate: squadreConfermate.join(', '),
            fonte_url: url
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
