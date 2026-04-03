"use client";

import { useState, useEffect, useCallback } from "react";

type Timetable = {
  id: number;
  date: string;
  time_from: string;
  time_to: string;
  is_booking: boolean;
  booking_by: string;
  phone_number: string;
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
const WA_NUMBER = "6282345595050";

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

export default function Page() {
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const [daySlots, setDaySlots] = useState<Timetable[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [monthSummary, setMonthSummary] = useState<Record<number, DaySummary>>(
    {},
  );
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDate, setPendingDate] = useState<number | null>(null);
  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);

  const [bookingSlot, setBookingSlot] = useState<Timetable | null>(null);
  const [bookingBy, setBookingBy] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

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
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedDate !== null)
      fetchDaySlots(selectedDate, currentYear, currentMonth);
  }, [selectedDate, currentYear, currentMonth, fetchDaySlots]);

  const getDayStatus = (day: number): "tersedia" | "penuh" | "unknown" => {
    const s = monthSummary[day];
    if (!s) return "unknown";
    return s.hasAvailable ? "tersedia" : "penuh";
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const tersediaCount = daySlots.filter((s) => !s.is_booking).length;
  const terisiCount = daySlots.filter((s) => s.is_booking).length;

  const resetForm = () => {
    setBookingSlot(null);
    setBookingBy("");
    setPhoneNumber("");
    setBookingError("");
    setBookingSuccess(false);
  };

  const handleDateClick = (day: number) => {
    resetForm();
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
    resetForm();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    setSelectedDate(null);
    resetForm();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const openBookingForm = (slot: Timetable) => {
    setBookingSlot(slot);
    setBookingBy("");
    setPhoneNumber("");
    setBookingError("");
    setBookingSuccess(false);
    setTimeout(
      () =>
        document
          .getElementById(`booking-form-${slot.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      100,
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) return;
    if (!bookingBy.trim()) {
      setBookingError("Nama wajib diisi");
      return;
    }
    if (!phoneNumber.trim()) {
      setBookingError("Nomor HP wajib diisi untuk konfirmasi pemesanan");
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await fetch(`/api/timetable/${bookingSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_booking: true,
          booking_by: bookingBy.trim(),
          phone_number: phoneNumber.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBookingSuccess(true);
        if (selectedDate !== null)
          fetchDaySlots(selectedDate, currentYear, currentMonth);
        fetchMonthSummary();
      } else {
        setBookingError(json.error || "Gagal melakukan booking. Coba lagi.");
      }
    } catch {
      setBookingError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0}
        body{font-family:'Mulish',sans-serif}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:0.85}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}

        .bk-input{
          width:100%;
          background:rgba(201,168,76,0.05);
          border:1px solid rgba(201,168,76,0.35);
          color:#EAEAEA;
          padding:10px 13px;
          border-radius:9px;
          font-size:13px;
          font-family:'Mulish',sans-serif;
          outline:none;
          color-scheme:dark;
          transition:border-color 0.2s,background 0.2s,box-shadow 0.2s;
        }
        .bk-input:focus{
          border-color:#C9A84C;
          background:rgba(201,168,76,0.09);
          box-shadow:0 0 0 3px rgba(201,168,76,0.12);
        }
        .bk-input::placeholder{color:#3e3628}

        .btn-book{
          background:linear-gradient(135deg,#C9A84C,#F0CC6E);
          color:#1a0f00;border-radius:7px;
          font-family:'Oswald',sans-serif;font-weight:600;font-size:11px;
          letter-spacing:1px;text-transform:uppercase;
          border:none;cursor:pointer;
          transition:filter 0.2s,transform 0.15s;
          padding:5px 12px;white-space:nowrap;
        }
        .btn-book:hover{filter:brightness(1.1);transform:translateY(-1px)}

        .wa-btn{
          display:inline-flex;align-items:center;gap:9px;
          background:rgba(37,211,102,0.1);
          border:1px solid rgba(37,211,102,0.28);
          color:#25D366;
          padding:10px 20px;border-radius:10px;
          font-family:'Mulish',sans-serif;font-size:13px;font-weight:600;
          text-decoration:none;
          transition:background 0.2s,border-color 0.2s,transform 0.15s;
          cursor:pointer;
        }
        .wa-btn:hover{background:rgba(37,211,102,0.18);border-color:rgba(37,211,102,0.5);transform:translateY(-1px)}
      `}</style>

      <div
        style={{ background: "#0A0A0A", minHeight: "100vh", color: "#EAEAEA" }}
      >
        {/* ── HEADER ── */}
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
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: "3px",
              marginBottom: "10px",
            }}
          >
            Kepolisian Negara Republik Indonesia <br />
            Daerah Kepulauan Bangka Belitung <br />
            Pelayanan Markas
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
        </div>

        {/* ── CONTENT GRID ── */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            paddingBottom: "80px",
          }}
          className="content-grid"
        >
          <style>{`
            .content-grid{display:grid;grid-template-columns:1fr}
            @media(min-width:1024px){
              .content-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.6fr) minmax(0,1.4fr);align-items:start;padding:8px 32px 64px}
            }
            .col-rules,.col-calendar,.col-detail{padding:20px 16px}
            @media(min-width:1024px){
              .col-rules{padding:24px 16px;border-right:1px solid rgba(201,168,76,0.15)}
              .col-calendar{padding:24px 24px;border-right:1px solid rgba(201,168,76,0.15)}
              .col-detail{padding:24px 24px;position:sticky;top:16px}
            }
            .mobile-divider{display:block}
            @media(min-width:1024px){.mobile-divider{display:none}}
            @media(min-width:1024px){.desktop-placeholder{display:flex!important;flex-direction:column;align-items:center;justify-content:center;background:#111;border:1px dashed rgba(201,168,76,0.15);border-radius:14px;padding:60px 20px;text-align:center;gap:10px}}
          `}</style>

          {/* COL 1: RULES */}
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

          <div
            className="mobile-divider"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg,transparent,#7A6030,transparent)",
              margin: "0 20px",
            }}
          />

          {/* COL 2: CALENDAR */}
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

          {/* COL 3: DETAIL */}
          <div id="detail-section" className="col-detail">
            <SectionTitle>Detail Jadwal</SectionTitle>

            {/* Not yet confirmed & no date selected → locked placeholder */}
            {!selectedDate && !hasConfirmedSession && (
              <div
                style={{
                  background: "#111",
                  border: "1px dashed rgba(201,168,76,0.18)",
                  borderRadius: "14px",
                  padding: "40px 20px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "26px",
                    opacity: 0.2,
                    marginBottom: "10px",
                  }}
                >
                  🔒
                </div>
                <p
                  style={{
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "10px",
                    color: "#555",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                  }}
                >
                  Pilih tanggal untuk melihat slot
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#3a3a3a",
                    lineHeight: 1.6,
                  }}
                >
                  Klik tanggal di kalender untuk melanjutkan
                </p>
              </div>
            )}

            {/* Confirmed but no date yet (desktop) */}
            {!selectedDate && hasConfirmedSession && (
              <div style={{ display: "none" }} className="desktop-placeholder">
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

            {/* Date selected → show slots */}
            {selectedDate && (
              <div
                style={{
                  background: "#111111",
                  border: "1px solid rgba(201,168,76,0.25)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
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
                      <div key={slot.id}>
                        {/* Slot row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "11px 13px",
                            borderRadius:
                              bookingSlot?.id === slot.id
                                ? "10px 10px 0 0"
                                : "10px",
                            border: "1px solid",
                            marginBottom:
                              bookingSlot?.id === slot.id ? "0" : "8px",
                            background: !slot.is_booking
                              ? "rgba(46,204,113,0.08)"
                              : "rgba(204,34,34,0.08)",
                            borderColor: !slot.is_booking
                              ? bookingSlot?.id === slot.id
                                ? "rgba(201,168,76,0.45)"
                                : "rgba(46,204,113,0.15)"
                              : "rgba(204,34,34,0.15)",
                            borderBottom:
                              bookingSlot?.id === slot.id ? "none" : undefined,
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  letterSpacing: "0.5px",
                                  textTransform: "uppercase",
                                  color: !slot.is_booking
                                    ? "#2ECC71"
                                    : "#E57373",
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
                            {!slot.is_booking &&
                              (bookingSlot?.id === slot.id ? (
                                <button
                                  onClick={resetForm}
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: "7px",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#777",
                                    fontSize: "10px",
                                    cursor: "pointer",
                                    fontFamily: "Mulish, sans-serif",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Batal
                                </button>
                              ) : (
                                <button
                                  className="btn-book"
                                  onClick={() => openBookingForm(slot)}
                                >
                                  Booking
                                </button>
                              ))}
                          </div>
                        </div>

                        {/* Inline booking form */}
                        {bookingSlot?.id === slot.id && !bookingSuccess && (
                          <div
                            id={`booking-form-${slot.id}`}
                            style={{
                              background: "#0e0e0e",
                              border: "1px solid rgba(201,168,76,0.3)",
                              borderTop: "1px dashed rgba(201,168,76,0.18)",
                              borderRadius: "0 0 12px 12px",
                              padding: "16px",
                              marginBottom: "8px",
                            }}
                          >
                            {/* Form header */}
                            <div
                              style={{
                                marginBottom: "14px",
                                paddingBottom: "11px",
                                borderBottom: "1px solid rgba(201,168,76,0.1)",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "Oswald, sans-serif",
                                  fontSize: "11px",
                                  color: "#C9A84C",
                                  fontWeight: 600,
                                  letterSpacing: "1.5px",
                                  textTransform: "uppercase",
                                  marginBottom: "3px",
                                }}
                              >
                                Form Booking
                              </div>
                              <div style={{ fontSize: "11px", color: "#555" }}>
                                {formatTime(slot.time_from)} –{" "}
                                {formatTime(slot.time_to)} &nbsp;·&nbsp;{" "}
                                {selectedDate} {MONTH_NAMES[currentMonth]}{" "}
                                {currentYear}
                              </div>
                            </div>

                            <form
                              onSubmit={handleBookingSubmit}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                              }}
                            >
                              <label
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "5px",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#C9A84C",
                                    fontWeight: 700,
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Nama
                                </span>
                                <input
                                  type="text"
                                  required
                                  value={bookingBy}
                                  onChange={(e) => setBookingBy(e.target.value)}
                                  placeholder="Nama pemesan"
                                  className="bk-input"
                                />
                              </label>

                              <label
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "5px",
                                }}
                              >
                                {/* ── Helper notice above the phone label ── */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "7px",
                                    background: "rgba(201,168,76,0.07)",
                                    border: "1px solid rgba(201,168,76,0.2)",
                                    borderRadius: "8px",
                                    padding: "9px 11px",
                                    marginBottom: "2px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "13px",
                                      lineHeight: 1,
                                      flexShrink: 0,
                                      marginTop: "1px",
                                    }}
                                  >
                                    ℹ️
                                  </span>
                                  <p
                                    style={{
                                      fontSize: "11px",
                                      color: "#B8924A",
                                      lineHeight: 1.55,
                                      margin: 0,
                                    }}
                                  >
                                    Agar mencantumkan nomor HP saat pemesanan
                                    untuk konfirmasi permainan dan informasi
                                    lanjut dari pihak pengelola minisoccer.
                                  </p>
                                </div>

                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#C9A84C",
                                    fontWeight: 700,
                                    letterSpacing: "1px",
                                    textTransform: "uppercase",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  Nomor Telepon
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      color: "#E57373",
                                      fontWeight: 700,
                                      letterSpacing: "0px",
                                      textTransform: "none",
                                    }}
                                  >
                                    *wajib
                                  </span>
                                </span>
                                <input
                                  type="tel"
                                  required
                                  value={phoneNumber}
                                  onChange={(e) =>
                                    setPhoneNumber(e.target.value)
                                  }
                                  placeholder="Contoh: 08123456789"
                                  className="bk-input"
                                />
                              </label>

                              {bookingError && (
                                <div
                                  style={{
                                    background: "rgba(204,34,34,0.09)",
                                    border: "1px solid rgba(204,34,34,0.26)",
                                    color: "#E57373",
                                    fontSize: "12px",
                                    padding: "8px 11px",
                                    borderRadius: "8px",
                                  }}
                                >
                                  {bookingError}
                                </div>
                              )}

                              <button
                                type="submit"
                                disabled={bookingLoading}
                                style={{
                                  padding: "11px",
                                  background: bookingLoading
                                    ? "transparent"
                                    : "linear-gradient(135deg,#C9A84C,#F0CC6E)",
                                  border: bookingLoading
                                    ? "1px solid rgba(201,168,76,0.25)"
                                    : "none",
                                  color: bookingLoading ? "#C9A84C" : "#1a0f00",
                                  borderRadius: "9px",
                                  fontFamily: "Oswald, sans-serif",
                                  fontSize: "13px",
                                  fontWeight: 600,
                                  letterSpacing: "1.5px",
                                  textTransform: "uppercase",
                                  cursor: bookingLoading
                                    ? "not-allowed"
                                    : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "8px",
                                  marginTop: "2px",
                                }}
                              >
                                {bookingLoading ? (
                                  <>
                                    <div
                                      style={{
                                        width: 13,
                                        height: 13,
                                        borderRadius: "50%",
                                        border:
                                          "2px solid rgba(201,168,76,0.2)",
                                        borderTopColor: "#C9A84C",
                                        animation: "spin 0.65s linear infinite",
                                      }}
                                    />{" "}
                                    Memproses...
                                  </>
                                ) : (
                                  "Konfirmasi Booking"
                                )}
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Success state */}
                        {bookingSlot?.id === slot.id && bookingSuccess && (
                          <div
                            style={{
                              background: "rgba(46,204,113,0.05)",
                              border: "1px solid rgba(46,204,113,0.25)",
                              borderTop: "1px dashed rgba(46,204,113,0.12)",
                              borderRadius: "0 0 12px 12px",
                              padding: "18px 16px",
                              marginBottom: "8px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{ fontSize: "22px", marginBottom: "7px" }}
                            >
                              ✅
                            </div>
                            <div
                              style={{
                                fontFamily: "Oswald, sans-serif",
                                fontSize: "12px",
                                color: "#2ECC71",
                                fontWeight: 600,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                marginBottom: "5px",
                              }}
                            >
                              Booking Berhasil!
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#555",
                                lineHeight: 1.6,
                              }}
                            >
                              Slot {formatTime(slot.time_from)}–
                              {formatTime(slot.time_to)} telah dipesan atas nama{" "}
                              <span style={{ color: "#EAEAEA" }}>
                                {bookingBy}
                              </span>
                              .
                            </div>
                            <button
                              onClick={resetForm}
                              style={{
                                marginTop: "10px",
                                padding: "6px 16px",
                                borderRadius: "7px",
                                background: "rgba(46,204,113,0.12)",
                                border: "1px solid rgba(46,204,113,0.25)",
                                color: "#2ECC71",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "Mulish, sans-serif",
                              }}
                            >
                              Tutup
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div
          style={{
            textAlign: "center",
            padding: "28px 20px 36px",
            borderTop: "1px solid rgba(201,168,76,0.15)",
          }}
        >
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "12px",
              color: "#7A6030",
              letterSpacing: "1px",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Bhaypark Mini Soccer · Kep. Babel
          </div>

          {/* WhatsApp */}
          <div style={{ marginBottom: "16px" }}>
            <p
              style={{ fontSize: "12px", color: "#444", marginBottom: "10px" }}
            >
              Butuh informasi? Hubungi kami
            </p>
            <a
              href={`https://wa.me/${WA_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-btn"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
              >
                <path
                  d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.47 1.64 6.35L3 29l6.84-1.6A13 13 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.34 18.34c-.28.78-1.63 1.5-2.24 1.56-.57.05-1.1.26-3.72-.78-3.12-1.23-5.1-4.43-5.26-4.64-.16-.2-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.3.6-.38.81-.38h.58c.18 0 .44-.07.69.53l.89 2.32c.07.17.03.37-.06.53l-.36.47c-.13.17-.26.35-.11.67.15.33.67 1.34 1.45 2.17.99 1.06 1.83 1.4 2.16 1.55.33.15.52.12.71-.08l.49-.57c.19-.23.38-.15.63-.05l2.26 1.06c.26.12.43.18.49.28.07.1.07.6-.21 1.38z"
                  fill="#25D366"
                />
              </svg>
              +62 823-4559-5050
            </a>
          </div>

          <div style={{ fontSize: "11px", color: "#282828" }}>
            © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
          </div>
        </div>
      </div>

      {/* ── CONFIRM POPUP ── */}
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
                }}
              >
                Ya, Bersedia
              </button>
            </div>
          </div>
        </div>
      )}

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
