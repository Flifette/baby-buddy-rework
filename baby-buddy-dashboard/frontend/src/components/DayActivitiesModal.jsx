import Modal from "./Modal";
import TimelineItem from "./TimelineItem";
import DiaperBadge from "./DiaperBadge";
import { Icons } from "./Icons";
import { colors } from "../utils/colors";
import {
  toFeedingTimeline,
  toSleepBlocks,
  toDiaperTimeline,
  parseDuration,
} from "../utils/formatters";
import { useUnits } from "../utils/units";
import { useLanguage } from "../utils/i18n";

export default function DayActivitiesModal({ day, type, data, onEditEntry, onClose }) {
  const units = useUnits();
  const { language, locale, t } = useLanguage();

  const getIcon = () => {
    switch (type) {
      case "feeding": return <Icons.Bottle />;
      case "sleep": return <Icons.Moon />;
case "tummy": return <Icons.BabyCrawl />;
      default: return <Icons.Activity />;
    }
  };

  const getColor = () => {
    switch (type) {
      case "feeding": return colors.feeding;
      case "sleep": return colors.sleep;
      case "tummy": return colors.tummy;
      default: return colors.diaper;
    }
  };

  const getTitle = () => {
    const titles = {
      feeding: t("activity.feeding"),
      sleep: t("activity.sleep"),
      tummy: t("activity.tummy"),
    };
    return `${titles[type] || t("activity.activities")} - ${day}`;
  };

  const renderContent = () => {
    if (!data || data.length === 0) {
      return (
        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 40 }}>
          {t("chart.noActivity")}
        </div>
      );
    }

    if (type === "feeding") {
      const timeline = toFeedingTimeline(data, units.volume, language);
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {timeline.map((f, i, arr) => (
            <div
              key={i}
              className="entry-clickable"
              onClick={() => {
                onEditEntry?.("feeding", f.entry);
                onClose();
              }}
            >
              <TimelineItem
                time={f.time}
                label={f.label}
                detail={f.detail}
                color={colors.feeding}
                isLast={i === arr.length - 1}
              />
            </div>
          ))}
        </div>
      );
    }

    if (type === "sleep") {
      const blocks = toSleepBlocks(data, language);
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {blocks.map((s, i, arr) => (
            <div
              key={i}
              className="entry-clickable"
              onClick={() => {
                onEditEntry?.("sleep", s.entry);
                onClose();
              }}
            >
              <TimelineItem
                time={`${s.start}–${s.end}`}
                label={`${s.duration.toFixed(1)} ${t("unit.hourShort")}${s.nap ? ` · ${t("overview.nap")}` : ""}`}
                detail={`${s.start} ${t("common.at")} ${s.end}`}
                color={colors.sleep}
                isLast={i === arr.length - 1}
              />
            </div>
          ))}
        </div>
      );
    }

    if (type === "tummy") {
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {data.map((entry, i, arr) => (
            <div
              key={i}
              className="entry-clickable"
              onClick={() => {
                onEditEntry?.("tummy", entry);
                onClose();
              }}
            >
              <TimelineItem
                time={new Date(entry.start).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                label={`${Math.round(parseDuration(entry.duration) * 60)} ${t("unit.minuteShort")}${entry.milestone ? ` · ${entry.milestone}` : ""}`}
                detail={`${new Date(entry.start).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} ${t("common.at")} ${new Date(entry.end).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`}
                color={colors.tummy}
                isLast={i === arr.length - 1}
              />
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <Modal title={getTitle()} onClose={onClose}>
      <div style={{ padding: "0 4px" }}>
        {renderContent()}
      </div>
    </Modal>
  );
}
