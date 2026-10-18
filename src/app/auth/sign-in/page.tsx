"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = profile?.role || "citizen";
        if (role === "officer" || role === "admin") {
          router.push("/dashboard");
          return;
        } else {
          router.push("/my-complaints");
          return;
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-[#CBD5E1] p-6 sm:p-8 rounded">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-[#0F3F6E] text-white rounded flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-[#0A2540]">
            Sign in to CivicPulse
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Access your verified complaint history and receive status updates.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs text-[#991B1B] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[#1E293B]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="citizen@example.com"
              className="mt-1 block w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-[#1E293B]">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#0F3F6E] hover:underline"
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
              className="mt-1 block w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
          Don't have an account yet?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-[#0F3F6E] hover:underline">
            Register as Citizen
          </Link>
        </div>
      </div>
    </div>
  );
}
