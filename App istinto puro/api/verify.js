export default async function handler(req, res) {
  const { teams } = req.body;
  const key = process.env.GEMINI_API_KEY;
  const prompt = `Trova calciatori che hanno giocato in: ${teams.join(', ')}. Rispondi SOLO con questo JSON: {"collegamento_trovato": true, "calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
  });
  const data = await response.json();
  res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text));
}
