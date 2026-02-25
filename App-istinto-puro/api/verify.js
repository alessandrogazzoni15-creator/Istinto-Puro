module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    try {
        const { teams } = req.body;
        const key = process.env.GEMINI_API_KEY;
        if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });
        const teamsList = teams.join(', ');
        const prompt = `Trova calciatori famosi che hanno giocato in TUTTE queste squadre: ${teamsList}. Rispondi SOLO con JSON valido, nessun testo aggiuntivo: {"calciatori": [{"nome": "Nome Cognome", "squadre_confermate": "Squadra1, Squadra2", "fonte_url": "https://it.wikipedia.org/wiki/Nome_Cognome"}]}`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        console.log("Risposta grezza Gemini:", JSON.stringify(data));
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            try {
                const cleaned = text.replace(/```json|```/g, '').trim();
                return res.status(200).json(JSON.parse(cleaned));
            } catch (parseErr) {
                console.error("Errore parsing JSON:", parseErr, "Testo ricevuto:", text);
                return res.status(200).json({ calciatori: [] });
            }
        }
        console.error("Struttura Gemini inattesa:", JSON.stringify(data));
        return res.status(200).json({ calciatori: [] });
    } catch (err) {
        return res.status(500).json({ error: "Errore: " + err.message });
    }
};
