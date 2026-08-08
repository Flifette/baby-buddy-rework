import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api";
import { getMockData } from "../utils/mockData";

function toLocalISODate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fixChildPicture(c) {
  if (c?.picture) {
    try {
      const url = new URL(c.picture);
      c.picture = `./api/media${url.pathname}`;
    } catch {
      // leave as-is if not a valid URL
    }
  }
  return c;
}

function resultList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

export function useBabyData(period = "week") {
  const [children, setChildren] = useState([]);
  const [child, setChild] = useState(null);
  const [feedings, setFeedings] = useState([]);
  const [weeklyFeedings, setWeeklyFeedings] = useState([]);
  const [sleepEntries, setSleepEntries] = useState([]);
  const [weeklySleep, setWeeklySleep] = useState([]);
  const [changes, setChanges] = useState([]);
  const [tummyTimes, setTummyTimes] = useState([]);
  const [weeklyTummyTimes, setWeeklyTummyTimes] = useState([]);
  const [temperatures, setTemperatures] = useState([]);
  const [weights, setWeights] = useState([]);
  const [heights, setHeights] = useState([]);
  const [monthlyFeedings, setMonthlyFeedings] = useState([]);
  const [monthlySleep, setMonthlySleep] = useState([]);
  const [pumping, setPumping] = useState([]);
  const [milkWaste, setMilkWaste] = useState([]);
  const [notes, setNotes] = useState([]);
  const [timers, setTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [unitSystem, setUnitSystem] = useState("metric");
  const intervalRef = useRef(null);
  const childIdRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (childId) => {
    const requestId = ++requestIdRef.current;
    try {
      const now = new Date();

      const todayStr = toLocalISODate(now);
      const todayMin = `${todayStr}T00:00:00`;
      const todayMax = `${todayStr}T23:59:59`;

      const twentyFourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sleepMin = `${toLocalISODate(twentyFourAgo)}T${String(twentyFourAgo.getHours()).padStart(2, "0")}:${String(twentyFourAgo.getMinutes()).padStart(2, "0")}:00`;

      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekMin = `${toLocalISODate(weekAgo)}T00:00:00`;

      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 29);
      const monthMin = `${toLocalISODate(monthAgo)}T00:00:00`;
      const periodDays = { day: 1, week: 7, month: 30, halfyear: 183, year: 365 }[period];
      const periodDate = new Date(now);
      if (periodDays) periodDate.setDate(periodDate.getDate() - (periodDays - 1));
      const periodMin = periodDays ? `${toLocalISODate(periodDate)}T00:00:00` : undefined;

      const c = childId || undefined;

      const [
        feedingsRes,
        weeklyFeedingsRes,
        sleepRes,
        weeklySleepRes,
        changesRes,
        tummyRes,
        weeklyTummyRes,
        tempRes,
        weightRes,
        heightRes,
        timersRes,
        notesRes,
        pumpingRes,
        milkWasteRes,
      ] = await Promise.all([
        api.getFeedings({ child: c, start_min: periodMin, start_max: periodDays === 1 ? todayMax : undefined, limit: 5000, ordering: "-start" }),
        api.getFeedings({ child: c, start_min: weekMin, limit: 200, ordering: "-start" }),
        api.getSleep({ child: c, start_min: period === "all" ? undefined : (periodMin || sleepMin), limit: 5000, ordering: "-start" }),
        api.getSleep({ child: c, start_min: weekMin, limit: 200, ordering: "-start" }),
        api.getChanges({ child: c, date_min: period === "all" ? undefined : (periodMin || todayMin), date_max: periodDays === 1 ? todayMax : undefined, limit: 5000, ordering: "-time" }),
        api.getTummyTimes({ child: c, start_min: period === "all" ? undefined : (periodMin || todayMin), start_max: periodDays === 1 ? todayMax : undefined, limit: 5000, ordering: "-start" }),
        api.getTummyTimes({ child: c, start_min: weekMin, limit: 200, ordering: "-start" }),
        api.getTemperature({ child: c, limit: 10, ordering: "-time" }),
        api.getWeight({ child: c, limit: 20, ordering: "-date" }),
        api.getHeight({ child: c, limit: 20, ordering: "-date" }),
        api.getTimers(),
        api.getNotes({ child: c, start_min: periodMin, limit: 5000, ordering: "-time" }),
        api.getPumping({ child: c, start_min: periodMin, limit: 5000, ordering: "-start" }),
        api.getMilkWaste({ child: c, start_min: periodMin, start_max: periodDays === 1 ? todayMax : undefined }),
      ]);

      if (requestId !== requestIdRef.current) return;

      setFeedings(resultList(feedingsRes));
      setWeeklyFeedings(resultList(weeklyFeedingsRes));
      setSleepEntries(resultList(sleepRes));
      setWeeklySleep(resultList(weeklySleepRes));
      setChanges(resultList(changesRes));
      setTummyTimes(resultList(tummyRes));
      setWeeklyTummyTimes(resultList(weeklyTummyRes));
      setTemperatures(resultList(tempRes));
      setWeights(resultList(weightRes));
      setHeights(resultList(heightRes));
      setTimers(resultList(timersRes));
      setNotes(resultList(notesRes));
      // Growth uses the same period-filtered data. Reusing these responses avoids
      // downloading the complete feeding and sleep history twice for "Total".
      setMonthlyFeedings(resultList(feedingsRes));
      setMonthlySleep(resultList(sleepRes));
      setPumping(resultList(pumpingRes));
      setMilkWaste(resultList(milkWasteRes));
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [period]);

  const fetchAll = useCallback(async () => {
    try {
      const childrenRes = await api.getChildren();
      const allChildren = resultList(childrenRes).map(fixChildPicture);
      setChildren(allChildren);

      const active = allChildren.find((c) => c.id === childIdRef.current) || allChildren[0] || null;
      if (active) {
        childIdRef.current = active.id;
        setChild(active);
      }

      await fetchData(active?.id);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [fetchData]);

  const selectChild = useCallback(
    (id) => {
      const selected = children.find((c) => c.id === id);
      if (!selected || selected.id === child?.id) return;
      childIdRef.current = id;
      setChild(selected);
      setLoading(true);
      fetchData(id);
    },
    [children, child, fetchData]
  );

  const loadMock = useCallback(() => {
    const mock = getMockData();
    setChildren(mock.children);
    setChild(mock.children[0]);
    childIdRef.current = mock.children[0].id;
    setFeedings(mock.feedings);
    setWeeklyFeedings(mock.weeklyFeedings);
    setSleepEntries(mock.sleepEntries);
    setWeeklySleep(mock.weeklySleep);
    setChanges(mock.changes);
    setTummyTimes(mock.tummyTimes);
    setWeeklyTummyTimes(mock.weeklyTummyTimes);
    setTemperatures(mock.temperatures);
    setWeights(mock.weights);
    setHeights(mock.heights);
    setTimers(mock.timers);
    setNotes(mock.notes);
    setMonthlyFeedings(mock.monthlyFeedings);
    setMonthlySleep(mock.monthlySleep);
    setPumping([]);
    setMilkWaste([]);
    setLastSync(new Date());
    setLoading(false);
  }, []);

  const selectMockChild = useCallback(
    (id) => {
      const selected = children.find((c) => c.id === id);
      if (!selected || selected.id === child?.id) return;
      childIdRef.current = id;
      setChild(selected);
      const mock = getMockData(id);
      setFeedings(mock.feedings);
      setWeeklyFeedings(mock.weeklyFeedings);
      setSleepEntries(mock.sleepEntries);
      setWeeklySleep(mock.weeklySleep);
      setChanges(mock.changes);
      setTummyTimes(mock.tummyTimes);
      setWeeklyTummyTimes(mock.weeklyTummyTimes);
      setTemperatures(mock.temperatures);
      setWeights(mock.weights);
      setHeights(mock.heights);
      setTimers(mock.timers);
      setNotes(mock.notes);
      setMonthlyFeedings(mock.monthlyFeedings);
      setMonthlySleep(mock.monthlySleep);
      setPumping([]);
      setMilkWaste([]);
    },
    [children, child]
  );

  const demoRef = useRef(false);

  useEffect(() => {
    api
      .getConfig()
      .then((cfg) => {
        if (cfg.unit_system) setUnitSystem(cfg.unit_system);
        if (cfg.demo_mode) {
          demoRef.current = true;
          loadMock();
        } else {
          fetchAll();
          const ms = (cfg.refresh_interval || 30) * 1000;
          intervalRef.current = setInterval(fetchAll, ms);
        }
      })
      .catch(() => {
        fetchAll();
        intervalRef.current = setInterval(fetchAll, 30000);
      });

    return () => clearInterval(intervalRef.current);
  }, [fetchAll, loadMock]);

  return {
    children,
    child,
    selectChild: demoRef.current ? selectMockChild : selectChild,
    feedings,
    weeklyFeedings,
    sleepEntries,
    weeklySleep,
    changes,
    tummyTimes,
    weeklyTummyTimes,
    temperatures,
    weights,
    heights,
    monthlyFeedings,
    monthlySleep,
    pumping,
    milkWaste,
    notes,
    timers,
    loading,
    error,
    lastSync,
    unitSystem,
    refetch: fetchAll,
  };
}
