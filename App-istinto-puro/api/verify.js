export default async function handler(req, res) {
  // Gestione metodo e pre-flight
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const { teams } = req.body;
    const key = process.env.GEMINI_API_KEY;

    if (!key) return res.status(500).json({ error: "API Key mancante su Vercel." });

    // Prompt ottimizzato: semantica flessibile, quantità elastica e formato rigido
    const prompt = `Agisci come un esperto di storia del calcio. 
Trova i calciatori famosi che hanno giocato sia nella squadra di calcio "${teams[0]}" che nella squadra di calcio "${teams[1]}".
Puoi restituire da 1 a un massimo di 5 nomi. Se ne trovi solo uno, va bene lo stesso.
Rispondi ESCLUSIVAMENTE con questo formato JSON:
{"calciatori": [{"nome": "Nome", "squadre_confermate": "${teams[0].toUpperCase()}, ${teams[1].toUpperCase()}", "fonte_url": "https://www.google.com/search?q=trasferimenti+Nome+calciatore"}]}
Se non trovi alcun collegamento certo, rispondi rigorosamente con: {"calciatori": []}.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7 
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();

    // Gest
