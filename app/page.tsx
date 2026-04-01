"use client";

import Link from "next/dist/client/link";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

type Timetable = {
  id: number;
  date: string;
  time_from: string;
  time_to: string;
  is_booking: boolean;
  booking_by: string;
  created_at: string;
  updated_at: string;
};
type DaySummary = { hasAvailable: boolean; hasBooked: boolean };

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const SESSION_KEY = "bhaypark_confirmed";

function formatTime(t: string) {
  return t?.slice(0, 5) ?? "";
}

function Skeleton({
  w = "100%",
  h = "14px",
  r = "6px",
  mb = "0px",
}: {
  w?: string;
  h?: string;
  r?: string;
  mb?: string;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: "rgba(201,168,76,0.07)",
        marginBottom: mb,
        animation: "pulse 1.6s ease-in-out infinite",
      }}
    />
  );
}

function Spinner({ size = 13 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid rgba(201,168,76,0.15)",
        borderTopColor: "#C9A84C",
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export default function Page() {
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(
    today.getDate(),
  );

  const [daySlots, setDaySlots] = useState<Timetable[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true); // very first page load

  const [monthSummary, setMonthSummary] = useState<Record<number, DaySummary>>(
    {},
  );
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDate, setPendingDate] = useState<number | null>(null);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);

  useEffect(() => {
    const confirmed = sessionStorage.getItem(SESSION_KEY);
    if (confirmed === "true") setHasConfirmedSession(true);
  }, []);

  const fetchMonthSummary = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/timetable?month=${ym}`);
      const json = await res.json();
      const summary: Record<number, DaySummary> = {};
      let data: Timetable[] =
        json.success && json.data?.length ? json.data : [];
      if (!data.length) {
        const fallback = await fetch("/api/timetable").then((r) => r.json());
        data = fallback.success ? fallback.data : [];
      }
      data.forEach((entry: Timetable) => {
        const [y, m, d] = entry.date.slice(0, 10).split("-").map(Number);
        if (y === currentYear && m === currentMonth + 1) {
          if (!summary[d])
            summary[d] = { hasAvailable: false, hasBooked: false };
          if (entry.is_booking) summary[d].hasBooked = true;
          else summary[d].hasAvailable = true;
        }
      });
      setMonthSummary(summary);
    } catch {
      setMonthSummary({});
    } finally {
      setLoadingMonth(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthSummary();
  }, [fetchMonthSummary]);

  const fetchDaySlots = useCallback(
    async (day: number, year: number, month: number) => {
      setLoadingSlots(true);
      setDaySlots([]);
      try {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const res = await fetch(`/api/timetable?date=${dateStr}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDaySlots(
            [...(json.data as Timetable[])].sort((a, b) =>
              a.time_from.localeCompare(b.time_from),
            ),
          );
        }
      } catch {
        setDaySlots([]);
      } finally {
        setLoadingSlots(false);
        setInitialLoad(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedDate !== null)
      fetchDaySlots(selectedDate, currentYear, currentMonth);
  }, [selectedDate, currentYear, currentMonth, fetchDaySlots]);

  useEffect(() => {
    fetchDaySlots(today.getDate(), today.getFullYear(), today.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleDateClick = (day: number) => {
    if (hasConfirmedSession) {
      setSelectedDate(day);
      if (window.innerWidth < 1024)
        setTimeout(
          () =>
            document
              .getElementById("detail-section")
              ?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
    } else {
      setPendingDate(day);
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setHasConfirmedSession(true);
    setSelectedDate(pendingDate);
    setShowConfirm(false);
    setPendingDate(null);
    if (window.innerWidth < 1024)
      setTimeout(
        () =>
          document
            .getElementById("detail-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingDate(null);
  };

  const prevMonth = () => {
    setSelectedDate(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDate(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const getDayStatus = (day: number): "tersedia" | "penuh" | "unknown" => {
    const s = monthSummary[day];
    if (!s) return "unknown";
    return s.hasAvailable ? "tersedia" : "penuh";
  };

  const tersediaCount = daySlots.filter((s) => !s.is_booking).length;
  const terisiCount = daySlots.filter((s) => s.is_booking).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0}
        body{font-family:'Mulish',sans-serif}
        .font-oswald{font-family:'Oswald',sans-serif}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:0.85}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
      `}</style>

      <div
        style={{ background: "#0A0A0A", minHeight: "100vh", color: "#EAEAEA" }}
      >
        {/* HEADER */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
            padding: "28px 20px 20px",
            borderBottom: "1px solid rgba(201,168,76,0.25)",
            background: "linear-gradient(180deg,#1a0f00 0%,#0A0A0A 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 0%,rgba(201,168,76,0.08) 0%,transparent 70%)",
            }}
          />
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#C9A84C,#F0CC6E,#C9A84C)",
              color: "#1a0f00",
              fontFamily: "Oswald, sans-serif",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: "3px",
              marginBottom: "10px",
            }}
          >
            Kepolisian Negara Republik Indonesia Daerah Kepulauan Bangka
            Belitung Pelayanan Markas
          </span>
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#F0CC6E",
              letterSpacing: "1px",
              textTransform: "uppercase",
              lineHeight: 1.2,
            }}
          >
            Bhaypark Mini Soccer
          </div>
          {/* <Link
            href="/admin/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "5px 11px",
              borderRadius: "5px",
              border: "1px solid rgba(201,168,76,0.35)",
              color: "#C9A84C",
              textDecoration: "none",
              marginTop: "8px",
              transition: "background 0.2s",
            }}
          >
            🔒 Admin Login
          </Link> */}
        </div>

        {/* CONTENT */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            paddingBottom: "80px",
          }}
          className="content-grid"
        >
          <style>{`
            .content-grid {
              display: grid;
              grid-template-columns: 1fr;
            }
            @media(min-width:1024px){
              .content-grid {
                grid-template-columns: minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.4fr);
                align-items: start;
                padding: 8px 32px 64px;
              }
            }
            .col-rules { padding: 20px 16px; }
            .col-calendar { padding: 20px 16px; }
            .col-detail { padding: 20px 16px; }
            @media(min-width:1024px){
              .col-rules { padding: 24px 16px; border-right: 1px solid rgba(201,168,76,0.15); }
              .col-calendar { padding: 24px 24px; border-right: 1px solid rgba(201,168,76,0.15); }
              .col-detail { padding: 24px 24px; position: sticky; top: 16px; }
            }
          `}</style>

          {/* ── COL 1: RULES ── */}
          <div className="col-rules">
            <SectionTitle>Tata Tertib Lapangan</SectionTitle>
            <div
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(201,168,76,0.25)",
                boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
              }}
            >
              <img
                src="/MainRules.jpeg"
                alt="Tata Tertib Bhaypark Mini Soccer"
                style={{ width: "100%", display: "block" }}
              />
            </div>
          </div>

          {/* Mobile divider */}
          <div
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg,transparent,#7A6030,transparent)",
              margin: "0 20px",
            }}
            className="mobile-divider"
          />
          <style>{`.mobile-divider{display:block}@media(min-width:1024px){.mobile-divider{display:none}}`}</style>

          {/* ── COL 2: CALENDAR ── */}
          <div className="col-calendar">
            <SectionTitle>Kalender Booking</SectionTitle>
            <div
              style={{
                background: "#111111",
                border: "1px solid rgba(201,168,76,0.25)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* Nav */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(201,168,76,0.2)",
                  background:
                    "linear-gradient(90deg,rgba(201,168,76,0.05),transparent)",
                }}
              >
                <button
                  onClick={prevMonth}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "#C9A84C",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ‹
                </button>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {loadingMonth && <Spinner />}
                  <span
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "#F0CC6E",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                </div>
                <button
                  onClick={nextMonth}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "#C9A84C",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ›
                </button>
              </div>

              {/* Day names */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  padding: "10px 12px 4px",
                }}
              >
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "#888",
                      textTransform: "uppercase",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  gap: "3px",
                  padding: "4px 12px 12px",
                }}
              >
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = getDayStatus(day);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSel = selectedDate === day;
                  const bg = isSel
                    ? "rgba(201,168,76,0.15)"
                    : status === "tersedia"
                      ? "rgba(46,204,113,0.12)"
                      : status === "penuh"
                        ? "rgba(204,34,34,0.12)"
                        : "rgba(100,100,100,0.08)";
                  const bc = isSel
                    ? "#C9A84C"
                    : status === "tersedia"
                      ? "rgba(46,204,113,0.2)"
                      : status === "penuh"
                        ? "rgba(204,34,34,0.2)"
                        : "rgba(100,100,100,0.15)";
                  const tc = isSel
                    ? "#F0CC6E"
                    : status === "tersedia"
                      ? "#2ECC71"
                      : status === "penuh"
                        ? "#E57373"
                        : "#666";
                  const dc =
                    status === "tersedia"
                      ? "#2ECC71"
                      : status === "penuh"
                        ? "#E57373"
                        : "#444";
                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(day)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.13s",
                        border: `1px solid ${bc}`,
                        background: bg,
                        boxShadow: isSel
                          ? "0 0 0 2px #F0CC6E"
                          : isToday
                            ? "0 0 0 2px #C9A84C"
                            : "none",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform =
                          "scale(1.08)";
                        (e.currentTarget as HTMLDivElement).style.zIndex = "2";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform =
                          "scale(1)";
                        (e.currentTarget as HTMLDivElement).style.zIndex = "0";
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Oswald, sans-serif",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: tc,
                          lineHeight: 1,
                        }}
                      >
                        {day}
                      </span>
                      {loadingMonth ? (
                        <span
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "50%",
                            background: "rgba(201,168,76,0.2)",
                            marginTop: "2px",
                            animation: "pulse 1.6s infinite",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: "4px",
                            height: "4px",
                            borderRadius: "50%",
                            background: dc,
                            marginTop: "2px",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  padding: "0 12px 12px",
                  justifyContent: "center",
                }}
              >
                {[
                  { color: "#2ECC71", label: "Tersedia" },
                  { color: "#E57373", label: "Penuh" },
                  { color: "#C9A84C", label: "Hari Ini", o: true },
                ].map((l) => (
                  <div
                    key={l.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      color: "#888",
                    }}
                  >
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: l.color,
                        display: "inline-block",
                        ...(l.o
                          ? {
                              outline: `2px solid ${l.color}`,
                              outlineOffset: "1px",
                            }
                          : {}),
                      }}
                    />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── COL 3: DETAIL ── */}
          <div
            id="detail-section"
            className="col-detail"
            style={{ display: selectedDate || true ? undefined : "none" }}
          >
            <style>{`@media(max-width:1023px){.detail-hidden-mobile{display:none}}`}</style>
            <SectionTitle>Detail Jadwal</SectionTitle>

            {selectedDate ? (
              <div
                style={{
                  background: "#111111",
                  border: "1px solid rgba(201,168,76,0.25)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                {/* Detail header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(201,168,76,0.2)",
                    background:
                      "linear-gradient(90deg,rgba(201,168,76,0.08),transparent)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#F0CC6E",
                    }}
                  >
                    {selectedDate} {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {loadingSlots ? (
                      <Spinner />
                    ) : (
                      <>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "20px",
                            background: "rgba(46,204,113,0.12)",
                            color: "#2ECC71",
                            border: "1px solid rgba(46,204,113,0.2)",
                          }}
                        >
                          {tersediaCount} slot
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "20px",
                            background: "rgba(204,34,34,0.12)",
                            color: "#E57373",
                            border: "1px solid rgba(204,34,34,0.2)",
                          }}
                        >
                          {terisiCount} terisi
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ padding: "10px 10px 6px" }}>
                  {loadingSlots ? (
                    // Skeleton slots
                    [1, 2, 3].map((i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 13px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255,255,255,0.04)",
                          background: "rgba(255,255,255,0.015)",
                          marginBottom: "8px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Skeleton w="110px" h="14px" mb="5px" />
                          <Skeleton w="50px" h="9px" />
                        </div>
                        <Skeleton w="55px" h="20px" r="20px" />
                      </div>
                    ))
                  ) : daySlots.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "22px",
                          opacity: 0.3,
                          marginBottom: "8px",
                        }}
                      >
                        📭
                      </div>
                      <div style={{ color: "#555", fontSize: "13px" }}>
                        Tidak ada slot pada tanggal ini
                      </div>
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 13px",
                          borderRadius: "10px",
                          border: "1px solid",
                          marginBottom: "8px",
                          background: !slot.is_booking
                            ? "rgba(46,204,113,0.12)"
                            : "rgba(204,34,34,0.12)",
                          borderColor: !slot.is_booking
                            ? "rgba(46,204,113,0.15)"
                            : "rgba(204,34,34,0.15)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#EAEAEA",
                          }}
                        >
                          {formatTime(slot.time_from)} –{" "}
                          {formatTime(slot.time_to)}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                              color: !slot.is_booking ? "#2ECC71" : "#E57373",
                            }}
                          >
                            {slot.is_booking ? "Terisi" : "Tersedia"}
                          </div>
                          {slot.booking_by && (
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#888",
                                marginTop: "1px",
                              }}
                            >
                              {slot.booking_by}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "none" }} className="desktop-placeholder">
                <style>{`@media(min-width:1024px){.desktop-placeholder{display:flex!important;flex-direction:column;align-items:center;justify-content:center;background:#111;border:1px dashed rgba(201,168,76,0.15);border-radius:14px;padding:60px 20px;text-align:center;gap:10px}}`}</style>
                <div style={{ fontSize: "28px", opacity: 0.25 }}>📅</div>
                <p
                  style={{
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "11px",
                    color: "#555",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Pilih tanggal di kalender
                </p>
                <p style={{ fontSize: "11px", color: "#444" }}>
                  Detail slot akan muncul di sini
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            borderTop: "1px solid rgba(201,168,76,0.2)",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              color: "#7A6030",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Bhaypark Mini Soccer · Kep. Babel
          </div>
          <div style={{ fontSize: "11px", color: "#333", marginTop: "3px" }}>
            © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
          </div>
        </div>
      </div>

      {/* CONFIRM POPUP */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              background: "#181818",
              border: "1px solid rgba(201,168,76,0.55)",
              borderRadius: "18px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "340px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              animation: "slideUp 0.25s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                fontSize: "20px",
              }}
            >
              ⚠️
            </div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "#F0CC6E",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "10px",
              }}
            >
              Perhatian
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "#888",
                textAlign: "center",
                lineHeight: 1.6,
                marginBottom: "20px",
              }}
            >
              <strong style={{ color: "#EAEAEA" }}>
                Bersedia mengganti jadwal
              </strong>{" "}
              jika ada kegiatan resmi Polda Kep. Bangka Belitung yang
              menggunakan lapangan ini?
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <button
                onClick={handleCancel}
                style={{
                  padding: "11px",
                  borderRadius: "9px",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: "#888",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.15s",
                }}
              >
                Tidak
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: "11px",
                  borderRadius: "9px",
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: "#1a0f00",
                  background: "linear-gradient(135deg,#C9A84C,#F0CC6E)",
                  border: "none",
                  transition: "all 0.15s",
                }}
              >
                Ya, Bersedia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global loading indicator when fetching month data on navigation */}
      {loadingMonth && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#111",
            border: "1px solid rgba(201,168,76,0.2)",
            padding: "8px 14px",
            borderRadius: "20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 90,
            pointerEvents: "none",
          }}
        >
          <Spinner />
          <span
            style={{
              fontSize: "11px",
              color: "#C9A84C",
              fontFamily: "Mulish, sans-serif",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Memuat data bulan...
          </span>
        </div>
      )}
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "14px",
      }}
    >
      <span
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "#C9A84C",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span
        style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.25)" }}
      />
    </div>
  );
}
