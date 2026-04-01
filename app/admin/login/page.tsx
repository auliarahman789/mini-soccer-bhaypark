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
        setLoading(false);
      }
    } catch {
      setError("Terjadi kesalahan, coba lagi");
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Mulish:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; }
        body { font-family: 'Mulish', sans-serif; background: #0A0A0A; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .login-wrap {
          min-height: 100vh;
          background: radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, #0A0A0A 60%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }

        .login-card {
          width: 100%;
          max-width: 340px;
          background: #111111;
          border: 1px solid rgba(201,168,76,0.22);
          border-radius: 16px;
          padding: 26px 22px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.04);
          animation: fadeIn 0.3s ease;
        }

        .login-input {
          width: 100%;
          background: #141414;
          border: 1px solid rgba(255,255,255,0.07);
          color: #EAEAEA;
          padding: 10px 13px;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Mulish', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          color-scheme: dark;
        }
        .login-input:focus {
          border-color: #C9A84C;
          background: #181818;
        }
        .login-input::placeholder { color: #3a3a3a; }
        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-submit {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          font-family: 'Oswald', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #1a0f00;
          border: none;
          cursor: pointer;
          transition: filter 0.2s, transform 0.15s;
          position: relative;
          overflow: hidden;
        }
        .btn-submit:not(:disabled) {
          background: linear-gradient(135deg, #C9A84C, #F0CC6E, #C9A84C);
        }
        .btn-submit:not(:disabled):hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-submit:disabled {
          background: linear-gradient(90deg, #3a2e10 0%, #5a4a1e 40%, #3a2e10 60%, #3a2e10 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
          cursor: not-allowed;
          color: rgba(201,168,76,0.5);
        }

        .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(201,168,76,0.35),transparent); margin:0 0 18px }
      `}</style>

      <div className="login-wrap">
        {/* Top badge */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "26px",
            animation: "fadeIn 0.4s ease",
          }}
        >
          <span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#C9A84C,#F0CC6E,#C9A84C)",
              color: "#1a0f00",
              fontFamily: "Oswald, sans-serif",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "1.8px",
              textTransform: "uppercase",
              padding: "4px 11px",
              borderRadius: "4px",
              marginBottom: "10px",
            }}
          >
            Kepolisian Negara Republik Indonesia · Daerah Kep. Bangka Belitung
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
          <div
            style={{
              fontFamily: "Mulish, sans-serif",
              fontSize: "10px",
              color: "#555",
              letterSpacing: "3px",
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            Admin Panel
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Icon + title */}
          <div style={{ textAlign: "center", marginBottom: "18px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                margin: "0 auto 11px",
              }}
            >
              {loading ? (
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid rgba(201,168,76,0.2)",
                    borderTopColor: "#C9A84C",
                    animation: "spin 0.65s linear infinite",
                  }}
                />
              ) : (
                "🔒"
              )}
            </div>
            <div
              style={{
                fontFamily: "Oswald, sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "#F0CC6E",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
            </div>
          </div>

          <div className="divider" />

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "13px" }}
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
                Username
              </span>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                placeholder="admin"
                disabled={loading}
              />
            </label>

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
                Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••"
                disabled={loading}
              />
            </label>

            {error && (
              <div
                style={{
                  background: "rgba(204,34,34,0.09)",
                  border: "1px solid rgba(204,34,34,0.28)",
                  color: "#E57373",
                  fontSize: "12px",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <span style={{ fontSize: "14px" }}>⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
              style={{ marginTop: "2px" }}
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      width: "13px",
                      height: "13px",
                      borderRadius: "50%",
                      border: "2px solid rgba(201,168,76,0.2)",
                      borderTopColor: "rgba(201,168,76,0.6)",
                      display: "inline-block",
                      animation: "spin 0.65s linear infinite",
                    }}
                  />
                  Memverifikasi...
                </span>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: "22px",
            fontSize: "11px",
            color: "#2e2e2e",
            textAlign: "center",
            fontFamily: "Mulish, sans-serif",
            animation: "fadeIn 0.5s ease",
          }}
        >
          © {new Date().getFullYear()} Pelayanan Markas Polda Kep. Babel
        </p>
      </div>
    </>
  );
}
