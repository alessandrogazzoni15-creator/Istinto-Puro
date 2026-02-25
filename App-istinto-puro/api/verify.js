module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return res.status(500).json({ error: "Chiave mancante su Vercel." });

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        
        console.log("Modelli disponibili:", JSON.stringify(data));
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Errore: " + err.message });
    }
};
