/**
 * Web Audio API synthesized alert sound utility for Fluig Monitor NOC.
 * Generates clear, non-jarring synthesized chimes without external audio assets.
 */

let lastSoundPlayedAt = 0;
const MIN_SOUND_INTERVAL_MS = 6000; // Anti-spam: max 1 alarm every 6 seconds

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      return new AudioCtx();
    }
  } catch {
    // Web Audio not supported in this environment
  }
  return null;
}

export function isSoundAlertsEnabled(): boolean {
  try {
    const val = localStorage.getItem('fluig_sound_alerts');
    // Default is true if not explicitly disabled
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setSoundAlertsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('fluig_sound_alerts', String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Play a synthesized sound alert for NOC events.
 * @param type 'critical' (service down/timeout), 'warning' (slow response), or 'recovered' (service restored)
 * @param bypassThrottle whether to bypass the anti-spam interval (used for manual tests)
 */
export function playAlertSound(
  type: 'critical' | 'warning' | 'recovered' = 'critical',
  bypassThrottle = false
): void {
  if (!bypassThrottle && !isSoundAlertsEnabled()) {
    return;
  }

  const now = Date.now();
  if (!bypassThrottle && now - lastSoundPlayedAt < MIN_SOUND_INTERVAL_MS) {
    return;
  }
  lastSoundPlayedAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Handle suspended AudioContext (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const startTime = ctx.currentTime;

  if (type === 'critical') {
    // Two-tone descending NOC alarm: 784Hz (G5) -> 523Hz (C5)
    // Tone 1: 784 Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, startTime);

    gain1.gain.setValueAtTime(0.001, startTime);
    gain1.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(startTime);
    osc1.stop(startTime + 0.18);

    // Tone 2: 523 Hz (lower, urgent reassurance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523, startTime + 0.2);

    gain2.gain.setValueAtTime(0.001, startTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.3, startTime + 0.23);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.48);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime + 0.2);
    osc2.stop(startTime + 0.5);
  } else if (type === 'recovered') {
    // Ascending melody: 523Hz -> 659Hz -> 784Hz
    const freqs = [523, 659, 784];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = startTime + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  } else {
    // Single warning beep: 659 Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }
}
