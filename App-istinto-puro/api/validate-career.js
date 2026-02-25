const axios = require('axios');

export default async function handler(req, res) {
    // Header per gestire le chiamate dal frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { playerName, teamIdA, teamIdB } = req.body;
        const apiKey = process.env.RAPIDAPI_KEY; 
        const host = 'sportapi7.p.rapidapi.com';

        // 1. CERCA IL GIOCATORE (Costo: 1 credito)
        const searchRes = await axios.get(`https://${host}/api/v1/search/players`, {
            params: { q: playerName },
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host }
        });

        const players = searchRes.data.results;
        if (!players || players.length === 0) {
            return res.status(200).json({ verified: false, message: "Giocatore non trovato nel database." });
        }

        // Prendiamo l'ID del primo risultato (il più probabile)
        const playerId = players[0].player.id;

        // 2. RECUPERA LA CARRIERA STORICA (Costo: 1 credito)
        const careerRes = await axios.get(`https://${host}/api/v1/player/${playerId}/career-history`, {
            headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host }
        });

        const history = careerRes.data.history;
        if (!history) {
            return res.status(200).json({ verified: false, message: "Nessuno storico carriera trovato." });
        }

        // 3. CONFRONTO LOGICO DEGLI ID
        // Creiamo un set di tutti gli ID squadra in cui ha giocato
        const teamIdsInHistory = history.map(entry => entry.team.id);

        const hasPlayedInA = teamIdsInHistory.includes(parseInt(teamIdA));
        const hasPlayedInB = teamIdsInHistory.includes(parseInt(teamIdB));

        // Risposta finale
        return res.status(200).json({
            verified: hasPlayedInA && hasPlayedInB,
            playerName: playerName,
            debug: { foundInA: hasPlayedInA, foundInB: hasPlayedInB }
        });

    } catch (error) {
        console.error("Errore SportAPI:", error.message);
        return res.status(500).json({ error: "Errore nel connettore Sofascore." });
    }
}
