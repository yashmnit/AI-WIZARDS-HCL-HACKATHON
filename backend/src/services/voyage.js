// Turns text into vectors using the Voyage AI API
export function buildEmbedText(b) {
  return `${b.title} by ${b.authors || 'unknown'}. Category: ${b.categories || 'general'}. Level: ${b.level}. ${String(b.description || '').slice(0, 1500)}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// inputType: "document" when storing books, "query" when searching
export async function embed(texts, inputType = 'document') {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
      body: JSON.stringify({ input: texts, model: process.env.VOYAGE_MODEL || 'voyage-3', input_type: inputType }),
    });
    if (res.status === 429) { await sleep(21_000); continue; }   // rate limited: wait and retry
    const data = await res.json();
    if (!res.ok) throw new Error('Voyage error: ' + JSON.stringify(data));
    return data.data.map((d) => d.embedding);
  }
  throw new Error('Voyage rate limit: try again later');
}