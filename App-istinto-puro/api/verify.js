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

   const prompt = `Analizza l'intera carriera professionistica dei calciatori (incluse giovanili, prestiti e trasferimenti definitivi).
Trova calciatori che, in QUALSIASI MOMENTO della loro carriera, abbiano vestito sia la maglia del "${teams[0]}" che quella del "${teams[1]}", indipendentemente dal tempo trascorso tra le due esperienze o da quante altre squadre abbiano cambiato nel frattempo.

Esempio logico: Se un giocatore ha fatto Squadra A -> Squadra C -> Squadra D -> Squadra B, deve essere incluso.

Rispondi ESCLUSIVAMENTE con questo formato JSON:
{
  "calciatori": [
    {
      "nome": "Nome Cognome",
      "percorso": "Descrizione sintetica (es: Al ${teams[0]} nel 2018, alla ${teams[1]} nel 2022 dopo varie esperienze)"
    }
  ]
}`;

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
    console.log("Candidati Gemini:", JSON.stringify(candidati
