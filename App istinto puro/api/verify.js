{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\froman\fcharset0 Times-Roman;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs24 \cf0 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 export default async function handler(req, res) \{\
  const \{ teams \} = req.body;\
  const key = process.env.GEMINI_API_KEY; // Prender\'e0 la chiave che hai visto su AI Studio\
\
  const prompt = `Trova calciatori che hanno giocato in: $\{teams.join(', ')\}. \
  Rispondi SOLO con questo JSON: \{"collegamento_trovato": true, "calciatori": [\{"nome": "...", "squadre_confermate": "...", "fonte_url": "..."\}]\}`;\
\
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=$\{key\}`, \{\
    method: 'POST',\
    headers: \{ 'Content-Type': 'application/json' \},\
    body: JSON.stringify(\{\
      contents: [\{ parts: [\{ text: prompt \}] \}],\
      generationConfig: \{ responseMimeType: "application/json" \}\
    \})\
  \});\
\
  const data = await response.json();\
  res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text));\
\}}