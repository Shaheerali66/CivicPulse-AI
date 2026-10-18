/**
 * src/components/maps/complaint-map.tsx
 *
 * PRD-04 :: Map & Location Experience
 * OpenStreetMap + Leaflet integration with safe SSR handling (client-only).
 * Displays authorized complaint locations with priority & category markers.
 * Includes accessible table/list fallback view.
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  MapPin,
  List,
  Map as MapIcon,
  AlertTriangle,
  Flame,
  Info,
  ExternalLink,
} from "lucide-react";
import type { DbComplaint } from "@/types/database";
import { PriorityBadge, StatusBadge, CategoryBadge } from "@/components/ui/badges";
import { formatDateTime, truncate } from "@/lib/utils";

// Default center: Hyderabad, Sindh, Pakistan
const HYDERABAD_CENTER: [number, number] = [25.396, 68.3578];

interface ComplaintMapProps {
  complaints: DbComplaint[];
  onSelectComplaint?: (complaint: DbComplaint) => void;
}

export function ComplaintMap({ complaints, onSelectComplaint }: ComplaintMapProps) {
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [isClient, setIsClient] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Leaflet map instance ref
  const leafletMapRef = useRef<any>(null);

  // Filter complaints that have valid coordinates
  const geocodedComplaints = complaints.filter(
    (c) =>
      typeof c.latitude === "number" &&
      typeof c.longitude === "number" &&
      !isNaN(c.latitude) &&
      !isNaN(c.longitude) &&
      c.latitude >= -90 &&
      c.latitude <= 90 &&
      c.longitude >= -180 &&
      c.longitude <= 180
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize and update Leaflet map on client
  useEffect(() => {
    if (!isClient || viewMode !== "map" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      try {
        const L = (await import("leaflet")).default;
        // Inject Leaflet CSS link if not already present
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!isMounted || !mapContainerRef.current) return;

        // Clean up previous map instance if any
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }

        const map = L.map(mapContainerRef.current).setView(
          geocodedComplaints.length > 0 && geocodedComplaints[0].latitude && geocodedComplaints[0].longitude
            ? [geocodedComplaints[0].latitude, geocodedComplaints[0].longitude]
            : HYDERABAD_CENTER,
          13
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        leafletMapRef.current = map;

        // Add markers
        geocodedComplaints.forEach((c) => {
          if (!c.latitude || !c.longitude) return;

          // Solid color pin based on priority
          const color =
            c.priority_band === "critical"
              ? "#e11d48" // rose-600
              : c.priority_band === "high"
              ? "#ea580c" // orange-600
              : c.priority_band === "medium"
              ? "#d97706" // amber-600
              : "#059669"; // emerald-600

          const customIcon = L.divIcon({
            className: "custom-leaflet-marker",
            html: `
              <div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([c.latitude, c.longitude], { icon: customIcon }).addTo(map);

          // Popup content
          const popupContent = document.createElement("div");
          popupContent.className = "p-1 font-sans text-xs";
          popupContent.innerHTML = `
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${c.tracking_id}</div>
            <div style="font-weight: 600; color: #334155; margin-bottom: 6px;">${escapeHtml(c.title)}</div>
            <div style="color: #64748b; margin-bottom: 6px;">${escapeHtml(c.location_label || "No location label")}</div>
            <div style="margin-bottom: 6px;">
              <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #334155; font-weight: 600;">Status: ${c.status}</span>
              <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${color}20; color: ${color}; font-weight: 700; margin-left: 4px;">${c.priority_band || "normal"}</span>
            </div>
            <button id="btn-view-${c.id}" style="width: 100%; margin-top: 6px; background-color: #2563eb; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-weight: 600; cursor: pointer;">
              View Details
            </button>
          `;

          marker.bindPopup(popupContent);

          marker.on("popupopen", () => {
            const btn = document.getElementById(`btn-view-${c.id}`);
            if (btn) {
              btn.onclick = () => {
                if (onSelectComplaint) onSelectComplaint(c);
              };
            }
          });
        });

        // Fit bounds if multiple points
        if (geocodedComplaints.length > 1) {
          const bounds = L.latLngBounds(
            geocodedComplaints.map((c) => [c.latitude!, c.longitude!])
          );
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (err) {
        console.error("Leaflet initialization error:", err);
        setMapError("Failed to initialize map tiles. You can use the List View fallback.");
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isClient, viewMode, geocodedComplaints.length]);

  return (
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Geographic View — Hyderabad, Sindh
          </h3>
          <span className="text-xs text-slate-500">
            ({geocodedComplaints.length} with coordinates / {complaints.length} total)
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-slate-200 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "map"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Accessible List
          </button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" ? (
        <div className="relative">
          {mapError ? (
            <div className="p-8 text-center bg-amber-50 border-b border-amber-200">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-amber-900 mb-1">{mapError}</p>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                Switch to List View
              </button>
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              style={{ height: "450px", width: "100%" }}
              className="z-0 bg-slate-100"
            />
          )}

          {/* Map Legend */}
          <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-700">Priority:</span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Low
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Tiles &copy; OpenStreetMap contributors
            </div>
          </div>
        </div>
      ) : (
        /* Accessible List / Table Alternative Fallback */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-2.5 px-4">Tracking ID</th>
                <th className="py-2.5 px-4">Title</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Priority</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Location Label</th>
                <th className="py-2.5 px-4">Coordinates</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No complaints match current filters.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-blue-600">
                      {c.tracking_id}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {truncate(c.title, 40)}
                    </td>
                    <td className="py-2.5 px-4">
                      <CategoryBadge category={c.category} />
                    </td>
                    <td className="py-2.5 px-4">
                      <PriorityBadge band={c.priority_band} score={c.priority_score} />
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {c.location_label || "Not specified"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {c.latitude && c.longitude
                        ? `${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)}`
                        : "No coordinates"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectComplaint && onSelectComplaint(c)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
