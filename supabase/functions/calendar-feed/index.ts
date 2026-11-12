// 산책 일기 캘린더 구독(.ics). 구글 캘린더가 토큰이 든 주소로 몇 시간마다 가져간다.
import { createClient } from "jsr:@supabase/supabase-js@2";

const esc = (s: string) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const fold = (line: string) => {
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 73) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
};
const SOURCE: Record<string, string> = { checkin: "입실", checkout: "퇴실", checklist: "돌봄 체크리스트" };

async function sha256hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: feed } = await sb.from("calendar_feeds").select("user_id").eq("token_hash", await sha256hex(token)).maybeSingle();
  if (!feed) return new Response("Not found", { status: 404 });

  const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
  const [{ data: rows }, { data: prof }] = await Promise.all([
    sb.from("diary_entries").select("id,entry_date,entry_time,place,body,source,activity")
      .eq("guardian_id", feed.user_id).gte("entry_date", since).order("entry_date", { ascending: false }).limit(2000),
    sb.from("pet_profiles").select("pet").eq("user_id", feed.user_id).maybeSingle(),
  ]);
  const pet = (prof?.pet?.name as string) || "우리 아이";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const events = (rows ?? []).map((e) => {
    const d = String(e.entry_date).replace(/-/g, "");
    let start: string, end: string;
    if (e.entry_time) {
      const [h, m] = e.entry_time.split(":").map(Number);
      const endH = Math.min(23, h + 1);
      start = `DTSTART;TZID=Asia/Seoul:${d}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      end = `DTEND;TZID=Asia/Seoul:${d}T${String(endH).padStart(2, "0")}${String(endH === h ? 59 : m).padStart(2, "0")}00`;
    } else {
      const n = new Date(e.entry_date + "T00:00:00Z"); n.setUTCDate(n.getUTCDate() + 1);
      start = `DTSTART;VALUE=DATE:${d}`;
      end = `DTEND;VALUE=DATE:${n.toISOString().slice(0, 10).replace(/-/g, "")}`;
    }
    const tag = SOURCE[e.source] ? ` (${SOURCE[e.source]})` : "";
    const lines = [e.body || ""];
    if (e.activity?.walk_min != null) lines.push(`산책·놀이 ${e.activity.walk_min}분`);
    lines.push("", "farewell pet 산책 일기");
    return ["BEGIN:VEVENT", `UID:${e.id}@farewellpet`, `DTSTAMP:${stamp}`, start, end,
      fold(`SUMMARY:${esc(`${pet} · ${e.place}${tag}`)}`), fold(`DESCRIPTION:${esc(lines.join("\n").trim())}`), "END:VEVENT"].join("\r\n");
  });

  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//farewell pet//diary//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(pet + " 산책 일기")}`), "X-WR-TIMEZONE:Asia/Seoul", "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    ...events, "END:VCALENDAR"].join("\r\n");
  return new Response(req.method === "HEAD" ? null : ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900", "X-Content-Type-Options": "nosniff" },
  });
});
