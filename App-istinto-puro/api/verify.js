export default function handler(req, res) {
  res.status(200).json({ 
    messaggio: "Vercel funziona!", 
    chiave_presente: !!process.env.GEMINI_API_KEY 
  });
}
