import { useEffect, useState } from "react";
import {
  type ConfluenceConfig,
  DEFAULT_CONFLUENCE_CONFIG,
} from "@/lib/confluence-engine";

const STORAGE_KEY = "roleta-confluence-config";
const SYNC_EVENT = "roleta-confluence-config-change";

export function loadConfluenceConfig(): ConfluenceConfig {
  if (typeof window === "undefined") return DEFAULT_CONFLUENCE_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFLUENCE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      window_size: Number(parsed.window_size) || DEFAULT_CONFLUENCE_CONFIG.window_size,
      weight_deflection: Number(parsed.weight_deflection) ?? DEFAULT_CONFLUENCE_CONFIG.weight_deflection,
      weight_patterns: Number(parsed.weight_patterns) ?? DEFAULT_CONFLUENCE_CONFIG.weight_patterns,
      macro_cycle_threshold: Number(parsed.macro_cycle_threshold) || DEFAULT_CONFLUENCE_CONFIG.macro_cycle_threshold,
      min_confidence_trigger: Number(parsed.min_confidence_trigger) || DEFAULT_CONFLUENCE_CONFIG.min_confidence_trigger,
      mirror_window_size: Number(parsed.mirror_window_size) || DEFAULT_CONFLUENCE_CONFIG.mirror_window_size,
    };
  } catch {
    return DEFAULT_CONFLUENCE_CONFIG;
  }
}

export function saveConfluenceConfig(config: ConfluenceConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* storage indisponivel */
  }
}

export function useConfluenceConfig() {
  const [config, setConfig] = useState<ConfluenceConfig>(DEFAULT_CONFLUENCE_CONFIG);

  useEffect(() => {
    setConfig(loadConfluenceConfig());
    const sync = () => setConfig(loadConfluenceConfig());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function updateConfig(patch: Partial<ConfluenceConfig>) {
    const next: ConfluenceConfig = {
      ...config,
      ...patch,
    };
    // Validação de limites seguros
    next.window_size = Math.min(100, Math.max(5, Math.round(next.window_size)));
    next.weight_deflection = Math.min(100, Math.max(0, Math.round(next.weight_deflection)));
    next.weight_patterns = Math.min(100, Math.max(0, Math.round(next.weight_patterns)));
    next.macro_cycle_threshold = Number(Math.min(10, Math.max(1, next.macro_cycle_threshold)).toFixed(1));
    next.min_confidence_trigger = Math.min(98, Math.max(50, Math.round(next.min_confidence_trigger)));
    next.mirror_window_size = Math.min(30, Math.max(5, Math.round(next.mirror_window_size || 7)));

    setConfig(next);
    saveConfluenceConfig(next);
  }

  function resetConfig() {
    setConfig(DEFAULT_CONFLUENCE_CONFIG);
    saveConfluenceConfig(DEFAULT_CONFLUENCE_CONFIG);
  }

  function applyPreset(preset: "conservador" | "equilibrado" | "agressivo") {
    switch (preset) {
      case "conservador":
        updateConfig({
          window_size: 40,
          weight_deflection: 40,
          weight_patterns: 35,
          macro_cycle_threshold: 3.5,
          min_confidence_trigger: 90,
        });
        break;
      case "agressivo":
        updateConfig({
          window_size: 20,
          weight_deflection: 45,
          weight_patterns: 40,
          macro_cycle_threshold: 2.5,
          min_confidence_trigger: 75,
        });
        break;
      case "equilibrado":
      default:
        resetConfig();
        break;
    }
  }

  return {
    config,
    updateConfig,
    resetConfig,
    applyPreset,
  };
}
