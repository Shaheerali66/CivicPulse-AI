"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, AlertCircle, ShieldCheck, RotateCw, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillOfficerCredentials = () => {
    setEmail("officer.hyderabad@civicpulse.test");
    setPassword("Officer@12345");
    setError(null);
  };

  const DEMO_EMAIL = "officer.hyderabad@civicpulse.test";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const isDemoOfficer = normalizedEmail === DEMO_EMAIL;

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!authError && data?.user) {
        // Successful Supabase auth — query role and redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = profile?.role || "citizen";
        const dest =
          role === "officer" || role === "admin"
            ? redirectTarget.startsWith("/dashboard")
              ? redirectTarget
              : "/dashboard"
            : "/my-complaints";

        // Hard navigation guarantees the session cookie is picked up immediately
        window.location.href = dest;
        return;
      }

      // ── Demo / Dev fallback ──────────────────────────────────────────────
      // If the standard auth fails for the demo officer account, hit the
      // server-side route that uses the service-role client to authenticate.
      if (isDemoOfficer) {
        const fallbackRes = await fetch("/api/auth/demo-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });

        if (fallbackRes.ok) {
          window.location.href = redirectTarget.startsWith("/dashboard")
            ? redirectTarget
            : "/dashboard";
          return;
        }

        // If even the fallback failed, surface the original auth error
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        throw new Error(
          fallbackData?.error ||
            authError?.message ||
            "Demo login failed. Please contact your system administrator."
        );
      }

      // Non-demo user: surface the Supabase error
      throw authError || new Error("Sign-in failed. Please verify your email and password.");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-2xl shadow-md w-full">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center mx-auto mb-3.5 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Officer Portal Sign In
        </h1>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Authorized access for Hyderabad Municipal Officers, HMC, HWASA, and HESCO personnel.
        </p>
      </div>

      {/* Quick Officer Credentials Autofill Banner */}
      <div className="mb-6 p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5 font-bold">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-800" />
            Official Hyderabad Officer Demo:
          </span>
          <button
            type="button"
            onClick={fillOfficerCredentials}
            className="text-blue-700 hover:text-blue-900 underline text-xs font-bold transition-colors cursor-pointer"
          >
            Fill Credentials
          </button>
        </div>
        <p className="text-[11px] text-blue-800 font-mono select-all bg-white/60 p-1.5 rounded border border-blue-200/60 mt-1">
          officer.hyderabad@civicpulse.test / Officer@12345
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-800 mb-1">
            Official Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="officer.hyderabad@civicpulse.test"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all shadow-2xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-xs font-bold text-slate-800">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-900 hover:text-blue-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-blue-900 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/10 transition-all shadow-2xs"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm mt-2"
        >
          <LogIn className="w-4 h-4 mr-2" />
          <span>Sign In to Officer Portal</span>
        </Button>
      </form>

      <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-500 leading-relaxed">
        Official Municipal Staff Portal. Unauthorized access is recorded and prohibited under provincial government IT compliance regulations.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white py-3 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-slate-900 font-bold hover:text-blue-900 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              CP
            </div>
            <div>
              <span className="block text-sm font-bold leading-tight">CivicPulse AI</span>
              <span className="block text-[11px] font-medium text-slate-500 leading-tight">Hyderabad Municipal Portal</span>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-blue-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Public Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <RotateCw className="w-6 h-6 animate-spin mx-auto text-blue-900 mb-2" />
                <p className="text-xs">Loading secure login portal...</p>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} CivicPulse AI · Government of Sindh · Hyderabad Operations
      </footer>
    </div>
  );
}
