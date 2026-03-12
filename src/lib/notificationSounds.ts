const SOUND_SETTINGS_KEY = 'notification-sound-settings';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  mutedTypes: string[];
}

const getSettings = (): SoundSettings => {
  try {
    const stored = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { enabled: true, volume: 70, mutedTypes: [] };
};

const createTone = (
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
};

const sounds: Record<string, (ctx: AudioContext, vol: number) => void> = {
  assignment: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 523, t, 0.15, vol); // C5
    createTone(ctx, 659, t + 0.12, 0.2, vol); // E5
  },
  deadline: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 880, t, 0.1, vol, 'square'); // A5
    createTone(ctx, 880, t + 0.15, 0.1, vol, 'square');
  },
  deadline_warning: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 698, t, 0.12, vol, 'triangle'); // F5
    createTone(ctx, 698, t + 0.18, 0.12, vol, 'triangle');
  },
  project_invite: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 523, t, 0.12, vol); // C5
    createTone(ctx, 659, t + 0.1, 0.12, vol); // E5
    createTone(ctx, 784, t + 0.2, 0.18, vol); // G5
  },
  mention: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 1047, t, 0.15, vol, 'sine'); // C6
  },
  lead_assigned: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 440, t, 0.15, vol); // A4
    createTone(ctx, 554, t + 0.12, 0.2, vol); // C#5
  },
  default: (ctx, vol) => {
    const t = ctx.currentTime;
    createTone(ctx, 880, t, 0.2, vol, 'sine'); // A5
  },
};

export const playNotificationSound = (type: string) => {
  const settings = getSettings();
  if (!settings.enabled) return;
  if (settings.mutedTypes.includes(type)) return;

  try {
    const ctx = new AudioContext();
    const vol = (settings.volume / 100) * 0.3;
    const playFn = sounds[type] || sounds.default;
    playFn(ctx, vol);
    setTimeout(() => ctx.close(), 2000);
  } catch {}
};

export const playTestSound = (type: string) => {
  try {
    const settings = getSettings();
    const ctx = new AudioContext();
    const vol = (settings.volume / 100) * 0.3;
    const playFn = sounds[type] || sounds.default;
    playFn(ctx, vol);
    setTimeout(() => ctx.close(), 2000);
  } catch {}
};

export const NOTIFICATION_SOUND_TYPES = [
  { key: 'assignment', label: 'Assignment' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'deadline_warning', label: 'Deadline Warning' },
  { key: 'project_invite', label: 'Project Invite' },
  { key: 'mention', label: 'Mention' },
  { key: 'lead_assigned', label: 'Lead Assigned' },
] as const;
