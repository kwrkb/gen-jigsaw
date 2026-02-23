"use client";

import { useState, FormEvent } from "react";
import { Puzzle, Sparkles, User, ArrowRight, Loader2 } from "lucide-react";

interface UserSetupProps {
  onSetup: (displayName: string) => Promise<void>;
}

export function UserSetup({ onSetup }: UserSetupProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSetup(name.trim());
    } catch {
      setError("ユーザー作成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--color-surface-0)" }}
    >
      {/* Background blobs for visual interest */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: "var(--color-accent)" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-10 pointer-events-none" style={{ background: "var(--color-accent)" }} />

      <div
        className="w-full max-w-md p-10 relative z-10 transition-all duration-500"
        style={{
          background: "var(--color-surface-1)",
          borderRadius: "var(--radius-3xl)",
          boxShadow: "var(--shadow-2xl)",
          border: "1px solid var(--color-surface-3)",
        }}
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div 
            className="w-16 h-16 mb-6 flex items-center justify-center relative"
            style={{ 
              background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
              borderRadius: "var(--radius-2xl)",
              color: "var(--color-accent)"
            }}
          >
            <Puzzle size={32} className="relative z-10" />
            <Sparkles size={16} className="absolute -top-1 -right-1" />
          </div>
          
          <h1
            className="text-4xl font-black mb-2 tracking-tight"
            style={{ fontFamily: "var(--font-display), sans-serif", color: "var(--color-text-primary)" }}
          >
            Gen-Jigsaw
          </h1>
          <p className="text-sm font-medium leading-relaxed opacity-70" style={{ color: "var(--color-text-muted)" }}>
            Collaborative AI-powered outpainting puzzle.<br />
            Expand a shared world, one tile at a time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70" style={{ color: "var(--color-text-secondary)" }}>
              <User size={14} className="text-accent" />
              Display Name
            </label>
            <div className="relative group">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={50}
                className="w-full px-5 py-3.5 text-base font-medium outline-none transition-all duration-300"
                style={{
                  background: "var(--color-surface-0)",
                  border: "2px solid var(--color-surface-3)",
                  borderRadius: "var(--radius-xl)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-surface-3)")}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>
          
          {error && (
            <div className="p-3 text-xs font-bold rounded-lg bg-red-50 dark:bg-red-950/20 text-center" style={{ color: "var(--color-error)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="group relative w-full py-4 text-white font-bold text-lg shadow-xl shadow-accent/20 transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:shadow-none overflow-hidden"
            style={{
              background: "var(--color-accent)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </div>
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full"
              style={{ transitionDuration: "1s" }}
            />
          </button>
        </form>
      </div>
    </div>
  );
}
