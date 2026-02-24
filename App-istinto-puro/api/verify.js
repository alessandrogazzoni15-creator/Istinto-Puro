export default async function handler(req, res) {
  // 1. Gestione CORS e Metodo
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito. Usa POST.' });
  }

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    // 2. ANALISI DELLA VERITÀ: La chiave esiste nell'ambiente Vercel?
    if (!key || key.trim() === "") {
      console.error("ERRORE: Variabile GEMINI_API_KEY non trovata.");
      return res.status(500).json({ 
        error: "Configurazione incompleta: chiave API non trovata su Vercel.",
        dettaglio: "Assicurati di aver aggiunto GEMINI_API_KEY nelle Environment Variables e di aver fatto il Redeploy." 
      });
    }

    // 3. Preparazione della richiesta per Gemini 1.5 Flash
    const prompt = `Trova calciatori famosi che hanno giocato in tutte queste squadre: ${teams.join(', ')}. 
    Rispondi esclusivamente con un oggetto JSON valido. 
    Struttura richiesta: {"collegamento_trovato": true, "calciatori": [{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."}]}. 
    Se non trovi nessuno, rispondi: {"collegamento_trovato": false, "calciatori": []}. 
    Non aggiungere commenti o testo extra.`;

    // 4. Chiamata API a Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    // 5. Gestione errori restituiti da Google
    if (data.error) {
      console.error("Errore API Google:", data.error);
      return res.status(500).json({ 
        error: "Google API ha risposto con un errore.", 
        messaggio: data.error.message 
      });
    }

    // 6. Estrazione e invio della risposta
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const textResponse = data.candidates[0].content.parts[0].text;
      return res.status(200).json(JSON.parse(textResponse));
    } else {
      return res.status(200).json({ collegamento_trovato: false, calciatori: [] });
    }

  } catch (err) {
    console.error("Errore interno del server:", err);
    return res.status(500).json({ 
      error: "Il server ha riscontrato un problema imprevisto.", 
      dettaglio: err.message 
    });
  }
}
