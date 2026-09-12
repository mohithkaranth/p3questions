"use client";
import { useEffect, useState } from "react";
import { apiMessages, readApiResponse } from "@/lib/api-response";
type Discovery = { joke: string; fact: string; animal: string };
export default function DailyDiscovery() {
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch("/api/daily-discovery", { signal: controller.signal }).then((response) => readApiResponse<Discovery>(response, apiMessages.DISCOVERY_UNAVAILABLE)).then(setDiscovery).catch((error: unknown) => { if (error instanceof Error && error.name !== "AbortError") setFailed(true); }); return () => controller.abort(); }, []);
  if (failed) return <section className="discovery-panel" role="status">{apiMessages.DISCOVERY_UNAVAILABLE}</section>;
  if (!discovery) return <section className="discovery-panel discovery-loading" aria-label="Loading today's discoveries">✨ Preparing today&apos;s fun surprises…</section>;
  return <section className="discovery-panel" aria-label="Joke and animal fact of the day"><article><span className="discovery-icon">😄</span><div><p>JOKE OF THE DAY</p><h2>{discovery.joke}</h2></div></article><div className="discovery-divider"/><article><span className="discovery-icon">🐾</span><div><p>{discovery.animal.toUpperCase()} FACT OF THE DAY</p><h2>{discovery.fact}</h2></div></article></section>;
}
