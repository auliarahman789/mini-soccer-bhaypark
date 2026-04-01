"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

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
type SlotTime = { time_from: string; time_to: string };
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
const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");

function formatTime(t: string) {
  return t?.slice(0, 5) ?? "";
}
function formatDateLabel(year: number, month: number, day: number) {
  return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
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

function Skeleton({
  w = "100%",
  h = "16px",
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

function Spinner({
  size = 14,
  color = "#C9A84C",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid rgba(201,168,76,0.18)`,
        borderTopColor: color,
        animation: "spin 0.65s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export default function TimetablePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [pageReady, setPageReady] = useState(false);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(
    today.getDate(),
  );
  const [monthSummary, setMonthSummary] = useState<Record<number, DaySummary>>(
    {},
  );
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [entries, setEntries] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(false);

  const [formDate, setFormDate] = useState(todayStr);
  const [slots, setSlots] = useState<SlotTime[]>([
    { time_from: "08:00", time_to: "09:00" },
  ]);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingBy, setBookingBy] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // ── MOVE SCHEDULE STATE ──────────────────────────────────────────────────
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState("");
  const [moveTargetSlots, setMoveTargetSlots] = useState<Timetable[]>([]);
  const [moveTargetLoading, setMoveTargetLoading] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<number | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpLoading, setCpLoading] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.username) setUsername(j.username);
      })
      .catch(() => {})
      .finally(() => setPageReady(true));
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

  const fetchEntries = useCallback(async () => {
    if (selectedDay === null) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timetable?date=${toDateStr(currentYear, currentMonth, selectedDay)}`,
      );
      const json = await res.json();
      if (json.success)
        setEntries(
          [...(json.data as Timetable[])].sort((a, b) =>
            a.time_from.localeCompare(b.time_from),
          ),
        );
    } catch {
      showToast("Gagal memuat data", "err");
    } finally {
      setLoading(false);
    }
  }, [selectedDay, currentYear, currentMonth]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Fetch slots for move target date ──────────────────────────────────────
  const fetchMoveTargetSlots = useCallback(async (date: string) => {
    if (!date) {
      setMoveTargetSlots([]);
      return;
    }
    setMoveTargetLoading(true);
    try {
      const res = await fetch(`/api/timetable?date=${date}`);
      const json = await res.json();
      if (json.success) {
        const available = (json.data as Timetable[])
          .filter((s) => !s.is_booking)
          .sort((a, b) => a.time_from.localeCompare(b.time_from));
        setMoveTargetSlots(available);
      } else setMoveTargetSlots([]);
    } catch {
      setMoveTargetSlots([]);
    } finally {
      setMoveTargetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showMovePanel && moveTargetDate) fetchMoveTargetSlots(moveTargetDate);
  }, [showMovePanel, moveTargetDate, fetchMoveTargetSlots]);

  // ── Execute move ──────────────────────────────────────────────────────────
  const handleMoveSchedule = async () => {
    if (!editId || !moveTargetId) return;
    setMoveLoading(true);
    try {
      // Find the source entry to get booking info
      const srcEntry = [...entries].find((e) => e.id === editId);
      if (!srcEntry) {
        showToast("Data sumber tidak ditemukan", "err");
        return;
      }

      // 1. Update target slot: fill with booking data from source
      const resTarget = await fetch(`/api/timetable/${moveTargetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_booking: true,
          booking_by: srcEntry.booking_by ?? "",
          phone_number: srcEntry.phone_number ?? "",
        }),
      });
      const jsonTarget = await resTarget.json();
      if (!jsonTarget.success) {
        showToast(
          jsonTarget.error || "Gagal memindahkan ke slot tujuan",
          "err",
        );
        return;
      }

      // 2. Clear source slot: reset booking data
      const resSrc = await fetch(`/api/timetable/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_booking: false,
          booking_by: "",
          phone_number: "",
        }),
      });
      const jsonSrc = await resSrc.json();
      if (!jsonSrc.success) {
        showToast(jsonSrc.error || "Gagal mengosongkan slot asal", "err");
        return;
      }

      showToast("Jadwal berhasil dipindahkan ✓");
      setShowForm(false);
      setEditId(null);
      setShowMovePanel(false);
      setMoveTargetDate("");
      setMoveTargetSlots([]);
      setMoveTargetId(null);
      fetchEntries();
      fetchMonthSummary();
    } catch {
      showToast("Terjadi kesalahan", "err");
    } finally {
      setMoveLoading(false);
    }
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getDayStatus = (day: number): "tersedia" | "penuh" | "unknown" => {
    const s = monthSummary[day];
    if (!s) return "unknown";
    return s.hasAvailable ? "tersedia" : "penuh";
  };

  const prevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setFormDate(toDateStr(currentYear, currentMonth, day));
    setTimeout(
      () =>
        document
          .getElementById("slot-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) {
      setCpError("Konfirmasi password tidak cocok");
      return;
    }
    if (cpNew.length < 6) {
      setCpError("Password baru minimal 6 karakter");
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: cpCurrent,
          newPassword: cpNew,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Password berhasil diubah ✓");
        setShowChangePassword(false);
        setCpCurrent("");
        setCpNew("");
        setCpConfirm("");
      } else setCpError(json.error ?? "Gagal mengubah password");
    } catch {
      setCpError("Terjadi kesalahan");
    } finally {
      setCpLoading(false);
    }
  };

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const [h] = last.time_to.split(":").map(Number);
    setSlots([
      ...slots,
      {
        time_from: `${String(h).padStart(2, "0")}:00`,
        time_to: `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${h >= 23 ? "59" : "00"}`,
      },
    ]);
  };
  const removeSlot = (i: number) => {
    if (slots.length > 1) setSlots(slots.filter((_, idx) => idx !== i));
  };
  const updateSlot = (i: number, field: keyof SlotTime, value: string) =>
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const openCreate = () => {
    setFormDate(
      selectedDay
        ? toDateStr(currentYear, currentMonth, selectedDay)
        : todayStr,
    );
    setSlots([{ time_from: "08:00", time_to: "09:00" }]);
    setIsBooking(false);
    setBookingBy("");
    setPhoneNumber("");
    setEditId(null);
    setShowForm(true);
    setShowSettingsMenu(false);
    setShowMovePanel(false);
    setMoveTargetDate("");
    setMoveTargetSlots([]);
    setMoveTargetId(null);
  };
  const openEdit = (entry: Timetable) => {
    setFormDate(entry.date.slice(0, 10));
    setSlots([
      {
        time_from: formatTime(entry.time_from),
        time_to: formatTime(entry.time_to),
      },
    ]);
    setIsBooking(entry.is_booking);
    setBookingBy(entry.booking_by);
    setPhoneNumber(entry.phone_number);
    setEditId(entry.id);
    setShowForm(true);
    setShowMovePanel(false);
    setMoveTargetDate("");
    setMoveTargetSlots([]);
    setMoveTargetId(null);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setShowMovePanel(false);
    setMoveTargetDate("");
    setMoveTargetSlots([]);
    setMoveTargetId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const slot of slots) {
      if (slot.time_from >= slot.time_to) {
        showToast(
          `Jam mulai ${slot.time_from} harus lebih awal dari ${slot.time_to}`,
          "err",
        );
        return;
      }
    }
    try {
      if (editId) {
        const res = await fetch(`/api/timetable/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formDate,
            time_from: slots[0].time_from,
            time_to: slots[0].time_to,
            is_booking: isBooking,
            booking_by: bookingBy,
            phone_number: phoneNumber,
          }),
        });
        const json = await res.json();
        if (json.success) {
          showToast("Berhasil diperbarui ✓");
          closeForm();
          fetchEntries();
          fetchMonthSummary();
        } else showToast(json.error || "Gagal memperbarui", "err");
      } else {
        const results = await Promise.all(
          slots.map((slot) =>
            fetch("/api/timetable", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: formDate,
                time_from: slot.time_from,
                time_to: slot.time_to,
                is_booking: isBooking,
                booking_by: bookingBy,
                phone_number: phoneNumber,
              }),
            }).then((r) => r.json()),
          ),
        );
        const failed = results.filter((r) => !r.success);
        if (failed.length === 0) {
          showToast(
            slots.length > 1
              ? `${slots.length} slot berhasil ditambahkan ✓`
              : "Berhasil ditambahkan ✓",
          );
          closeForm();
          fetchEntries();
          fetchMonthSummary();
        } else
          showToast(`${failed.length} dari ${slots.length} slot gagal`, "err");
      }
    } catch {
      showToast("Terjadi kesalahan", "err");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/timetable/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Berhasil dihapus ✓");
        setDeleteId(null);
        fetchEntries();
        fetchMonthSummary();
      } else showToast(json.error || "Gagal menghapus", "err");
    } catch {
      showToast("Terjadi kesalahan", "err");
    }
  };

  const toggleBooking = async (entry: Timetable) => {
    try {
      const res = await fetch(`/api/timetable/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_booking: !entry.is_booking }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEntries();
        fetchMonthSummary();
        showToast(
          json.data.is_booking ? "Status: Booked ✓" : "Status: Available ✓",
        );
      }
    } catch {
      showToast("Gagal mengubah status", "err");
    }
  };

  const booked = entries.filter((e) => e.is_booking).length;
  const available = entries.filter((e) => !e.is_booking).length;

  // ── PAGE LOADING SKELETON ──────────────────────────────────────────────────
  if (!pageReady) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
          *{box-sizing:border-box;margin:0}
          body{font-family:'Mulish',sans-serif;background:#0A0A0A}
          @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:0.85}}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
        <div style={{ minHeight: "100vh", background: "#0A0A0A" }}>
          <div
            style={{
              borderBottom: "1px solid rgba(201,168,76,0.14)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#0A0A0A",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "rgba(201,168,76,0.08)",
                  animation: "pulse 1.6s infinite",
                }}
              />
              <div>
                <div
                  style={{
                    width: "80px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "rgba(201,168,76,0.1)",
                    marginBottom: "5px",
                    animation: "pulse 1.6s infinite",
                  }}
                />
                <div
                  style={{
                    width: "55px",
                    height: "9px",
                    borderRadius: "4px",
                    background: "rgba(201,168,76,0.06)",
                    animation: "pulse 1.6s infinite",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  width: "34px",
                  height: "32px",
                  borderRadius: "7px",
                  background: "rgba(201,168,76,0.07)",
                  animation: "pulse 1.6s infinite",
                }}
              />
              <div
                style={{
                  width: "110px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(201,168,76,0.12)",
                  animation: "pulse 1.6s infinite",
                }}
              />
            </div>
          </div>
          <div
            style={{
              padding: "18px 14px",
              maxWidth: "960px",
              margin: "0 auto",
            }}
          >
            <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: "68px",
                    borderRadius: "12px",
                    background: "rgba(201,168,76,0.06)",
                    animation: "pulse 1.6s infinite",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.45fr",
                gap: "18px",
              }}
            >
              <div
                style={{
                  height: "340px",
                  borderRadius: "14px",
                  background: "rgba(201,168,76,0.05)",
                  animation: "pulse 1.6s infinite",
                }}
              />
              <div
                style={{
                  height: "280px",
                  borderRadius: "14px",
                  background: "rgba(201,168,76,0.05)",
                  animation: "pulse 1.6s infinite",
                }}
              />
            </div>
          </div>
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#111",
              border: "1px solid rgba(201,168,76,0.22)",
              padding: "9px 14px",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                width: "13px",
                height: "13px",
                borderRadius: "50%",
                border: "2px solid rgba(201,168,76,0.15)",
                borderTopColor: "#C9A84C",
                animation: "spin 0.65s linear infinite",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                color: "#C9A84C",
                fontFamily: "Mulish, sans-serif",
                fontWeight: 600,
              }}
            >
              Memuat panel...
            </span>
          </div>
        </div>
      </>
    );
  }

  // ── FULL RENDER ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        body{font-family:'Mulish',sans-serif;background:#0A0A0A;margin:0;color:#EAEAEA}
        @keyframes pulse{0%,100%{opacity:0.35}50%{opacity:0.85}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideDown{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes expandDown{from{max-height:0;opacity:0}to{max-height:600px;opacity:1}}

        .admin-input{width:100%;background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);color:#EAEAEA;padding:10px 12px;border-radius:8px;font-size:13px;font-family:'Mulish',sans-serif;outline:none;color-scheme:dark;transition:border-color 0.2s}
        .admin-input:focus{border-color:#C9A84C}
        .admin-input::placeholder{color:#444}

        .btn-gold{background:linear-gradient(135deg,#C9A84C,#F0CC6E);color:#1a0f00;border-radius:8px;font-family:'Oswald',sans-serif;font-weight:600;letter-spacing:1px;text-transform:uppercase;border:none;cursor:pointer;transition:filter 0.2s,transform 0.15s;white-space:nowrap}
        .btn-gold:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn-gold:disabled{opacity:0.6;cursor:not-allowed;transform:none}

        .btn-gs{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);color:#C9A84C;border-radius:7px;font-size:10px;font-family:'Mulish',sans-serif;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;padding:5px 9px}
        .btn-gs:hover{background:rgba(201,168,76,0.16);border-color:rgba(201,168,76,0.45)}
        .btn-ds{background:rgba(204,34,34,0.09);border:1px solid rgba(204,34,34,0.2);color:#E57373;border-radius:7px;font-size:10px;font-family:'Mulish',sans-serif;font-weight:600;cursor:pointer;transition:all 0.2s;padding:5px 9px}
        .btn-ds:hover{background:rgba(204,34,34,0.18);border-color:rgba(204,34,34,0.45)}

        .btn-move{background:rgba(99,179,237,0.09);border:1px solid rgba(99,179,237,0.22);color:#63B3ED;border-radius:8px;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all 0.2s;white-space:nowrap;padding:8px 14px;display:flex;align-items:center;gap:6px}
        .btn-move:hover{background:rgba(99,179,237,0.16);border-color:rgba(99,179,237,0.45)}
        .btn-move:disabled{opacity:0.4;cursor:not-allowed}

        .cal-day{aspect-ratio:1;border-radius:7px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.12s;border:1px solid transparent;position:relative}
        .cal-day:hover{transform:scale(1.09);z-index:2}

        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(5px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.18s ease}
        .modal-card{background:#111;border:1px solid rgba(201,168,76,0.28);border-radius:16px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.65);animation:slideUp 0.22s ease}
        .modal-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(201,168,76,0.16);background:linear-gradient(90deg,rgba(201,168,76,0.07),transparent)}

        .settings-menu{position:absolute;top:calc(100% + 7px);right:0;background:#161616;border:1px solid rgba(201,168,76,0.28);border-radius:12px;padding:8px;min-width:190px;box-shadow:0 16px 40px rgba(0,0,0,0.55);z-index:60;animation:slideDown 0.17s ease}
        .smenu-btn{width:100%;padding:8px 10px;background:transparent;border:none;font-size:12px;font-family:'Mulish',sans-serif;font-weight:600;cursor:pointer;text-align:left;border-radius:7px;transition:background 0.15s}

        .move-panel{overflow:hidden;animation:expandDown 0.25s ease forwards}
        .slot-option{padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .slot-option:hover{border-color:rgba(99,179,237,0.35);background:rgba(99,179,237,0.06)}
        .slot-option.selected{border-color:#63B3ED;background:rgba(99,179,237,0.12);box-shadow:0 0 0 1px #63B3ED}

        @media(max-width:639px){.grid-layout{grid-template-columns:1fr !important}}
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0A0A0A" }}>
        {/* ── HEADER ── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            borderBottom: "1px solid rgba(201,168,76,0.16)",
            background: "rgba(10,10,10,0.97)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.28)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                ⚽
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#F0CC6E",
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  Bhaypark
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    color: "#7A6030",
                    letterSpacing: "1.8px",
                    textTransform: "uppercase",
                  }}
                >
                  Admin Panel
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                flexShrink: 0,
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowSettingsMenu((v) => !v)}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "8px",
                    background: "rgba(201,168,76,0.09)",
                    border: "1px solid rgba(201,168,76,0.22)",
                    color: "#C9A84C",
                    fontSize: "16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                  title="Pengaturan"
                >
                  ⚙
                </button>
                {showSettingsMenu && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 55 }}
                      onClick={() => setShowSettingsMenu(false)}
                    />
                    <div className="settings-menu">
                      {username && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            padding: "8px 10px",
                            marginBottom: "5px",
                            background: "rgba(201,168,76,0.07)",
                            border: "1px solid rgba(201,168,76,0.14)",
                            borderRadius: "8px",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "#2ECC71",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#EAEAEA",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {username}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          height: "1px",
                          background: "rgba(255,255,255,0.05)",
                          margin: "3px 0 5px",
                        }}
                      />
                      <button
                        className="smenu-btn"
                        style={{ color: "#C9A84C" }}
                        onClick={() => {
                          setShowChangePassword(true);
                          setShowSettingsMenu(false);
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(201,168,76,0.09)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        🔑 Ganti Password
                      </button>
                      <button
                        className="smenu-btn"
                        style={{ color: "#E57373" }}
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setShowSettingsMenu(false);
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(204,34,34,0.1)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                className="btn-gold"
                onClick={openCreate}
                style={{ padding: "8px 13px", fontSize: "12px" }}
              >
                + Tambah Slot
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "16px 14px 60px",
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {[
              { label: "Total", value: entries.length, color: "#F0CC6E" },
              { label: "Booked", value: booked, color: "#E57373" },
              { label: "Available", value: available, color: "#2ECC71" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  background: "#111",
                  border: "1px solid rgba(201,168,76,0.16)",
                  borderRadius: "12px",
                  padding: "11px 13px",
                }}
              >
                {loading ? (
                  <Skeleton h="24px" mb="4px" r="5px" />
                ) : (
                  <div
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "24px",
                      fontWeight: 700,
                      color: s.color,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "9px",
                    color: "#555",
                    marginTop: "3px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* 2-col grid */}
          <div
            className="grid-layout"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1.45fr)",
              gap: "16px",
              alignItems: "start",
            }}
          >
            {/* ── CALENDAR ── */}
            <div>
              <SectionTitle>Pilih Tanggal</SectionTitle>
              <div
                style={{
                  background: "#111",
                  border: "1px solid rgba(201,168,76,0.2)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 13px",
                    borderBottom: "1px solid rgba(201,168,76,0.15)",
                    background:
                      "linear-gradient(90deg,rgba(201,168,76,0.06),transparent)",
                  }}
                >
                  <button
                    onClick={prevMonth}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.2)",
                      color: "#C9A84C",
                      fontSize: "16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ‹
                  </button>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    {loadingMonth && <Spinner size={11} />}
                    <span
                      style={{
                        fontFamily: "Oswald, sans-serif",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#F0CC6E",
                      }}
                    >
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </span>
                  </div>
                  <button
                    onClick={nextMonth}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: "rgba(201,168,76,0.1)",
                      border: "1px solid rgba(201,168,76,0.2)",
                      color: "#C9A84C",
                      fontSize: "16px",
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
                    padding: "8px 9px 2px",
                  }}
                >
                  {DAY_NAMES.map((d) => (
                    <div
                      key={d}
                      style={{
                        textAlign: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        color: "#555",
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
                    gap: "2px",
                    padding: "2px 9px 9px",
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
                    const isSel = selectedDay === day;
                    const bg = isSel
                      ? "rgba(201,168,76,0.2)"
                      : status === "tersedia"
                        ? "rgba(46,204,113,0.1)"
                        : status === "penuh"
                          ? "rgba(204,34,34,0.1)"
                          : "rgba(100,100,100,0.06)";
                    const bc = isSel
                      ? "#F0CC6E"
                      : status === "tersedia"
                        ? "rgba(46,204,113,0.2)"
                        : status === "penuh"
                          ? "rgba(204,34,34,0.2)"
                          : "rgba(100,100,100,0.1)";
                    const tc = isSel
                      ? "#F0CC6E"
                      : status === "tersedia"
                        ? "#2ECC71"
                        : status === "penuh"
                          ? "#E57373"
                          : "#555";
                    const dc =
                      status === "tersedia"
                        ? "#2ECC71"
                        : status === "penuh"
                          ? "#E57373"
                          : "#222";
                    return (
                      <div
                        key={day}
                        className="cal-day"
                        onClick={() => handleDayClick(day)}
                        style={{
                          background: bg,
                          border: `1px solid ${bc}`,
                          boxShadow: isSel
                            ? "0 0 0 2px #F0CC6E"
                            : isToday
                              ? "0 0 0 2px #C9A84C"
                              : "none",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "Oswald, sans-serif",
                            fontSize: "11px",
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
                              width: "3px",
                              height: "3px",
                              borderRadius: "50%",
                              background: "rgba(201,168,76,0.2)",
                              marginTop: "2px",
                              animation: "pulse 1.6s infinite",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              width: "3px",
                              height: "3px",
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
                    gap: "10px",
                    padding: "0 9px 9px",
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
                        gap: "4px",
                        fontSize: "9px",
                        color: "#666",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
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

            {/* ── SLOT LIST ── */}
            <div id="slot-section">
              <SectionTitle>
                {selectedDay
                  ? `Slot — ${formatDateLabel(currentYear, currentMonth, selectedDay)}`
                  : "Detail Jadwal"}
              </SectionTitle>
              {!selectedDay ? (
                <div
                  style={{
                    background: "#111",
                    border: "1px dashed rgba(201,168,76,0.16)",
                    borderRadius: "14px",
                    padding: "36px 20px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "26px", opacity: 0.22 }}>📅</div>
                  <div
                    style={{
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "10px",
                      color: "#555",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      marginTop: "10px",
                    }}
                  >
                    Pilih tanggal di kalender
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#111",
                    border: "1px solid rgba(201,168,76,0.16)",
                    borderRadius: "14px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 13px",
                      borderBottom: "1px solid rgba(201,168,76,0.1)",
                      background:
                        "linear-gradient(90deg,rgba(201,168,76,0.05),transparent)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      {loading ? (
                        <>
                          <Skeleton w="66px" h="20px" r="20px" />
                          <Skeleton w="56px" h="20px" r="20px" />
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "20px",
                              background: "rgba(46,204,113,0.1)",
                              color: "#2ECC71",
                              border: "1px solid rgba(46,204,113,0.18)",
                            }}
                          >
                            {available} tersedia
                          </span>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "20px",
                              background: "rgba(204,34,34,0.1)",
                              color: "#E57373",
                              border: "1px solid rgba(204,34,34,0.18)",
                            }}
                          >
                            {booked} terisi
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      className="btn-gold"
                      onClick={openCreate}
                      style={{ padding: "5px 11px", fontSize: "11px" }}
                    >
                      + Slot
                    </button>
                  </div>
                  <div style={{ padding: "9px 9px 3px" }}>
                    {loading ? (
                      [1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "11px 12px",
                            borderRadius: "9px",
                            border: "1px solid rgba(255,255,255,0.04)",
                            background: "rgba(255,255,255,0.015)",
                            marginBottom: "7px",
                          }}
                        >
                          <div
                            style={{
                              width: "3px",
                              height: "28px",
                              borderRadius: "2px",
                              background: "rgba(201,168,76,0.12)",
                              flexShrink: 0,
                              animation: "pulse 1.6s infinite",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <Skeleton w="100px" h="13px" mb="5px" />
                            <Skeleton w="45px" h="9px" />
                          </div>
                          <Skeleton w="50px" h="20px" r="20px" />
                          <div style={{ display: "flex", gap: "4px" }}>
                            <Skeleton w="40px" h="26px" r="7px" />
                            <Skeleton w="40px" h="26px" r="7px" />
                          </div>
                        </div>
                      ))
                    ) : entries.length === 0 ? (
                      <div style={{ padding: "28px", textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "20px",
                            opacity: 0.22,
                            marginBottom: "7px",
                          }}
                        >
                          📭
                        </div>
                        <div style={{ color: "#555", fontSize: "12px" }}>
                          Tidak ada slot pada tanggal ini
                        </div>
                        <button
                          className="btn-gs"
                          onClick={openCreate}
                          style={{ marginTop: "11px", padding: "7px 14px" }}
                        >
                          + Tambah Slot Pertama
                        </button>
                      </div>
                    ) : (
                      entries.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 11px",
                            borderRadius: "9px",
                            border: "1px solid",
                            marginBottom: "6px",
                            background: entry.is_booking
                              ? "rgba(204,34,34,0.06)"
                              : "rgba(46,204,113,0.06)",
                            borderColor: entry.is_booking
                              ? "rgba(204,34,34,0.16)"
                              : "rgba(46,204,113,0.13)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "9px",
                              flexShrink: 0,
                            }}
                          >
                            <div
                              style={{
                                width: "3px",
                                height: "28px",
                                borderRadius: "2px",
                                background: entry.is_booking
                                  ? "#E57373"
                                  : "#2ECC71",
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontFamily: "Oswald, sans-serif",
                                  fontSize: "14px",
                                  color: "#F0CC6E",
                                  fontWeight: 600,
                                  lineHeight: 1,
                                }}
                              >
                                {formatTime(entry.time_from)} –{" "}
                                {formatTime(entry.time_to)}
                              </div>
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#555",
                                  marginTop: "2px",
                                }}
                              >
                                ID #{entry.id}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              flex: 1,
                              padding: "0 8px",
                              textAlign: "center",
                            }}
                          >
                            <button
                              onClick={() => toggleBooking(entry)}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "20px",
                                fontSize: "9px",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                border: "1px solid",
                                background: entry.is_booking
                                  ? "rgba(204,34,34,0.1)"
                                  : "rgba(46,204,113,0.1)",
                                color: entry.is_booking ? "#E57373" : "#2ECC71",
                                borderColor: entry.is_booking
                                  ? "rgba(204,34,34,0.28)"
                                  : "rgba(46,204,113,0.28)",
                              }}
                            >
                              {entry.is_booking ? "BOOKED" : "OPEN"}
                            </button>
                            {entry.booking_by && (
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#777",
                                  marginTop: "2px",
                                }}
                              >
                                {entry.booking_by}
                              </div>
                            )}
                            {entry.phone_number && (
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#777",
                                  marginTop: "2px",
                                }}
                              >
                                {entry.phone_number}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <button
                              className="btn-gs"
                              onClick={() => openEdit(entry)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-ds"
                              onClick={() => setDeleteId(entry.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{ height: "5px" }} />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            padding: "12px 16px",
            borderTop: "1px solid rgba(201,168,76,0.1)",
          }}
        >
          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: "10px",
              color: "#7A6030",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Bhaypark Mini Soccer · Admin Panel
          </div>
          <div style={{ fontSize: "10px", color: "#282828", marginTop: "2px" }}>
            © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
          </div>
        </div>
      </div>

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="modal-card" style={{ maxWidth: "440px" }}>
            <div className="modal-hd">
              <div>
                <div
                  style={{
                    fontFamily: "Oswald, sans-serif",
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#F0CC6E",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {editId ? "Edit Slot" : "Tambah Slot"}
                </div>
                <div
                  style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}
                >
                  {editId
                    ? `ID #${editId}`
                    : "Bisa tambah lebih dari satu jam sekaligus"}
                </div>
              </div>
              <button
                onClick={closeForm}
                style={{
                  width: "29px",
                  height: "29px",
                  borderRadius: "7px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#666",
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <label
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "#777",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Tanggal
                </span>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="admin-input"
                />
              </label>

              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 32px",
                    gap: "7px",
                    marginBottom: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#777",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Mulai
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#777",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Selesai
                  </span>
                  <span />
                </div>
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 32px",
                      gap: "7px",
                      marginBottom: "7px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="time"
                      required
                      value={slot.time_from}
                      onChange={(e) =>
                        updateSlot(i, "time_from", e.target.value)
                      }
                      className="admin-input"
                    />
                    <input
                      type="time"
                      required
                      value={slot.time_to}
                      onChange={(e) => updateSlot(i, "time_to", e.target.value)}
                      className="admin-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      disabled={slots.length === 1}
                      style={{
                        width: "32px",
                        height: "38px",
                        borderRadius: "7px",
                        background: "rgba(204,34,34,0.1)",
                        border: "1px solid rgba(204,34,34,0.18)",
                        color: "#E57373",
                        fontSize: "15px",
                        cursor: slots.length === 1 ? "not-allowed" : "pointer",
                        opacity: slots.length === 1 ? 0.3 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!editId && (
                  <button
                    type="button"
                    onClick={addSlot}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px dashed rgba(201,168,76,0.26)",
                      borderRadius: "8px",
                      background: "transparent",
                      color: "#7A6030",
                      fontSize: "12px",
                      cursor: "pointer",
                      fontFamily: "Mulish, sans-serif",
                    }}
                  >
                    + Tambah jam lagi
                  </button>
                )}
              </div>

              {editId && (
                <>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                      cursor: "pointer",
                      background: "rgba(201,168,76,0.05)",
                      border: "1px solid rgba(201,168,76,0.13)",
                      borderRadius: "9px",
                      padding: "10px 12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isBooking}
                      onChange={(e) => setIsBooking(e.target.checked)}
                      style={{
                        width: "15px",
                        height: "15px",
                        cursor: "pointer",
                        accentColor: "#C9A84C",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#EAEAEA",
                          fontWeight: 600,
                        }}
                      >
                        Is Booking
                      </div>
                      <div style={{ fontSize: "10px", color: "#666" }}>
                        Tandai slot ini sudah dipesan
                      </div>
                    </div>
                  </label>
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
                        color: "#777",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Booking By
                    </span>
                    <input
                      type="text"
                      value={bookingBy ?? ""}
                      onChange={(e) => setBookingBy(e.target.value)}
                      placeholder="Di booking oleh"
                      className="admin-input"
                    />
                  </label>
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
                        color: "#777",
                        fontWeight: 600,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      Phone Number
                    </span>
                    <input
                      type="text"
                      value={phoneNumber ?? ""}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Nomor Telepon"
                      className="admin-input"
                    />
                  </label>

                  {/* ── MOVE SCHEDULE SECTION ─────────────────────────────── */}
                  <div
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      paddingTop: "12px",
                    }}
                  >
                    <button
                      type="button"
                      className="btn-move"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => {
                        setShowMovePanel((v) => !v);
                        if (!showMovePanel) {
                          setMoveTargetDate("");
                          setMoveTargetSlots([]);
                          setMoveTargetId(null);
                        }
                      }}
                    >
                      <span style={{ fontSize: "13px" }}>↗</span>
                      {showMovePanel ? "Batal Pindah Jadwal" : "Pindah Jadwal"}
                    </button>

                    {showMovePanel && (
                      <div
                        className="move-panel"
                        style={{
                          marginTop: "12px",
                          background: "rgba(99,179,237,0.04)",
                          border: "1px solid rgba(99,179,237,0.18)",
                          borderRadius: "12px",
                          padding: "14px",
                        }}
                      >
                        {/* Header info */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "12px",
                          }}
                        >
                          <span style={{ fontSize: "11px" }}>📌</span>
                          <div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#63B3ED",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                              }}
                            >
                              Pindahkan Booking Ini
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#555",
                                marginTop: "1px",
                              }}
                            >
                              Data{" "}
                              {bookingBy ? (
                                <span style={{ color: "#EAEAEA" }}>
                                  {bookingBy}
                                </span>
                              ) : (
                                "booking"
                              )}{" "}
                              akan dipindah ke slot yang dipilih. Slot asal akan
                              dikosongkan.
                            </div>
                          </div>
                        </div>

                        {/* Target date picker */}
                        <label
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                            marginBottom: "10px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#777",
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                              textTransform: "uppercase",
                            }}
                          >
                            Tanggal Tujuan
                          </span>
                          <input
                            type="date"
                            value={moveTargetDate}
                            onChange={(e) => {
                              setMoveTargetDate(e.target.value);
                              setMoveTargetId(null);
                              setMoveTargetSlots([]);
                            }}
                            className="admin-input"
                            style={{ borderColor: "rgba(99,179,237,0.3)" }}
                          />
                        </label>

                        {/* Available slots for target date */}
                        {moveTargetDate && (
                          <div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "#777",
                                fontWeight: 600,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                marginBottom: "7px",
                              }}
                            >
                              Slot Tersedia di {moveTargetDate}
                            </div>

                            {moveTargetLoading ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "6px",
                                }}
                              >
                                {[1, 2].map((i) => (
                                  <div
                                    key={i}
                                    style={{
                                      height: "46px",
                                      borderRadius: "8px",
                                      background: "rgba(99,179,237,0.05)",
                                      animation: "pulse 1.6s infinite",
                                    }}
                                  />
                                ))}
                              </div>
                            ) : moveTargetSlots.length === 0 ? (
                              <div
                                style={{
                                  padding: "16px",
                                  textAlign: "center",
                                  background: "rgba(255,255,255,0.02)",
                                  borderRadius: "8px",
                                  border: "1px dashed rgba(255,255,255,0.06)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "18px",
                                    opacity: 0.3,
                                    marginBottom: "5px",
                                  }}
                                >
                                  📭
                                </div>
                                <div
                                  style={{ fontSize: "11px", color: "#555" }}
                                >
                                  Tidak ada slot tersedia di tanggal ini
                                </div>
                              </div>
                            ) : (
                              <div>
                                {moveTargetSlots.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`slot-option${moveTargetId === slot.id ? " selected" : ""}`}
                                    onClick={() => setMoveTargetId(slot.id)}
                                  >
                                    <div
                                      style={{
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        border: `2px solid ${moveTargetId === slot.id ? "#63B3ED" : "rgba(255,255,255,0.2)"}`,
                                        background:
                                          moveTargetId === slot.id
                                            ? "#63B3ED"
                                            : "transparent",
                                        flexShrink: 0,
                                        transition: "all 0.15s",
                                      }}
                                    />
                                    <div style={{ flex: 1 }}>
                                      <div
                                        style={{
                                          fontFamily: "Oswald, sans-serif",
                                          fontSize: "13px",
                                          color: "#F0CC6E",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {formatTime(slot.time_from)} –{" "}
                                        {formatTime(slot.time_to)}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "9px",
                                          color: "#555",
                                          marginTop: "1px",
                                        }}
                                      >
                                        ID #{slot.id} · OPEN
                                      </div>
                                    </div>
                                    {moveTargetId === slot.id && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#63B3ED",
                                          fontWeight: 700,
                                        }}
                                      >
                                        ✓ Dipilih
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Confirm move button */}
                        {moveTargetId && (
                          <button
                            type="button"
                            disabled={moveLoading}
                            onClick={handleMoveSchedule}
                            style={{
                              width: "100%",
                              marginTop: "12px",
                              padding: "10px",
                              background:
                                "linear-gradient(135deg,#2B6CB0,#4299E1)",
                              border: "none",
                              color: "#fff",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: moveLoading ? "not-allowed" : "pointer",
                              fontFamily: "Oswald, sans-serif",
                              letterSpacing: "1px",
                              textTransform: "uppercase",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              opacity: moveLoading ? 0.7 : 1,
                              transition: "opacity 0.2s",
                            }}
                          >
                            {moveLoading ? (
                              <>
                                <Spinner size={12} color="#fff" />{" "}
                                Memindahkan...
                              </>
                            ) : (
                              "↗ Konfirmasi Pindah Jadwal"
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* ── END MOVE SECTION ── */}
                </>
              )}

              <div style={{ display: "flex", gap: "8px", paddingTop: "3px" }}>
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#777",
                    borderRadius: "8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "Mulish, sans-serif",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  style={{ flex: 2, padding: "10px", fontSize: "12px" }}
                >
                  {editId
                    ? "Simpan Perubahan"
                    : slots.length > 1
                      ? `Tambah ${slots.length} Slot`
                      : "Tambah Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteId && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "300px", textAlign: "center" }}
          >
            <div style={{ padding: "24px 20px" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>🗑️</div>
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#F0CC6E",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "7px",
                }}
              >
                Hapus Slot #{deleteId}?
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "18px",
                  lineHeight: 1.5,
                }}
              >
                Data tidak dapat dipulihkan.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setDeleteId(null)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#777",
                    borderRadius: "8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "Mulish, sans-serif",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#CC2222",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Oswald, sans-serif",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM ── */}
      {showLogoutConfirm && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{ maxWidth: "300px", textAlign: "center" }}
          >
            <div style={{ padding: "24px 20px" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>👋</div>
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#F0CC6E",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "7px",
                }}
              >
                Keluar dari Admin?
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "18px",
                }}
              >
                Sesi Anda akan diakhiri.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#777",
                    borderRadius: "8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "Mulish, sans-serif",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#CC2222",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "Oswald, sans-serif",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD ── */}
      {showChangePassword && (
        <div
          className="modal-backdrop"
          onClick={(e) =>
            e.target === e.currentTarget && setShowChangePassword(false)
          }
        >
          <div className="modal-card" style={{ maxWidth: "360px" }}>
            <div className="modal-hd">
              <div
                style={{
                  fontFamily: "Oswald, sans-serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#F0CC6E",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Ganti Password
              </div>
              <button
                onClick={() => setShowChangePassword(false)}
                style={{
                  width: "29px",
                  height: "29px",
                  borderRadius: "7px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#666",
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleChangePassword}
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {[
                {
                  l: "Password Saat Ini",
                  v: cpCurrent,
                  s: setCpCurrent,
                  p: "••••••••",
                },
                {
                  l: "Password Baru",
                  v: cpNew,
                  s: setCpNew,
                  p: "Min. 6 karakter",
                },
                {
                  l: "Konfirmasi Password Baru",
                  v: cpConfirm,
                  s: setCpConfirm,
                  p: "Ulangi password baru",
                },
              ].map((f) => (
                <label
                  key={f.l}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#777",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    {f.l}
                  </span>
                  <input
                    type="password"
                    required
                    value={f.v}
                    onChange={(e) => f.s(e.target.value)}
                    placeholder={f.p}
                    className="admin-input"
                  />
                </label>
              ))}
              {cpError && (
                <div
                  style={{
                    background: "rgba(204,34,34,0.09)",
                    border: "1px solid rgba(204,34,34,0.26)",
                    color: "#E57373",
                    fontSize: "12px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                  }}
                >
                  {cpError}
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", paddingTop: "3px" }}>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#777",
                    borderRadius: "8px",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontFamily: "Mulish, sans-serif",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cpLoading}
                  className="btn-gold"
                  style={{
                    flex: 2,
                    padding: "10px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                  }}
                >
                  {cpLoading && <Spinner size={12} color="#1a0f00" />}
                  {cpLoading ? "Menyimpan..." : "Simpan Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            right: "14px",
            zIndex: 100,
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            background: toast.type === "ok" ? "#111" : "rgba(204,34,34,0.14)",
            border:
              toast.type === "ok"
                ? "1px solid rgba(46,204,113,0.35)"
                : "1px solid rgba(204,34,34,0.35)",
            color: toast.type === "ok" ? "#2ECC71" : "#E57373",
            animation: "slideUp 0.18s ease",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <span style={{ fontSize: "14px" }}>
            {toast.type === "ok" ? "✓" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
