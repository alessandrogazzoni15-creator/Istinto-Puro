const axios = require('axios');

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { playerName, teamIdA, teamIdB } = req.body;
        const apiKey = process.env.RAPIDAPI_KEY; 
        const host = 'sportapi7.p.rapidapi.com';

        // Ricerca ID Giocatore
        const searchRes = await axios.get(`https://${host}/api/v1/search/players`, {
            params: { q: playerName },
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host }
        });

        if (!searchRes.data.results || searchRes.data.results.length === 0) {
            return res.status(200).json({ verified: false, message: "Calciatore non trovato." });
        }

        const playerId = searchRes.data.results[0].player.id;

        // Verifica Carriera
        const careerRes = await axios.get(`https://${host}/api/v1/player/${playerId}/career-history`, {
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host }
        });

        const history = careerRes.data.history;
        const teamIds = history.map(h => h.team.id);

        const verified = teamIds.includes(parseInt(teamIdA)) && teamIds.includes(parseInt(teamIdB));

        return res.status(200).json({ verified });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
