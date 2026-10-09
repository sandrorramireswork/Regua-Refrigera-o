let ctx: AudioContext | null = null;

export function podeNotificar() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoNotificacao(): NotificationPermission | "unsupported" {
  if (!podeNotificar()) return "unsupported";
  return Notification.permission;
}

export async function pedirPermissao(): Promise<boolean> {
  if (!podeNotificar()) return false;
  if (Notification.permission === "granted") return true;
  const r = await Notification.requestPermission();
  return r === "granted";
}

export function tocarAlerta() {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    void ctx.resume();
    const now = ctx.currentTime;
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {
    /* som indisponível */
  }
}

export function vibrar() {
  try {
    navigator.vibrate?.([250, 120, 250, 120, 400]);
  } catch {
    /* vibração indisponível */
  }
}

export function dispararAlerta(titulo: string, corpo: string) {
  tocarAlerta();
  vibrar();
  if (podeNotificar() && Notification.permission === "granted") {
    try {
      const n = new Notification(titulo, { body: corpo, icon: "/favicon.ico", tag: "roleta-pro" });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      /* notificação indisponível */
    }
  }
}
