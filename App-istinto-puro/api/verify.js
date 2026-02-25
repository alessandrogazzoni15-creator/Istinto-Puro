export default async function handler(req, res) {
  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Calciatori famosi tra ${teams.join(', ')}. Rispondi solo JSON.` }] }]
      })
    });

    const data = await response.json();

    // MANDIAMO TUTTO AL FRONTEND PER VEDERE COSA SUCCEDE
    if (data.candidates) {
        const aiText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ calciatori: [{ nome: "DEBUG: " + aiText.substring(0, 50), squadre_confermate: "Controlla la risposta", fonte_url: "#" }] });
    }
    
    return res.status(200).json({ calciatori: [] });
  } catch (err) {
    return res.status(200).json({ calciatori: [{ nome: "ERRORE: " + err.message, squadre_confermate: "Problema tecnico", fonte_url: "#" }] });
  }
}
