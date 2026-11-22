import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { apiErrorTranslationKey } from "../utils/formValidation";

const EMPTY_TIMERS = [];
const childOf = (timer) => timer.child?.id ?? timer.child;

export function useTimers(serverTimers = EMPTY_TIMERS, childId, refresh) {
  const [overrides, setOverrides] = useState(() => new Map());
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const inFlight = useRef(false);

  // Keep confirmed writes visible even if a read started before the write.
  // Drop an override when an updated server snapshot agrees with it.
  useEffect(() => {
    const byId = new Map(serverTimers.map((timer) => [String(timer.id), timer]));
    setOverrides((previous) => {
      const next = new Map(previous);
      for (const [id, { child, timer: override }] of previous) {
        if (child !== childId) continue;
        const server = byId.get(id);
        if (override === null ? !server : server && Date.parse(server.start) === Date.parse(override.start)) {
          next.delete(id);
        }
      }
      return next.size === previous.size ? previous : next;
    });
  }, [serverTimers, childId]);

  const activeTimers = useMemo(() => {
    if (childId == null) return EMPTY_TIMERS;
    const byId = new Map(serverTimers.map((timer) => [String(timer.id), timer]));
    for (const [id, { timer: override }] of overrides) {
      if (override) byId.set(id, override);
      else byId.delete(id);
    }
    return [...byId.values()]
      .filter((timer) => childOf(timer) == null || String(childOf(timer)) === String(childId))
      .map((timer) => ({ ...timer, name: timer.name || "timer", start: new Date(timer.start) }))
      .filter((timer) => !Number.isNaN(timer.start.getTime()));
  }, [serverTimers, childId, overrides]);

  const confirmed = (id, timer) => {
    setOverrides((previous) => new Map(previous).set(String(id), { child: childId, timer }));
  };

  const run = async (mutation) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrorKey(null);
    try {
      await mutation();
    } catch (error) {
      const key = apiErrorTranslationKey(error);
      setErrorKey(key === "form.error.unconfirmed" ? "timer.unconfirmed" : key);
    } finally {
      inFlight.current = false;
      setBusy(false);
      void refresh();
    }
  };

  return {
    activeTimers, busy, errorKey,
    startTimer: (name) => childId != null && run(async () => {
      const saved = await api.createTimer({ child: childId, name });
      confirmed(saved.id, { ...saved, child: saved.child ?? childId, name: saved.name || name });
    }),
    editTimer: (timer, start) => run(async () => {
      const saved = await api.updateTimer(timer.id, { start });
      confirmed(timer.id, { ...timer, ...saved, start: saved?.start || start });
    }),
    discardTimer: (id) => run(async () => {
      await api.deleteTimer(id);
      confirmed(id, null);
    }),
    confirmTimerSaved: (id) => confirmed(id, null),
  };
}
