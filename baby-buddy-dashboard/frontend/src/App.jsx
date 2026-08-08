import { useEffect, useRef, useState } from "react";
import { useBabyData } from "./hooks/useBabyData";
import { useTimers } from "./hooks/useTimers";
import { UnitContext } from "./utils/units";
import { PERIODS, PeriodContext } from "./utils/period";
import { Icons } from "./components/Icons";
import { colors } from "./utils/colors";
import { getAge, formatElapsed } from "./utils/formatters";
import OverviewTab from "./tabs/OverviewTab";
import DayTab from "./tabs/DayTab";
import GrowthTab from "./tabs/GrowthTab";
import RoutineTab from "./tabs/RoutineTab";
import NotesTab from "./tabs/NotesTab";
import FeedingForm from "./components/forms/FeedingForm";
import SleepForm from "./components/forms/SleepForm";
import DiaperForm from "./components/forms/DiaperForm";
import TemperatureForm from "./components/forms/TemperatureForm";
import TummyTimeForm from "./components/forms/TummyTimeForm";
import NoteForm from "./components/forms/NoteForm";
import WeightForm from "./components/forms/WeightForm";
import HeightForm from "./components/forms/HeightForm";
import PumpingForm from "./components/forms/PumpingForm";
import MilkWasteForm from "./components/forms/MilkWasteForm";
import TimerButton from "./components/TimerButton";
import Modal from "./components/Modal";
import "./styles.css";

const TABS = [
  { id: "overview", label: "Aperçu", icon: <Icons.Eye /> },
  { id: "growth", label: "Croissance", icon: <Icons.TrendUp /> },
  { id: "day", label: "Journée", icon: <Icons.Sun /> },
  { id: "routine", label: "Routine", icon: <Icons.Calendar /> },
  { id: "notes", label: "Notes", icon: <Icons.StickyNote /> },
];

const ACTION_GROUPS = [
  {
    label: "Suivi",
    actions: [
      { id: "feeding", label: "Repas", icon: <Icons.Bottle />, color: colors.feeding },
      { id: "pumping", label: "Tirage", icon: <Icons.Pump />, color: colors.pumping },
      { id: "milkWaste", label: "Lait non bu", icon: <Icons.BottleOff />, color: colors.milkWaste },
      { id: "sleep", label: "Sommeil", icon: <Icons.Moon />, color: colors.sleep },
      { id: "diaper", label: "Changes", icon: <Icons.Droplet />, color: colors.diaper },
      { id: "tummy", label: "Temps sur le ventre", icon: <Icons.BabyCrawl />, color: colors.tummy },
    ],
  },
  {
    label: "Mesures",
    actions: [
      { id: "temp", label: "Température", icon: <Icons.Temp />, color: colors.temp },
      { id: "weight", label: "Poids", icon: <Icons.Weight />, color: colors.growth },
      { id: "height", label: "Taille", icon: <Icons.Ruler />, color: colors.height },
    ],
  },
  {
    label: "Note",
    actions: [
      { id: "note", label: "Note", icon: <Icons.StickyNote />, color: colors.note },
    ],
  },
];

const TIMER_TYPES = [
      { id: "feeding", label: "Repas", icon: <Icons.Bottle />, color: colors.feeding },
      { id: "sleep", label: "Sommeil", icon: <Icons.Moon />, color: colors.sleep },
      { id: "tummy", label: "Temps sur le ventre", icon: <Icons.BabyCrawl />, color: colors.tummy },
];

const TILE_DEFAULTS = {
  overview: {
    feedingSummary: true, sleepSummary: true, diaperSummary: true, pumpingSummary: true,
    feedings: true, sleep: true, diapers: true, pumping: true, tummy: false,
  },
  growth: { measurements: true, feedingSummary: true, sleepSummary: true, tummySummary: true, feedingChart: true, sleepChart: true, tummyChart: true, weightChart: true, heightChart: true, milkStock: true },
};

function loadTileVisibility() {
  try {
    const saved = JSON.parse(localStorage.getItem("baby-buddy-tile-visibility") || "null");
    return {
      overview: { ...TILE_DEFAULTS.overview, ...(saved?.overview || {}) },
      growth: { ...TILE_DEFAULTS.growth, ...(saved?.growth || {}) },
    };
  } catch {
    return TILE_DEFAULTS;
  }
}

function toLocalDatetime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function timerNameToType(name) {
  if (!name) return "feeding";
  const n = name.toLowerCase();
  if (n.includes("sleep")) return "sleep";
  if (n.includes("tummy")) return "tummy";
  return "feeding";
}

