"use client";

import Link from "next/dist/client/link";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";

// --- TYPES ---
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

// Ringkasan per tanggal untuk warna dot di kalender
type DaySummary = {
  hasAvailable: boolean;
  hasBooked: boolean;
};

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

// --- MAIN PAGE ---
export default function Page() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Default selected = hari ini
  const [selectedDate, setSelectedDate] = useState<number | null>(
    today.getDate(),
  );

  // Data slot untuk tanggal yang dipilih
  const [daySlots, setDaySlots] = useState<Timetable[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Summary per tanggal dalam bulan aktif (untuk dot kalender)
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

  // Fetch summary seluruh bulan aktif untuk dot kalender
  const fetchMonthSummary = useCallback(async () => {
    setLoadingMonth(true);
    try {
      // Ambil semua slot di bulan ini: gunakan range tahun-bulan
      const yearStr = String(currentYear);
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      // Fetch semua data lalu filter client-side berdasarkan bulan
      const res = await fetch(`/api/timetable?month=${yearStr}-${monthStr}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const summary: Record<number, DaySummary> = {};
        (json.data as Timetable[]).forEach((entry) => {
          const dateOnly = entry.date.slice(0, 10);
          const [y, m, d] = dateOnly.split("-").map(Number);
          if (y === currentYear && m === currentMonth + 1) {
            if (!summary[d])
              summary[d] = { hasAvailable: false, hasBooked: false };
            if (entry.is_booking) summary[d].hasBooked = true;
            else summary[d].hasAvailable = true;
          }
        });
        setMonthSummary(summary);
      } else {
        // Fallback: jika API tidak support ?month=, fetch all dan filter
        const resAll = await fetch(`/api/timetable`);
        const jsonAll = await resAll.json();
        if (jsonAll.success && Array.isArray(jsonAll.data)) {
          const summary: Record<number, DaySummary> = {};
          (jsonAll.data as Timetable[]).forEach((entry) => {
            const dateOnly = entry.date.slice(0, 10);
            const [y, m, d] = dateOnly.split("-").map(Number);
            if (y === currentYear && m === currentMonth + 1) {
              if (!summary[d])
                summary[d] = { hasAvailable: false, hasBooked: false };
              if (entry.is_booking) summary[d].hasBooked = true;
              else summary[d].hasAvailable = true;
            }
          });
          setMonthSummary(summary);
        }
      }
    } catch {
      setMonthSummary({});
    } finally {
      setLoadingMonth(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthSummary();
  }, [fetchMonthSummary]);

  // Fetch slot detail untuk tanggal yang dipilih
  const fetchDaySlots = useCallback(
    async (day: number, year: number, month: number) => {
      setLoadingSlots(true);
      setDaySlots([]);
      try {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const res = await fetch(`/api/timetable?date=${dateStr}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Sort by time_from
          const sorted = [...(json.data as Timetable[])].sort((a, b) =>
            a.time_from.localeCompare(b.time_from),
          );
          setDaySlots(sorted);
        }
      } catch {
        setDaySlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [],
  );

  // Fetch otomatis saat selectedDate / bulan berubah
  useEffect(() => {
    if (selectedDate !== null) {
      fetchDaySlots(selectedDate, currentYear, currentMonth);
    }
  }, [selectedDate, currentYear, currentMonth, fetchDaySlots]);

  // Juga fetch hari ini saat mount
  useEffect(() => {
    fetchDaySlots(today.getDate(), today.getFullYear(), today.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleDateClick = (day: number) => {
    if (hasConfirmedSession) {
      setSelectedDate(day);
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          document
            .getElementById("detail-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
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
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document
          .getElementById("detail-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
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

  const tersediaCount = daySlots.filter((s) => !s.is_booking).length;
  const terisiCount = daySlots.filter((s) => s.is_booking).length;

  // Helper: apakah dot kalender "tersedia" (ada slot open) atau "penuh" (semua booked / tidak ada data)
  const getDayStatus = (day: number): "tersedia" | "penuh" | "unknown" => {
    const s = monthSummary[day];
    if (!s) return "unknown";
    if (s.hasAvailable) return "tersedia";
    return "penuh";
  };

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        body { font-family: 'Mulish', sans-serif; }
        .font-oswald { font-family: 'Oswald', sans-serif; }
      `}</style>

      <div className="bg-[#0A0A0A] min-h-screen text-[#EAEAEA]">
        {/* HEADER */}
        <div
          className="relative overflow-hidden text-center px-5 pt-7 pb-5 border-b border-[rgba(201,168,76,0.25)]"
          style={{
            background: "linear-gradient(180deg, #1a0f00 0%, #0A0A0A 100%)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)",
            }}
          />
          <span
            className="inline-block text-[#1a0f00] font-oswald text-[10px] font-bold tracking-[2px] uppercase px-3.5 py-1 rounded-sm mb-2.5"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #F0CC6E, #C9A84C)",
            }}
          >
            Kepolisian Negara Republik Indonesia Daerah Kepulauan Bangka
            Belitung
          </span>
          <div className="font-oswald text-2xl font-bold text-[#F0CC6E] tracking-wide uppercase leading-tight">
            Bhaypark Mini Soccer
          </div>
          <Link href="/admin">Ke Halaman Admin</Link>
        </div>

        {/* CONTENT WRAPPER */}
        <div
          className="
          max-w-120 mx-auto pb-20
          lg:max-w-none lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)] lg:items-start lg:gap-0
          lg:px-8 lg:pb-16 lg:pt-2
        "
        >
          {/* ── COL 1: RULES ── */}
          <div className="px-4 py-5 lg:py-6 lg:px-4 lg:border-r lg:border-[rgba(201,168,76,0.15)]">
            <SectionTitle>Tata Tertib Lapangan</SectionTitle>
            <div className="rounded-xl overflow-hidden border border-[rgba(201,168,76,0.25)] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
              <img
                src="/MainRules.jpeg"
                alt="Tata Tertib Bhaypark Mini Soccer"
                className="w-full block"
              />
            </div>
          </div>

          {/* Gold divider (mobile only) */}
          <div
            className="mx-5 h-px lg:hidden"
            style={{
              background:
                "linear-gradient(90deg, transparent, #7A6030, transparent)",
            }}
          />

          {/* ── COL 2: CALENDAR ── */}
          <div className="px-4 py-5 lg:py-6 lg:px-6 lg:border-r lg:border-[rgba(201,168,76,0.15)]">
            <SectionTitle>Kalender Booking</SectionTitle>
            <div className="bg-[#111111] border border-[rgba(201,168,76,0.25)] rounded-xl overflow-hidden">
              {/* Nav Header */}
              <div
                className="flex items-center justify-between px-4.5 py-3.5 border-b border-[rgba(201,168,76,0.25)]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(201,168,76,0.05), transparent)",
                }}
              >
                <button
                  onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-[#C9A84C] text-lg cursor-pointer transition-colors bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] hover:bg-[rgba(201,168,76,0.2)]"
                >
                  ‹
                </button>
                <span className="font-oswald text-base font-semibold text-[#F0CC6E] tracking-[0.5px]">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-[#C9A84C] text-lg cursor-pointer transition-colors bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] hover:bg-[rgba(201,168,76,0.2)]"
                >
                  ›
                </button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 px-3 pt-2.5 pb-1">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-bold tracking-[1px] text-[#888] uppercase"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 px-3 pb-3.5 pt-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = getDayStatus(day);
                  const hasAvail =
                    status === "tersedia" ||
                    (status === "unknown" && !loadingMonth);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSelected = selectedDate === day;

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={[
                        "aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all relative border",
                        "hover:scale-105 hover:z-10",
                        status === "unknown"
                          ? "bg-[rgba(100,100,100,0.08)] border-[rgba(100,100,100,0.15)] hover:bg-[rgba(100,100,100,0.15)]"
                          : hasAvail
                            ? "bg-[rgba(46,204,113,0.12)] border-[rgba(46,204,113,0.2)] hover:bg-[rgba(46,204,113,0.2)] hover:border-[rgba(46,204,113,0.5)]"
                            : "bg-[rgba(204,34,34,0.12)] border-[rgba(204,34,34,0.2)] hover:bg-[rgba(204,34,34,0.2)] hover:border-[rgba(204,34,34,0.4)]",
                        isToday ? "shadow-[0_0_0_2px_#C9A84C]" : "",
                        isSelected
                          ? "bg-[rgba(201,168,76,0.15)]! border-[#C9A84C]! shadow-[0_0_0_2px_#F0CC6E]"
                          : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "font-oswald text-sm font-medium leading-none",
                          isSelected
                            ? "text-[#F0CC6E]"
                            : status === "unknown"
                              ? "text-[#666]"
                              : hasAvail
                                ? "text-[#2ECC71]"
                                : "text-[#E57373]",
                        ].join(" ")}
                      >
                        {day}
                      </span>
                      <span
                        className={[
                          "w-1 h-1 rounded-full mt-0.5",
                          status === "unknown"
                            ? "bg-[#444]"
                            : hasAvail
                              ? "bg-[#2ECC71]"
                              : "bg-[#E57373]",
                        ].join(" ")}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 px-3 pb-3.5 justify-center">
                <LegendItem color="#2ECC71" label="Tersedia" />
                <LegendItem color="#E57373" label="Penuh" />
                <LegendItem color="#C9A84C" label="Hari Ini" outlined />
              </div>
            </div>
          </div>

          {/* ── COL 3: DETAIL ── */}
          <div
            id="detail-section"
            className={[
              "px-4 py-5 lg:py-6 lg:px-6 lg:block lg:sticky lg:top-4",
              !selectedDate ? "hidden lg:block" : "",
            ].join(" ")}
          >
            <SectionTitle>Detail Jadwal</SectionTitle>

            {selectedDate ? (
              <div className="bg-[#111111] border border-[rgba(201,168,76,0.25)] rounded-xl overflow-hidden">
                {/* Detail header */}
                <div
                  className="flex items-center justify-between px-4.5 py-3.5 border-b border-[rgba(201,168,76,0.25)]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(201,168,76,0.08), transparent)",
                  }}
                >
                  <span className="font-oswald text-[15px] font-semibold text-[#F0CC6E]">
                    {selectedDate} {MONTH_NAMES[currentMonth]} {currentYear}
                  </span>
                  <div className="flex gap-2.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(46,204,113,0.12)] text-[#2ECC71] border border-[rgba(46,204,113,0.2)]">
                      {tersediaCount} slot
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(204,34,34,0.12)] text-[#E57373] border border-[rgba(204,34,34,0.2)]">
                      {terisiCount} terisi
                    </span>
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-2">
                  {loadingSlots ? (
                    <div className="py-8 text-center text-[#555] text-sm">
                      Memuat jadwal...
                    </div>
                  ) : daySlots.length === 0 ? (
                    <div className="py-8 text-center text-[#555] text-sm">
                      <div className="text-2xl mb-2 opacity-40">📭</div>
                      Tidak ada slot pada tanggal ini
                    </div>
                  ) : (
                    daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={[
                          "flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all",
                          !slot.is_booking
                            ? "bg-[rgba(46,204,113,0.12)] border-[rgba(46,204,113,0.15)]"
                            : "bg-[rgba(204,34,34,0.12)] border-[rgba(204,34,34,0.15)]",
                        ].join(" ")}
                      >
                        <span className="font-oswald text-[15px] font-medium text-[#EAEAEA]">
                          {formatTime(slot.time_from)} -{" "}
                          {formatTime(slot.time_to)}
                        </span>
                        <div className="text-right">
                          <div
                            className={[
                              "text-[11px] font-bold tracking-[0.5px] uppercase",
                              !slot.is_booking
                                ? "text-[#2ECC71]"
                                : "text-[#E57373]",
                            ].join(" ")}
                          >
                            {slot.is_booking ? "Terisi" : "Tersedia"}
                          </div>
                          {slot.booking_by && (
                            <div className="text-[10px] text-[#888] mt-0.5">
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
              /* Desktop placeholder */
              <div className="hidden lg:flex flex-col items-center justify-center bg-[#111111] border border-[rgba(201,168,76,0.15)] border-dashed rounded-xl py-16 px-6 text-center gap-3">
                <div className="text-3xl opacity-30">📅</div>
                <p className="font-oswald text-sm text-[#555] tracking-[1px] uppercase">
                  Pilih tanggal di kalender
                </p>
                <p className="text-[11px] text-[#444]">
                  Detail slot akan muncul di sini
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center px-5 py-6 border-t border-[rgba(201,168,76,0.25)] mt-2.5">
          <div className="font-oswald text-[13px] text-[#7A6030] tracking-[1px] uppercase">
            Bhaypark Mini Soccer · Kep. Babel
          </div>
          <div className="text-[11px] text-[#444] mt-1">
            © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
          </div>
        </div>
      </div>

      {/* CONFIRM POPUP */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-100 flex items-center justify-center p-5 animate-[fadeIn_0.2s_ease]">
          <div className="bg-[#181818] border border-[rgba(201,168,76,0.55)] rounded-2xl p-7 w-full max-w-85 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,168,76,0.1)] animate-[slideUp_0.25s_ease]">
            <div className="w-12 h-12 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.55)] flex items-center justify-center mx-auto mb-4 text-[22px]">
              ⚠️
            </div>
            <div className="font-oswald text-base font-semibold text-[#F0CC6E] text-center uppercase tracking-[0.5px] mb-2.5">
              Perhatian
            </div>
            <p className="text-[13px] text-[#888] text-center leading-relaxed mb-5">
              <strong className="text-[#EAEAEA]">
                Bersedia mengganti jadwal
              </strong>{" "}
              jika ada kegiatan resmi Polda Kep. Bangka Belitung yang
              menggunakan lapangan ini?
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleCancel}
                className="py-3 rounded-lg font-oswald text-sm font-semibold tracking-[1px] uppercase cursor-pointer transition-all text-[#888] bg-white/6 border border-white/10 hover:bg-white/10"
              >
                Tidak
              </button>
              <button
                onClick={handleConfirm}
                className="py-3 rounded-lg font-oswald text-sm font-semibold tracking-[1px] uppercase cursor-pointer transition-all text-[#1a0f00] hover:brightness-110 hover:-translate-y-px"
                style={{
                  background: "linear-gradient(135deg, #C9A84C, #F0CC6E)",
                }}
              >
                Ya, Bersedia
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}

// --- HELPER COMPONENTS ---
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3.5">
      <span className="font-oswald text-sm font-semibold tracking-[2px] uppercase text-[#C9A84C]">
        {children}
      </span>
      <span className="flex-1 h-px bg-[rgba(201,168,76,0.25)]" />
    </div>
  );
}

function LegendItem({
  color,
  label,
  outlined,
}: {
  color: string;
  label: string;
  outlined?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{
          background: color,
          ...(outlined
            ? { outline: `2px solid ${color}`, outlineOffset: "1px" }
            : {}),
        }}
      />
      {label}
    </div>
  );
}
