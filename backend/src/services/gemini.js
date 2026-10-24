// Calls Gemini through its REST API with function calling.
// Retries when Google is temporarily overloaded, then tries a fallback model.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = [429, 500, 503, 504];

export async function callGemini(contents, functionDeclarations, systemPrompt) {
  const models = [process.env.GEMINI_MODEL || 'gemini-2.5-flash', process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    tools: [{ functionDeclarations }],
    generationConfig: { temperature: 0.2 },
  });

  let lastError = 'unknown error';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data.candidates?.[0]?.content || null;   // { role: 'model', parts: [...] }

      lastError = `Gemini error (${model}, ${res.status}): ` + JSON.stringify(data.error || data);
      if (!RETRYABLE.includes(res.status)) throw new Error(lastError);   // e.g. bad key or bad request: do not retry
      console.warn(`${lastError} | retrying (${attempt + 1}/3)`);
      await sleep(1000 * 2 ** attempt);                                   // wait 1s, 2s, 4s
    }
  }
  throw new Error(lastError);
}