export default function App() {
  const [period, setPeriod] = useState("week");
  const data = useBabyData(period);
  const timer = useTimers(data.timers, data.child?.id);
  const [activeTab, setActiveTab] = useState("overview");
  const periodBeforeDay = useRef(null);

  useEffect(() => {
    if (activeTab === "day") {
      if (periodBeforeDay.current === null) {
        periodBeforeDay.current = period;
        if (period !== "all") setPeriod("all");
      }
    } else if (periodBeforeDay.current !== null) {
      const restore = periodBeforeDay.current;
      periodBeforeDay.current = null;
      if (period !== restore) setPeriod(restore);
    }
  }, [activeTab, period]);
  const [modal, setModal] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState("Track");
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState(null);
  const [tileVisibility, setTileVisibility] = useState(loadTileVisibility);
  const [showTileSettings, setShowTileSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("baby-buddy-tile-visibility", JSON.stringify(tileVisibility));
  }, [tileVisibility]);

  const closeModal = () => setModal(null);
  const handleFormDone = () => {
    closeModal();
    data.refetch();
  };

  if (data.loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Chargement…</span>
      </div>
    );
  }

  return (
    <AppContent data={data} timer={timer} activeTab={activeTab} setActiveTab={setActiveTab} period={period} setPeriod={setPeriod} modal={modal} setModal={setModal} showActions={showActions} setShowActions={setShowActions} expandedGroup={expandedGroup} setExpandedGroup={setExpandedGroup} showTimerPicker={showTimerPicker} setShowTimerPicker={setShowTimerPicker} editingTimerId={editingTimerId} setEditingTimerId={setEditingTimerId} tileVisibility={tileVisibility} setTileVisibility={setTileVisibility} showTileSettings={showTileSettings} setShowTileSettings={setShowTileSettings} />
  );
}

