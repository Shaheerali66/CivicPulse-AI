"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate verified form intake
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="max-w-2xl mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
          Citizen Support & Inquiries
        </h1>
        <p className="mt-2 text-sm text-[#475569]">
          Have questions regarding CivicPulse AI or need assistance with a registered complaint? Reach out through verified channels below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact info cards */}
        <div className="space-y-4">
          <div className="bg-white border border-[#CBD5E1] p-5 rounded">
            <div className="flex items-center gap-2.5 text-[#0F3F6E] font-semibold text-sm mb-2">
              <MapPin className="w-4 h-4" />
              Pilot Center
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Hyderabad Civic Technology Demonstration Center, Sindh, Pakistan.
            </p>
          </div>

          <div className="bg-white border border-[#CBD5E1] p-5 rounded">
            <div className="flex items-center gap-2.5 text-[#0F3F6E] font-semibold text-sm mb-2">
              <Phone className="w-4 h-4" />
              Emergency Helplines
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              For live fire, health, or electrical emergencies, call Rescue 1122 or local utility emergency desks directly.
            </p>
          </div>

          <div className="bg-white border border-[#CBD5E1] p-5 rounded">
            <div className="flex items-center gap-2.5 text-[#0F3F6E] font-semibold text-sm mb-2">
              <Mail className="w-4 h-4" />
              Direct Support
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              support@civicpulse.org.pk
            </p>
          </div>
        </div>

        {/* Message Form */}
        <div className="md:col-span-2 bg-white border border-[#CBD5E1] p-6 sm:p-8 rounded">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto" />
              <h2 className="text-base font-bold text-[#166534]">
                Message Acknowledged
              </h2>
              <p className="text-xs text-[#475569] max-w-sm mx-auto">
                Thank you for reaching out. Inquiries are reviewed during civic administration operating hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-[#1E293B]">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="mt-1 w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-[#1E293B]">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-xs font-semibold text-[#1E293B]">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Inquiry or complaint reference"
                  className="mt-1 w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-xs font-semibold text-[#1E293B]">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="mt-1 w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
                />
              </div>

              <Button type="submit" variant="primary" size="md" isLoading={loading} className="w-full">
                <Send className="w-4 h-4 mr-1.5" />
                Send Inquiry
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
