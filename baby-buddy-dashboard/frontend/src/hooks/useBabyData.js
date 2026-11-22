import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api.js";
import { createRefreshLoop, createSectionReads, readAllPages, refreshSections } from "../utils/babyDataRefresh.js";
import { localDateKey } from "../utils/formatters.js";
import { getMockData } from "../utils/mockData.js";

const EMPTY = [];
const EMPTY_SNAPSHOT = { data: {}, errors: {}, complete: false, lastSync: null, fullError: null };
const DEFAULT_CONFIG = { demo_mode: false, refresh_interval: 30, unit_system: "metric" };

function fixChildPicture(child) {
  if (!child?.picture) return child;
  try {
    return { ...child, picture: `./api/media${new URL(child.picture).pathname}` };
  } catch {
    return child;
  }
}

function scopeKey(child, tab, period, day) {
  return JSON.stringify([child, tab, tab === "day" ? day : period]);
}

function remember(previous, key, value, maximum) {
  const next = new Map(previous);
  next.delete(key);
  next.set(key, value);
  if (next.size > maximum) next.delete(next.keys().next().value);
  return next;
}

export function useBabyData(period = "week", { activeTab = "overview", day = new Date() } = {}) {
  const dayKey = activeTab === "day" ? localDateKey(day) : null;
  const [config, setConfig] = useState(null);
  const [children, setChildren] = useState(EMPTY);
  const [selectedId, setSelectedId] = useState(null);
  const [childrenReady, setChildrenReady] = useState(false);
  const [childrenError, setChildrenError] = useState(null);
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const [snapshots, setSnapshots] = useState(() => new Map());
  const [timersByChild, setTimersByChild] = useState(() => new Map());
  const [stockByChild, setStockByChild] = useState(() => new Map());
  const [refreshingKey, setRefreshingKey] = useState(null);
  const childrenRef = useRef(EMPTY);
  const loopRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const loop = createRefreshLoop(async () => {
      try {
        const settings = await api.getConfig({ signal: controller.signal });
        if (controller.signal.aborted) return;
        if (typeof settings?.demo_mode !== "boolean") throw new ApiError("Invalid settings");
        loop.stop();
        setConfig({ ...DEFAULT_CONFIG, ...settings });
      } catch {
        if (!controller.signal.aborted) setConfig(previous => previous || DEFAULT_CONFIG);
      }
    }, { interval: 30000, available: () => navigator.onLine !== false && document.visibilityState !== "hidden" });
    const checkAvailability = () => {
      const disconnected = navigator.onLine === false;
      setOffline(disconnected);
      if (disconnected) setConfig(previous => previous || DEFAULT_CONFIG);
      void loop.refresh();
    };
    document.addEventListener("visibilitychange", checkAvailability);
    window.addEventListener("pageshow", checkAvailability);
    window.addEventListener("online", checkAvailability);
    window.addEventListener("offline", checkAvailability);
    checkAvailability();
    return () => {
      loop.stop();
      controller.abort();
      document.removeEventListener("visibilitychange", checkAvailability);
      window.removeEventListener("pageshow", checkAvailability);
      window.removeEventListener("online", checkAvailability);
      window.removeEventListener("offline", checkAvailability);
    };
  }, []);

  const demo = config?.demo_mode;
  const mock = useMemo(() => demo ? getMockData(selectedId) : null, [demo, selectedId]);
  const availableChildren = mock?.children || children;
  const child = availableChildren.find(item => item.id === selectedId) || availableChildren[0] || null;
  const key = scopeKey(child?.id, activeTab, period, dayKey);
  const snapshot = snapshots.get(key) || EMPTY_SNAPSHOT;

  useEffect(() => {
    if (!config || demo) return;
    const controller = new AbortController();
    const { signal } = controller;
    const updateSnapshot = (target, apply) => setSnapshots(previous =>
      signal.aborted ? previous : remember(previous, target, apply(previous.get(target) || EMPTY_SNAPSHOT), 4));

    const run = async () => {
      let childList = childrenRef.current;
      let active = childList.find(item => item.id === selectedId) || childList[0];
      setRefreshingKey(scopeKey(active?.id, activeTab, period, dayKey));
      try {
        childList = (await readAllPages(api.getChildren, {}, signal)).map(fixChildPicture);
        if (signal.aborted) return;
        childrenRef.current = childList;
        setChildren(childList);
        setChildrenError(null);
      } catch (error) {
        if (signal.aborted) return;
        setChildrenError(error);
      } finally {
        if (!signal.aborted) setChildrenReady(true);
      }

      active = childList.find(item => item.id === selectedId) || childList[0];
      const target = scopeKey(active?.id, activeTab, period, dayKey);
      setRefreshingKey(target);
      try {
        if (!active) {
          updateSnapshot(target, previous => ({ ...previous, complete: true }));
          return;
        }

        const { reads, fullStock } = createSectionReads(api, active.id, period, activeTab, dayKey);
        const settled = {};
        let firstError = null;
        await refreshSections(reads, signal, ({ key: sectionKey }, result) => {
          const { data, error } = result;
          if (error && !firstError) firstError = error;
          if (data) {
            Object.assign(settled, data);
            if (sectionKey === "timers") {
              setTimersByChild(previous => signal.aborted ? previous : remember(previous, active.id, data.timers, 4));
            } else if (sectionKey === "stock") {
              setStockByChild(previous => signal.aborted ? previous : remember(previous, active.id, data, 2));
            }
          }
          updateSnapshot(target, previous => {
            const errors = { ...previous.errors };
            if (error) errors[sectionKey] = error;
            else delete errors[sectionKey];
            return { ...previous, data: data ? { ...previous.data, ...data } : previous.data, errors };
          });
        });

        if (signal.aborted) return;
        if (fullStock && settled.feedings && settled.pumping) {
          const stock = { stockFeedings: settled.feedings, stockPumping: settled.pumping };
          setStockByChild(previous => signal.aborted ? previous : remember(previous, active.id, stock, 2));
        }
        updateSnapshot(target, previous => ({
          ...previous,
          complete: true,
          lastSync: firstError ? previous.lastSync : new Date(),
          fullError: Object.keys(settled).length ? null : firstError,
        }));
      } finally {
        if (!signal.aborted) setRefreshingKey(null);
      }
    };

    const loop = createRefreshLoop(run, {
      interval: (Number(config.refresh_interval) || 30) * 1000,
      available: () => navigator.onLine !== false && document.visibilityState !== "hidden",
    });
    const resume = (event) => {
      void loop.refresh({ queue: event.type === "online" });
    };
    loopRef.current = loop;
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    void loop.refresh();

    return () => {
      loop.stop();
      controller.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      loopRef.current = null;
    };
  }, [config, demo, selectedId, period, activeTab, dayKey]);

  const selectChild = useCallback((id) => setSelectedId(id), []);
  const refetch = useCallback(() => loopRef.current?.refresh({ queue: true }), []);
  const data = mock || snapshot.data;
  const stock = stockByChild.get(child?.id);
  const errors = demo ? {} : { ...snapshot.errors };
  if (!demo && childrenError) errors.children = childrenError;
  if (offline && !demo) errors.connection = new ApiError("Offline", { code: "request_network" });

  return {
    children: availableChildren,
    child,
    selectChild,
    feedings: data.feedings || EMPTY,
    weeklyFeedings: data.weeklyFeedings || data.feedings || EMPTY,
    sleepEntries: data.sleepEntries || EMPTY,
    weeklySleep: data.weeklySleep || data.sleepEntries || EMPTY,
    changes: data.changes || EMPTY,
    tummyTimes: data.tummyTimes || EMPTY,
    weeklyTummyTimes: data.weeklyTummyTimes || data.tummyTimes || EMPTY,
    temperatures: data.temperatures || EMPTY,
    weights: data.weights || EMPTY,
    heights: data.heights || EMPTY,
    monthlyFeedings: data.monthlyFeedings || data.feedings || EMPTY,
    monthlySleep: data.monthlySleep || data.sleepEntries || EMPTY,
    pumping: data.pumping || EMPTY,
    stockFeedings: stock?.stockFeedings || mock?.feedings || EMPTY,
    stockPumping: stock?.stockPumping || EMPTY,
    milkWaste: data.milkWaste || EMPTY,
    notes: data.notes || EMPTY,
    timers: mock?.timers || timersByChild.get(child?.id) || EMPTY,
    loading: !config || (!demo && !offline && !childrenReady),
    viewLoading: !demo && !offline && !!child && !snapshot.complete,
    refreshing: !offline && refreshingKey === key,
    failedSections: Object.keys(errors),
    error: !demo ? errors.connection || snapshot.fullError || (!child && childrenError) || null : null,
    lastSync: snapshot.lastSync,
    unitSystem: config?.unit_system || DEFAULT_CONFIG.unit_system,
    refetch,
  };
}
