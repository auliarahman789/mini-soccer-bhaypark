"use client";

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

type SlotTime = {
  time_from: string;
  time_to: string;
};

const today = format(new Date(), "yyyy-MM-dd");

function formatTime(t: string) {
  return t?.slice(0, 5) ?? "";
}

function formatDate(d: string) {
  if (!d) return "";
  const dateOnly = d.slice(0, 10);
  const [y, m, day] = dateOnly.split("-");
  return `${day}/${m}/${y}`;
}

const inputClass =
  "w-full bg-neutral-800 border border-neutral-700 text-neutral-100 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-yellow-400 transition-colors [color-scheme:dark]";

export default function TimetablePage() {
  const [entries, setEntries] = useState<Timetable[]>([]);
  const [filterDate, setFilterDate] = useState(today);
  const [loading, setLoading] = useState(false);

  const [formDate, setFormDate] = useState(today);
  const [slots, setSlots] = useState<SlotTime[]>([
    { time_from: "08:00", time_to: "09:00" },
  ]);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingBy, setBookingBy] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: "ok" | "err";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterDate
        ? `/api/timetable?date=${filterDate}`
        : "/api/timetable";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setEntries(json.data);
      console.log(json.data);
    } catch {
      showToast("Gagal memuat data", "err");
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addSlot = () => {
    const last = slots[slots.length - 1];
    const [h] = last.time_to.split(":").map(Number);
    const from = `${String(h).padStart(2, "0")}:00`;
    const to = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${h >= 23 ? "59" : "00"}`;
    setSlots([...slots, { time_from: from, time_to: to }]);
  };

  const removeSlot = (i: number) => {
    if (slots.length > 1) setSlots(slots.filter((_, idx) => idx !== i));
  };

  const updateSlot = (i: number, field: keyof SlotTime, value: string) => {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  const openCreate = () => {
    setFormDate(today);
    setSlots([{ time_from: "08:00", time_to: "09:00" }]);
    setIsBooking(false);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (entry: Timetable) => {
    const dateOnly = entry.date.slice(0, 10);
    setFormDate(dateOnly);
    setSlots([
      {
        time_from: formatTime(entry.time_from),
        time_to: formatTime(entry.time_to),
      },
    ]);
    setIsBooking(entry.is_booking);
    setBookingBy(entry.booking_by);
    setEditId(entry.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
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
          }),
        });
        const json = await res.json();
        if (json.success) {
          showToast("Berhasil diperbarui ✓");
          closeForm();
          fetchEntries();
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
        } else {
          showToast(`${failed.length} dari ${slots.length} slot gagal`, "err");
        }
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

  const apiRoutes = [
    { method: "GET", path: "/api/timetable", desc: "Semua slot" },
    {
      method: "GET",
      path: "/api/timetable?date=YYYY-MM-DD",
      desc: "Filter by tanggal",
    },
    { method: "GET", path: "/api/timetable/:id", desc: "Detail slot" },
    { method: "POST", path: "/api/timetable", desc: "Buat slot baru" },
    { method: "PUT", path: "/api/timetable/:id", desc: "Update slot" },
    { method: "DELETE", path: "/api/timetable/:id", desc: "Hapus slot" },
  ];

  const methodColor: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-300",
    DELETE: "text-red-400",
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <span className="font-mono text-[22px] font-bold text-yellow-400 tracking-tight">
            TIMETABLE
          </span>
          <span className="font-mono text-[11px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded">
            /api/timetable
          </span>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-semibold text-sm px-5 py-2 rounded-md transition-colors"
        >
          <span className="text-base leading-none">+</span> Tambah Slot
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            {
              label: "Total Slot",
              value: entries.length,
              color: "text-yellow-400",
            },
            { label: "Booked", value: booked, color: "text-red-400" },
            { label: "Available", value: available, color: "text-green-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-4"
            >
              <div className={`font-mono text-3xl font-bold ${s.color}`}>
                {s.value}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm pointer-events-none">
              Filter tanggal:
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-100 pl-[120px] pr-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer [color-scheme:dark] focus:border-neutral-600 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="font-mono grid grid-cols-[1fr_90px_90px_100px_1fr_110px] px-5 py-3 ...">
            <div>Tanggal</div>
            <div>Mulai</div>
            <div>Selesai</div>
            <div>Status</div>
            <div>Booking By</div>
            <div className="text-right">Aksi</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-12 text-center text-neutral-500 text-sm">
              Memuat data...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-14 px-6 text-center text-neutral-500">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm">
                {filterDate
                  ? `Tidak ada slot pada ${formatDate(filterDate)}`
                  : "Belum ada data timetable"}
              </div>
              <button
                onClick={openCreate}
                className="mt-4 border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 px-4 py-2 rounded-md text-sm transition-colors"
              >
                + Tambah Slot Pertama
              </button>
            </div>
          ) : (
            entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`grid grid-cols-[1fr_90px_90px_100px_1fr_110px] px-5 py-3.5 ...`}
              >
                {/* Date */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-0.5 h-8 rounded-full flex-shrink-0 ${entry.is_booking ? "bg-red-400" : "bg-green-400"}`}
                  />
                  <div>
                    <div className="font-mono text-sm">
                      {formatDate(entry.date)}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      ID #{entry.id}
                    </div>
                  </div>
                </div>

                {/* Time from */}
                <div className="font-mono text-[15px] text-yellow-400">
                  {formatTime(entry.time_from)}
                </div>

                {/* Time to */}
                <div className="font-mono text-[15px] text-neutral-500">
                  {formatTime(entry.time_to)}
                </div>

                {/* Status toggle */}
                <div>
                  <button
                    onClick={() => toggleBooking(entry)}
                    title="Klik untuk toggle status"
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border transition-all cursor-pointer ${
                      entry.is_booking
                        ? "bg-red-400/10 text-red-400 border-red-400/30 hover:bg-red-400/20"
                        : "bg-green-400/10 text-green-400 border-green-400/30 hover:bg-green-400/20"
                    }`}
                  >
                    {entry.is_booking ? "BOOKED" : "OPEN"}
                  </button>
                </div>

                {/* Booking By */}
                <div className="text-sm text-neutral-300 truncate pr-2">
                  {entry.booking_by ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      {entry.booking_by}
                    </span>
                  ) : (
                    <span className="text-neutral-600 text-xs italic">—</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => openEdit(entry)}
                    className="bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-100 hover:border-yellow-400 px-3 py-1.5 rounded-md text-xs transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(entry.id)}
                    className="bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-red-400 hover:border-red-400 px-3 py-1.5 rounded-md text-xs transition-all"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* API Reference */}
        <div className="mt-10 bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-4">
            API Reference
          </div>
          <div className="flex flex-col gap-2">
            {apiRoutes.map((r) => (
              <div
                key={`${r.method}-${r.path}`}
                className="font-mono flex items-center gap-3 text-xs"
              >
                <span
                  className={`${methodColor[r.method]} w-[50px] flex-shrink-0 font-bold`}
                >
                  {r.method}
                </span>
                <span className="text-neutral-200 flex-1">{r.path}</span>
                <span className="text-neutral-500">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-7 w-full max-w-[440px] mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-mono text-lg font-bold">
                  {editId ? "Edit Slot" : "Tambah Slot"}
                </h2>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {editId
                    ? `ID #${editId}`
                    : "Bisa tambah lebih dari satu jam sekaligus"}
                </div>
              </div>
              <button
                onClick={closeForm}
                className="bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-100 w-8 h-8 rounded-md flex items-center justify-center text-base transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Tanggal */}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-neutral-400 font-medium">
                  Tanggal
                </span>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className={inputClass}
                />
              </label>

              {/* Slot rows */}
              <div>
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-2">
                  <span className="text-xs text-neutral-400 font-medium">
                    Mulai
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    Selesai
                  </span>
                  <span />
                </div>

                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_32px] gap-2 mb-2 items-center"
                  >
                    <input
                      type="time"
                      required
                      value={slot.time_from}
                      onChange={(e) =>
                        updateSlot(i, "time_from", e.target.value)
                      }
                      className={inputClass}
                    />
                    <input
                      type="time"
                      required
                      value={slot.time_to}
                      onChange={(e) => updateSlot(i, "time_to", e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      disabled={slots.length === 1}
                      title="Hapus baris ini"
                      className={`w-8 h-[42px] rounded-md border border-neutral-700 bg-neutral-800 text-neutral-400 flex items-center justify-center text-base transition-all flex-shrink-0 ${
                        slots.length === 1
                          ? "opacity-30 cursor-not-allowed"
                          : "cursor-pointer hover:text-red-400 hover:border-red-400"
                      }`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {!editId && (
                  <button
                    type="button"
                    onClick={addSlot}
                    className="w-full border border-dashed border-neutral-700 hover:border-neutral-500 bg-transparent text-neutral-500 hover:text-neutral-200 py-2.5 rounded-lg text-sm transition-all mt-0.5"
                  >
                    + Tambah jam lagi
                  </button>
                )}
              </div>

              {/* is_booking */}
              {editId && (
                <label className="flex items-center gap-2.5 cursor-pointer bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={isBooking}
                    onChange={(e) => setIsBooking(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-yellow-400"
                  />
                  <div>
                    <div className="text-sm font-medium">Is Booking</div>
                    <div className="text-[11px] text-neutral-500">
                      Tandai slot ini sudah dipesan
                    </div>
                  </div>
                </label>
              )}

              {/* booking_by */}
              {editId && (
                <label className="flex flex-col gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-3">
                  <span className="text-sm font-medium text-white">
                    Booking By
                  </span>

                  <input
                    type="text"
                    value={bookingBy ?? ""}
                    onChange={(e) => setBookingBy(e.target.value)}
                    placeholder="Di booking oleh"
                    className="w-full rounded-md border border-neutral-600 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </label>
              )}

              {/* Buttons */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 bg-neutral-800 border border-neutral-700 text-neutral-100 py-2.5 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-yellow-400 hover:bg-yellow-300 text-neutral-950 py-2.5 rounded-lg text-sm font-bold transition-colors"
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

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-7 w-full max-w-sm mx-4 text-center">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="text-base font-semibold mb-2">
              Hapus Slot #{deleteId}?
            </h3>
            <p className="text-neutral-500 text-sm mb-6">
              Data yang dihapus tidak dapat dipulihkan kembali.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 bg-neutral-800 border border-neutral-700 text-neutral-100 py-2.5 rounded-lg text-sm hover:bg-neutral-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg text-sm font-medium shadow-xl border transition-all ${
            toast.type === "ok"
              ? "bg-neutral-900 border-green-400/50 text-green-400"
              : "bg-red-950 border-red-400/50 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