function AppContent({ data: rawData, timer, activeTab, setActiveTab, period, setPeriod, modal, setModal, showActions, setShowActions, expandedGroup, setExpandedGroup, showTimerPicker, setShowTimerPicker, editingTimerId, setEditingTimerId, tileVisibility, setTileVisibility, showTileSettings, setShowTileSettings }) {
  const data = { ...rawData };
  ["children", "feedings", "weeklyFeedings", "sleepEntries", "weeklySleep", "changes", "tummyTimes", "weeklyTummyTimes", "temperatures", "weights", "heights", "monthlyFeedings", "monthlySleep", "pumping", "milkWaste", "notes"].forEach((key) => {
    if (!Array.isArray(data[key])) data[key] = [];
  });
  const children = Array.isArray(data.children) ? data.children : [];
  const activeTimers = Array.isArray(timer.activeTimers) ? timer.activeTimers : [];
  const closeModal = () => setModal(null);
  const handleFormDone = () => { closeModal(); data.refetch(); };
  return (
    <UnitContext.Provider value={data.unitSystem}><PeriodContext.Provider value={{ period, setPeriod }}>
    <div className="app">
      {/* Header */}
      <header className="app-header fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar">
            {data.child?.picture ? (
              <img src={data.child.picture} alt={data.child.first_name} className="avatar-img" />
            ) : (
              <Icons.Baby />
            )}
          </div>
          <div>
            <div className="baby-name-row">
              <h1 className="baby-name">{data.child?.first_name || "Baby"}</h1>
              {children.length >= 2 && (
                <label className="child-picker-inline" title="Changer d’enfant">
                  <select aria-label="Changer d’enfant" value={data.child?.id || ""} onChange={(event) => data.selectChild(Number(event.target.value))}>
                    {children.map((child) => <option key={child.id} value={child.id}>{child.first_name}</option>)}
                  </select>
                  <span aria-hidden="true">⌄</span>
                </label>
              )}
            </div>
            {data.child?.birth_date && (
              <span className="baby-age">{getAge(data.child.birth_date)}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data.error && (
            <span className="sync-error">Erreur de connexion</span>
          )}
          {data.lastSync && !data.error && (
            <span className="sync-time">
              {data.lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <a className="refresh-btn" href="/lovelace/0" target="_top" rel="noreferrer" title="Tableau de bord Home Assistant">
            <Icons.Home />
          </a>
          <button className="refresh-btn" onClick={data.refetch} title="Actualiser">
            <Icons.Activity />
          </button>
          <button className="refresh-btn" onClick={() => setShowTileSettings(true)} title="Réglages des tuiles" aria-label="Réglages des tuiles">
            <Icons.Settings />
          </button>
        </div>
      </header>

      {/* Active Timer Bars */}
      {activeTimers.map((t) => (
        <div key={t.id} className="timer-bar fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="timer-pulse" />
            <Icons.Timer />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {t.name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {editingTimerId === t.id ? (
              <input
                type="datetime-local"
                className="timer-edit-input"
                defaultValue={toLocalDatetime(t.start)}
                autoFocus
                onBlur={(e) => {
                  if (e.target.value) {
                    timer.editTimer(t.id, `${e.target.value}:00`);
                  }
                  setEditingTimerId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                  if (e.key === "Escape") setEditingTimerId(null);
                }}
              />
            ) : (
              <span
                className="timer-elapsed"
                style={{ cursor: "pointer" }}
                title="Modifier l’heure de début"
                onClick={() => setEditingTimerId(t.id)}
              >
                {formatElapsed(timer.elapsedMap[t.id] || 0)}
              </span>
            )}
            <button
              className="timer-save-btn"
              onClick={async () => {
                const stopped = await timer.stopTimer(t.id);
                if (stopped) {
                  setModal({ type: timerNameToType(stopped.name), timerId: stopped.id });
                }
              }}
            >
              Enregistrer
            </button>
            <button
              className="timer-discard-btn"
              onClick={() => timer.discardTimer(t.id)}
            >
              <Icons.X />
            </button>
          </div>
        </div>
      ))}

      {/* Global period selector (independent from the day timeline) */}
      {activeTab !== "day" && <div className="period-selector fade-in" role="group" aria-label="Période d’affichage">
        {PERIODS.map(([id, label]) => <button key={id} className={`period-btn${period === id ? " period-btn-active" : ""}`} onClick={() => setPeriod(id)}>{label}</button>)}
      </div>}

      {/* Tab Navigation */}
      <nav className="tab-nav fade-in">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {activeTab === "overview" && (
          <OverviewTab
            feedings={data.feedings}
            weeklyFeedings={data.weeklyFeedings}
            sleepEntries={data.sleepEntries}
            weeklySleep={data.weeklySleep}
            changes={data.changes}
            tummyTimes={data.tummyTimes}
            weeklyTummyTimes={data.weeklyTummyTimes}
            pumping={data.pumping}
            milkWaste={data.milkWaste}
            period={period}
            visibleTiles={tileVisibility.overview}
            onEditEntry={(type, entry) => setModal({ type, entry })}
          />
        )}
        {activeTab === "day" && (
          <DayTab feedings={data.feedings} pumping={data.pumping} milkWaste={data.milkWaste} changes={data.changes} sleepEntries={data.sleepEntries} tummyTimes={data.tummyTimes} temperatures={data.temperatures} weights={data.weights} heights={data.heights} notes={data.notes} onEditEntry={(type, entry) => setModal({ type, entry })} />
        )}
        {activeTab === "growth" && (
          <GrowthTab
            weights={data.weights}
            heights={data.heights}
            monthlyFeedings={data.monthlyFeedings}
            monthlySleep={data.monthlySleep}
            tummyTimes={data.tummyTimes}
            pumping={data.pumping}
            feedings={data.feedings}
            milkWaste={data.milkWaste}
            period={period}
            visibleTiles={tileVisibility.growth}
            onEditEntry={(type, entry) => setModal({ type, entry })}
            onEditMilkWaste={(entry) => setModal({ type: "milkWaste", entry })}
          />
        )}
        {activeTab === "routine" && (
          <RoutineTab
            feedings={data.feedings}
            pumping={data.pumping}
            changes={data.changes}
            sleepEntries={data.sleepEntries}
            tummyTimes={data.tummyTimes}
            period={period}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            notes={data.notes}
            period={period}
            onEditEntry={(type, entry) => setModal({ type, entry })}
          />
        )}
      </main>

      {showTileSettings && (
        <Modal title="Réglages des tuiles" onClose={() => setShowTileSettings(false)}>
          {[
            ["overview", "Aperçu", [["feedingSummary", "Résumé des repas"], ["sleepSummary", "Résumé du sommeil"], ["diaperSummary", "Résumé des changes"], ["pumpingSummary", "Résumé du tirage"], ["feedings", "Repas récents"], ["sleep", "Sommeil"], ["diapers", "Changes"], ["pumping", "Tirage de lait"], ["tummy", "Temps sur le ventre"]]],
            ["growth", "Croissance", [["measurements", "Mesures récentes"], ["feedingSummary", "Résumé des repas"], ["sleepSummary", "Résumé du sommeil"], ["tummySummary", "Résumé du temps sur le ventre"], ["feedingChart", "Repas quotidiens"], ["sleepChart", "Sommeil quotidien"], ["tummyChart", "Temps sur le ventre quotidien"], ["weightChart", "Évolution du poids"], ["heightChart", "Évolution de la taille"], ["milkStock", "Stock de lait"]]],
          ].map(([view, title, items]) => (
            <section key={view} className="tile-settings-section">
              <h3>{title}</h3>
              {items.map(([key, label]) => (
                <label key={key} className="tile-setting-row">
                  <input type="checkbox" checked={tileVisibility[view][key] !== false} onChange={(event) => setTileVisibility((prev) => ({ ...prev, [view]: { ...prev[view], [key]: event.target.checked } }))} />
                  <span>{label}</span>
                </label>
              ))}
            </section>
          ))}
        </Modal>
      )}

      {/* Quick Action FAB */}
      <div className="fab-container">
        {showActions && (
          <div className="fab-menu fade-in">
            {ACTION_GROUPS.map((group) => {
              const isOpen = expandedGroup === group.label;
              return (
                <div key={group.label} className="fab-group">
                  <button
                    className={`fab-group-label${isOpen ? " fab-group-label-active" : ""}`}
                    onClick={() => setExpandedGroup(isOpen ? null : group.label)}
                  >
                    {group.label}
                  </button>
                  {isOpen && (
                    <div className="fab-group-items">
                      {group.actions.map((action) => (
                        <button
                          key={action.id}
                          className="fab-action"
                          onClick={() => {
                            setModal({ type: action.id });
                            setShowActions(false);
                          }}
                        >
                          <span
                            className="fab-action-icon"
                            style={{ background: `${action.color}18`, color: action.color }}
                          >
                            {action.icon}
                          </span>
                          <span className="fab-action-label">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showTimerPicker && (
          <div className="fab-menu fade-in" style={{ right: 76 }}>
            {TIMER_TYPES.map((t) => (
              <button
                key={t.id}
                className="fab-action"
                onClick={() => {
                  timer.startTimer(t.id);
                  setShowTimerPicker(false);
                }}
              >
                <span
                  className="fab-action-icon"
                  style={{ background: `${t.color}18`, color: t.color }}
                >
                  {t.icon}
                </span>
                <span className="fab-action-label">{t.label}</span>
              </button>
            ))}
          </div>
        )}
        <TimerButton
          label="Timer"
          icon={<Icons.Timer />}
          color={colors.feeding}
          active={false}
          onClick={() => {
            setShowTimerPicker(!showTimerPicker);
            setShowActions(false);
          }}
        />
        <button
          className="fab-btn"
          style={{ background: showActions ? "var(--text-muted)" : colors.feeding }}
          onClick={() => { setShowActions(!showActions); setShowTimerPicker(false); setExpandedGroup("Track"); }}
        >
          <span style={{ transform: showActions ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "flex" }}>
            <Icons.Plus />
          </span>
        </button>
      </div>

      {/* Modals */}
      {modal?.type === "feeding" && (
        <FeedingForm
          childId={data.child?.id}
          timerId={modal.timerId}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "sleep" && (
        <SleepForm
          childId={data.child?.id}
          timerId={modal.timerId}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "diaper" && (
        <DiaperForm
          childId={data.child?.id}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "temp" && (
        <TemperatureForm
          childId={data.child?.id}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "tummy" && (
        <TummyTimeForm
          childId={data.child?.id}
          timerId={modal.timerId}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "weight" && (
        <WeightForm
          childId={data.child?.id}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "height" && (
        <HeightForm
          childId={data.child?.id}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "note" && (
        <NoteForm
          childId={data.child?.id}
          entry={modal.entry}
          onDone={handleFormDone}
          onClose={closeModal}
        />
      )}
      {modal?.type === "pumping" && (
        <PumpingForm childId={data.child?.id} entry={modal.entry} onDone={handleFormDone} onClose={closeModal} />
      )}
      {modal?.type === "milkWaste" && (
        <MilkWasteForm childId={data.child?.id} entry={modal.entry} onDone={handleFormDone} onClose={closeModal} />
      )}
    </div>
      </PeriodContext.Provider></UnitContext.Provider>
  );
}
