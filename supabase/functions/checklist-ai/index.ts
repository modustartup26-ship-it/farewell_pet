// 돌봄 체크리스트 고르기. 브라우저가 보낸 질문 목록 안에서만 5~10개를 고르고 말투를 다듬는다.
// GEMINI_API_KEY가 없거나 실패하면 503을 돌려주고, 화면은 프로필 규칙으로 고른 결과를 쓴다.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json(503, { error: "ai_not_configured" });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const candidates = Array.isArray(body?.candidates) ? body.candidates.slice(0, 40)
    .filter((c: any) => typeof c?.id === "string" && typeof c?.q === "string" && c.id.length < 32 && c.q.length < 120) : [];
  if (candidates.length < 5) return json(400, { error: "invalid_candidates" });
  const p = body?.pet ?? {};
  const pet = {
    age_years: typeof p.age_years === "number" ? p.age_years : null,
    size: typeof p.size === "string" ? p.size.slice(0, 20) : null,
    concerns: Array.isArray(p.concerns) ? p.concerns.filter((x: unknown) => typeof x === "string").slice(0, 15).map((x: string) => x.slice(0, 20)) : [],
    takes_medication: p.takes_medication === true,
    separation: typeof p.separation === "string" ? p.separation.slice(0, 20) : null,
    with_dogs: typeof p.with_dogs === "string" ? p.with_dogs.slice(0, 20) : null,
  };

  const prompt = `반려견을 호텔·유치원에 맡기는 동안 돌봄 직원이 몇 시간마다 답할 체크리스트를 고릅니다.
아래 후보 질문 중에서만 이 아이에게 가장 필요한 5~10개를 고르세요. 식사·대변·산책 시간·보호자에게 전할 말은 꼭 포함하세요.
고른 질문은 보호자와 직원이 읽기 쉬운 존댓말로 살짝 다듬어도 되지만 뜻을 바꾸거나 진단·치료를 암시하면 안 됩니다. 다듬은 문장은 80자 이내, 물음표로 끝내세요.
아이 정보: ${JSON.stringify(pet)}
후보: ${JSON.stringify(candidates)}
JSON으로만 답하세요: {"ids":["후보 id", ...], "rewrites":{"id":"다듬은 질문"}}`;

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 800 } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return json(503, { error: "ai_failed" });
    const out = await r.json();
    const text = out?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    const allowed = new Set(candidates.map((c: any) => c.id));
    const ids = [...new Set((parsed.ids ?? []).filter((id: unknown) => typeof id === "string" && allowed.has(id)))].slice(0, 10);
    const rewrites: Record<string, string> = {};
    for (const id of ids) {
      const t = parsed.rewrites?.[id as string];
      if (typeof t === "string" && t.length <= 80) rewrites[id as string] = t;
    }
    if (ids.length < 5) return json(503, { error: "ai_unusable" });
    return json(200, { ids, rewrites });
  } catch {
    return json(503, { error: "ai_failed" });
  }
});
