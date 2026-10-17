"use client";

import React, { useState } from "react";
import { MapPin, Navigation, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationFieldProps {
  locationDescription: string;
  onDescriptionChange: (desc: string) => void;
  coordinates?: { latitude: number; longitude: number };
  onCoordinatesChange: (coords: { latitude: number; longitude: number } | undefined) => void;
}

export function LocationField({
  locationDescription,
  onDescriptionChange,
  coordinates,
  onCoordinatesChange,
}: LocationFieldProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleGetLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        onCoordinatesChange({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission denied. You can still type the address manually.");
        } else {
          setGeoError("Could not retrieve GPS coordinates. Please type the location manually.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearCoordinates = () => {
    onCoordinatesChange(undefined);
    setGeoError(null);
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="locationDesc"
          className="block text-sm font-semibold text-[#1E293B]"
        >
          Location or Landmark <span className="text-xs font-normal text-[#64748B]">(Optional)</span>
        </label>
        <p className="text-xs text-[#64748B] mt-0.5">
          E.g., "Near Latifabad Unit 7 Market" or street landmark in Hyderabad.
        </p>
        <input
          id="locationDesc"
          type="text"
          value={locationDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter street, landmark, or neighborhood name"
          maxLength={300}
          className="mt-1 block w-full px-3 py-2 border border-[#CBD5E1] rounded text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F3F6E]"
        />
      </div>

      {/* GPS Coordinates button & status */}
      <div className="pt-1">
        {coordinates ? (
          <div className="flex items-center justify-between p-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-xs text-[#166534]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#15803D]" />
              <span>
                GPS Attached: {coordinates.latitude}, {coordinates.longitude}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearCoordinates}
              className="text-[#991B1B] hover:text-[#7F1D1D] p-1"
              title="Remove GPS coordinates"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            isLoading={geoLoading}
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5 text-[#0F3F6E]" />
            Attach GPS Location
          </Button>
        )}

        {geoError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{geoError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
