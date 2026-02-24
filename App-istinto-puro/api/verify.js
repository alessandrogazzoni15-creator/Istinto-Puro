export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { teams } = req.body;
        const key = process.env.GEMINI_API_KEY;

        if (!key) return res.status(500).json({ error: "Chiave mancante." });

        const prompt = `Trova calciatori famosi che hanno giocato in tutte queste squadre: ${teams.join(', ')}. 
        Rispondi esclusivamente con un oggetto JSON. 
        Struttura: {"calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. 
        Se non ne trovi, rispondi: {"calciatori": []}. 
        Non aggiungere altro testo.`;

        // Usiamo v1 stabile
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        if (data.candidates && data.candidates[0]) {
            let text = data.candidates[0].content.parts[0].text;
            
            // PULIZIA AGGRESSIVA: Estraiamo solo ciò che è dentro le parentesi graffe
            const firstBracket = text.indexOf('{');
            const lastBracket = text.lastIndexOf('}') + 1;
            const jsonString = text.substring(firstBracket, lastBracket);
            
            try {
                const finalJson = JSON.parse(jsonString);
                return res.status(200).json(finalJson);
            } catch (parseError) {
                console.error("Errore parsing JSON IA:", text);
                return res.status(500).json({ error: "L'IA ha risposto con un formato non valido." });
            }
        }

        return res.status(200).json({ calciatori: [] });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
