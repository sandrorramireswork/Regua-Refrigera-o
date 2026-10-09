import { useCallback, useEffect, useState } from "react";
import {
  calculateBallisticRecord,
  DEFAULT_BALLISTIC_CALIBRATION,
  type BallisticCalibration,
  type BallisticInput,
  type BallisticRecord,
} from "@/lib/ballistics";

const RECORDS_KEY = "roleta-pro-ballistics-v1";
const CALIBRATION_KEY = "roleta-pro-ballistics-calibration-v1";
const CHANGE_EVENT = "roleta-pro-ballistics-changed";

function readRecords(): BallisticRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? "[]") as BallisticRecord[];
    return Array.isArray(parsed) ? parsed.slice(0, 200) : [];
  } catch {
    return [];
  }
}

function readCalibration(): BallisticCalibration {
  try {
    const parsed = JSON.parse(localStorage.getItem(CALIBRATION_KEY) ?? "null") as Partial<BallisticCalibration> | null;
    return parsed ? { ...DEFAULT_BALLISTIC_CALIBRATION, ...parsed } : DEFAULT_BALLISTIC_CALIBRATION;
  } catch {
    return DEFAULT_BALLISTIC_CALIBRATION;
  }
}

export function useBallistics() {
  const [records, setRecords] = useState<BallisticRecord[]>([]);
  const [calibration, setCalibrationState] = useState<BallisticCalibration>(DEFAULT_BALLISTIC_CALIBRATION);

  const load = useCallback(() => {
    setRecords(readRecords());
    setCalibrationState(readCalibration());
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(CHANGE_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(CHANGE_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [load]);

  const saveCalibration = useCallback((next: BallisticCalibration) => {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(next));
    setCalibrationState(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const addRecord = useCallback((input: Omit<BallisticInput, "calibration">) => {
    const history = readRecords();
    const record = calculateBallisticRecord({ ...input, calibration: readCalibration() }, history);
    const next = [record, ...history].slice(0, 200);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
    setRecords(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return record;
  }, []);

  const clearRecords = useCallback(() => {
    localStorage.removeItem(RECORDS_KEY);
    setRecords([]);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { records, calibration, saveCalibration, addRecord, clearRecords };
}