export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

   const prompt = `Trova i calciatori famosi che hanno giocato sia nel ${teams[0]} che nel ${teams[1]}.
Puoi restituire da 1 a un massimo di 5 nomi. Se ne trovi solo uno, va bene lo stesso.
Rispondi SOLO con questo formato JSON:
{"calciatori": [{"nome": "Nome", "squadre_confermate": "Squadra A, Squadra B", "fonte_url": "https://www.google.com/search?q=trasferimenti+Nome"}]}
Se non trovi alcun collegamento certo, rispondi con {"calciatori": []}.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 // Aumentiamo la "creatività" per fargli trovare più nomi
        },
        safetySettings: [ // Abbassiamo i filtri che spesso bloccano i nomi propri
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json(JSON.parse(text));
    }

    // Se arriviamo qui, Google ha risposto ma senza candidati
    return res.status(200).json({ calciatori: [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
