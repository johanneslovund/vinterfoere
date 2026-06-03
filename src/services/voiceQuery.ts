import { FerryAnalysis } from './ferryService';

export interface VoiceContext {
  ferryAnalyses?: FerryAnalysis[];
  routeStartTime?: Date;
  destinationName?: string;
}

// Text-to-speech in Norwegian
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = 'nb-NO';
  u.rate   = 0.92;
  u.pitch  = 1.0;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

// Returns a spoken response if the query is about the route; null if not recognized
export function handleVoiceQuery(text: string, ctx: VoiceContext): string | null {
  const lower = text.toLowerCase().trim();

  // ── Ferry questions ────────────────────────────────────────────────────────
  const ferryKeywords = ['ferje', 'fergen', 'ferry', 'båt', 'overfart', 'rekker'];
  if (ferryKeywords.some(k => lower.includes(k))) {
    if (!ctx.ferryAnalyses?.length) {
      return 'Ruten din inneholder ingen ferje.';
    }

    const parts: string[] = [];
    const now = new Date();

    for (const fa of ctx.ferryAnalyses) {
      const elapsed   = ctx.routeStartTime
        ? (now.getTime() - ctx.routeStartTime.getTime()) / 60000 : 0;
      const remaining = Math.max(0, fa.ferry.driveTimeToFerryMin - elapsed);
      const liveEta   = new Date(now.getTime() + remaining * 60 * 1000);
      const next      = fa.departures.find(
        d => d.time >= new Date(liveEta.getTime() - 2 * 60 * 1000)
      );

      if (!next) {
        parts.push(`Ingen kommende avganger for ${fa.ferry.name}.`);
        continue;
      }

      const minEarly = (next.time.getTime() - liveEta.getTime()) / 60000;
      const roundMin = Math.round(Math.abs(minEarly));

      if (minEarly >= 0) {
        parts.push(
          `Du rekker ferjen ${fa.ferry.name} klokken ${fmtClock(next.time)}. ` +
          `Du ankommer ${roundMin} ${roundMin === 1 ? 'minutt' : 'minutter'} før avgang.`
        );
      } else {
        const nextNext = fa.departures.find(d => d.time > next.time);
        const after    = nextNext ? ` Neste ferje er klokken ${fmtClock(nextNext.time)}.` : '';
        parts.push(
          `Du går glipp av ferjen ${fa.ferry.name} klokken ${fmtClock(next.time)}.` + after
        );
      }
    }

    return parts.join(' ');
  }

  // ── Destination question ───────────────────────────────────────────────────
  if (lower.includes('destinasjon') || lower.includes('hvor') || lower.includes('dit')) {
    if (ctx.destinationName) return `Du navigerer til ${ctx.destinationName}.`;
    return 'Ingen destinasjon er valgt.';
  }

  // ── Arrival time ───────────────────────────────────────────────────────────
  if (lower.includes('ankommer') || lower.includes('ankomst') || lower.includes('eta') || lower.includes('fram')) {
    return 'Sjekk ankomsttiden i navigasjonsvisningen øverst på skjermen.';
  }

  return null; // not a recognized query — treat as address search
}
