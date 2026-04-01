"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(json.error ?? "Login gagal");
      }
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Mulish:wght@400;500;600&display=swap');
        body { font-family: 'Mulish', sans-serif; background: #0A0A0A; }
        .font-oswald { font-family: 'Oswald', sans-serif; }
      `}</style>

      <div
        className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, #0A0A0A 60%)",
        }}
      >
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] rounded-xl p-4 mb-4">
              <div className="text-3xl">⚽</div>
            </div>
            <div className="font-oswald text-xl font-bold text-[#F0CC6E] tracking-wide uppercase">
              Bhaypark Mini Soccer
            </div>
            <div className="text-[#555] text-xs mt-1 tracking-widest uppercase">
              Admin Panel
            </div>
          </div>

          {/* Card */}
          <div className="bg-[#111] border border-[rgba(201,168,76,0.2)] rounded-2xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <h1 className="font-oswald text-base font-semibold text-[#F0CC6E] uppercase tracking-[1px] mb-6 text-center">
              Masuk ke Panel Admin
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[#888] font-medium tracking-wide">
                  Username
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] text-[#EAEAEA] px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-[#C9A84C] transition-colors"
                  placeholder="admin"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-[#888] font-medium tracking-wide">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] text-[#EAEAEA] px-3.5 py-2.5 rounded-lg text-sm outline-none focus:border-[#C9A84C] transition-colors"
                  placeholder="••••••••"
                />
              </label>

              {error && (
                <div className="bg-[rgba(204,34,34,0.1)] border border-[rgba(204,34,34,0.3)] text-[#E57373] text-xs px-3.5 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 py-3 rounded-lg font-oswald text-sm font-semibold tracking-[1px] uppercase transition-all text-[#1a0f00] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #C9A84C, #F0CC6E)",
                }}
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </button>
            </form>

            <p className="text-center text-[10px] text-[#444] mt-5">
              Default: admin / admin123
            </p>
          </div>

          <p className="text-center text-[#333] text-xs mt-6">
            © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
          </p>
        </div>
      </div>
    </>
  );
}
