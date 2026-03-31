"use client";

import { useState, useEffect } from "react";

// --- TYPES ---
type BookingSlot = {
  hour: string;
  label: string;
  status: "tersedia" | "terisi";
  bookedBy?: string;
};

type DayData = {
  date: number;
  slots: BookingSlot[];
};

// --- MOCK DATA ---
const HOURS: BookingSlot[] = [
  { hour: "15:00", label: "15:00 - 16:00", status: "tersedia" },
  { hour: "16:00", label: "16:00 - 17:00", status: "tersedia" },
  {
    hour: "19:00",
    label: "19:00 - 20:00",
    status: "terisi",
    bookedBy: "Futsal FC",
  },
  { hour: "20:00", label: "20:00 - 21:00", status: "tersedia" },
  { hour: "21:00", label: "21:00 - 22:00", status: "tersedia" },
];

function generateMonthData(
  year: number,
  month: number,
): Record<number, DayData> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const data: Record<number, DayData> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const slots = HOURS.map(
      (slot) =>
        ({
          ...slot,
          status: Math.random() > 0.45 ? "tersedia" : "terisi",
        }) as BookingSlot,
    );
    data[d] = { date: d, slots };
  }
  return data;
}

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

// --- MAIN PAGE ---
export default function Page() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [monthData] = useState(() =>
    generateMonthData(today.getFullYear(), today.getMonth()),
  );
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDate, setPendingDate] = useState<number | null>(null);

  const [hasConfirmedSession, setHasConfirmedSession] = useState(false);
  useEffect(() => {
    const confirmed = sessionStorage.getItem(SESSION_KEY);
    if (confirmed === "true") setHasConfirmedSession(true);
  }, []);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handleDateClick = (day: number) => {
    if (hasConfirmedSession) {
      setSelectedDate(day);
      // Only scroll on mobile
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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const daySlots = selectedDate
    ? (monthData[selectedDate]?.slots ?? HOURS)
    : [];
  const tersediaCount = daySlots.filter((s) => s.status === "tersedia").length;
  const terisiCount = daySlots.filter((s) => s.status === "terisi").length;

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        body { font-family: 'Mulish', sans-serif; }
        .font-oswald { font-family: 'Oswald', sans-serif; }
      `}</style>

      {/* 
        Mobile: single column, max-w-120 centered (original behaviour)
        Desktop (lg+): full-width, no max-w cap on the outer shell 
      */}
      <div className="bg-[#0A0A0A] min-h-screen text-[#EAEAEA]">
        {/* HEADER — full-width on desktop */}
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
            Kep. Bangka Belitung
          </span>
          <div className="font-oswald text-2xl font-bold text-[#F0CC6E] tracking-wide uppercase leading-tight">
            Bhaypark Mini Soccer
          </div>
        </div>

        {/* 
          CONTENT WRAPPER
          · Mobile: single column, max-w-120 centered (original)
          · Desktop: 3-column grid — Rules | Calendar | Detail 
        */}
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
                  const data = monthData[day];
                  const hasAvail = data
                    ? data.slots.some((s) => s.status === "tersedia")
                    : true;
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
                        hasAvail
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
                          hasAvail ? "bg-[#2ECC71]" : "bg-[#E57373]",
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
          {/* 
            Mobile: only rendered when a date is selected (original)
            Desktop: always shown as a sticky panel; shows placeholder when nothing selected 
          */}
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
                  {daySlots.map((slot) => (
                    <div
                      key={slot.hour}
                      className={[
                        "flex items-center justify-between px-3.5 py-3 rounded-lg border transition-all",
                        slot.status === "tersedia"
                          ? "bg-[rgba(46,204,113,0.12)] border-[rgba(46,204,113,0.15)]"
                          : "bg-[rgba(204,34,34,0.12)] border-[rgba(204,34,34,0.15)]",
                      ].join(" ")}
                    >
                      <span className="font-oswald text-[15px] font-medium text-[#EAEAEA]">
                        {slot.label}
                      </span>
                      <div className="text-right">
                        <div
                          className={[
                            "text-[11px] font-bold tracking-[0.5px] uppercase",
                            slot.status === "tersedia"
                              ? "text-[#2ECC71]"
                              : "text-[#E57373]",
                          ].join(" ")}
                        >
                          {slot.status === "tersedia" ? "Tersedia" : "Terisi"}
                        </div>
                        {slot.bookedBy && (
                          <div className="text-[10px] text-[#888] mt-0.5">
                            {slot.bookedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Desktop placeholder when no date selected */
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
            © {new Date().getFullYear()} Kepolisian Daerah Kepulauan Bangka
            Belitung
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
