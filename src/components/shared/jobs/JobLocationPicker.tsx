"use client";

import { useState, useEffect } from "react";
import { COUNTRIES, getCitiesForCountry, getCountryName } from "@/lib/countries";

export interface JobLocation {
  country: string;
  city: string;
  postCode: string;
  companyAddress: string;
}

interface Props {
  value: JobLocation;
  onChange: (v: JobLocation) => void;
  remoteType: string;
}

const INPUT_CLS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

/** Resolve saved country name → country code (for dropdown selection) */
function resolveCode(countryName: string): string {
  if (!countryName) return "";
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase()
  );
  return match ? match.code : "OTHER";
}

/** Resolve saved city name → is it in the list for the given code? */
function isCityInList(code: string, cityName: string): boolean {
  if (!cityName || !code || code === "OTHER") return false;
  const cities = getCitiesForCountry(code);
  return cities.includes(cityName);
}

export default function JobLocationPicker({ value, onChange, remoteType }: Props) {
  const isPhysical = remoteType !== "REMOTE";

  // Internal dropdown selections (derived from value on mount)
  const [countryCode, setCountryCode] = useState<string>(() =>
    resolveCode(value.country)
  );
  const [customCountry, setCustomCountry] = useState<string>(() =>
    resolveCode(value.country) === "OTHER" ? value.country : ""
  );
  const [citySelect, setCitySelect] = useState<string>(() => {
    const code = resolveCode(value.country);
    if (!value.city) return "";
    return isCityInList(code, value.city) ? value.city : "OTHER";
  });
  const [customCity, setCustomCity] = useState<string>(() => {
    const code = resolveCode(value.country);
    return isCityInList(code, value.city) ? "" : value.city;
  });

  const cities = getCitiesForCountry(countryCode);
  const showCustomCountry = countryCode === "OTHER";
  const showCitySection = isPhysical && !!countryCode;
  const showCustomCity = citySelect === "OTHER";
  const showAddress = isPhysical && (!!countryCode);

  // Propagate changes upward as resolved plain-text values
  useEffect(() => {
    const resolvedCountry =
      countryCode === "OTHER" ? customCountry : getCountryName(countryCode);
    const resolvedCity =
      citySelect === "OTHER" ? customCity : citySelect;

    onChange({
      country: resolvedCountry,
      city: resolvedCity,
      postCode: value.postCode,
      companyAddress: value.companyAddress,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, customCountry, citySelect, customCity]);

  function handleCountryChange(code: string) {
    setCountryCode(code);
    // Reset city when country changes
    setCitySelect("");
    setCustomCity("");
  }

  function patch(field: keyof JobLocation, val: string) {
    onChange({ ...value, [field]: val });
  }

  if (!isPhysical) {
    return (
      <p className="text-sm text-gray-500">
        Location: <strong>Remote / Worldwide</strong>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          value={countryCode}
          onChange={(e) => handleCountryChange(e.target.value)}
          required
          className={INPUT_CLS}
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          <option value="OTHER">Other (not listed)</option>
        </select>
      </div>

      {/* Custom country input */}
      {showCustomCountry && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customCountry}
            onChange={(e) => setCustomCountry(e.target.value)}
            required
            maxLength={100}
            placeholder="Enter your country name"
            className={INPUT_CLS}
          />
        </div>
      )}

      {/* City */}
      {showCitySection && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          {cities.length > 0 ? (
            <select
              value={citySelect}
              onChange={(e) => setCitySelect(e.target.value)}
              required
              className={INPUT_CLS}
            >
              <option value="">Select a city</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
              <option value="OTHER">Other (not listed)</option>
            </select>
          ) : (
            <input
              type="text"
              value={citySelect === "OTHER" ? customCity : citySelect}
              onChange={(e) => {
                setCitySelect(e.target.value ? "OTHER" : "");
                setCustomCity(e.target.value);
              }}
              required
              maxLength={100}
              placeholder="Enter city name"
              className={INPUT_CLS}
            />
          )}
        </div>
      )}

      {/* Custom city input */}
      {showCitySection && showCustomCity && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            required
            maxLength={100}
            placeholder="Enter your city name"
            className={INPUT_CLS}
          />
        </div>
      )}

      {/* Post code (optional) */}
      {showCitySection && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Post / ZIP code
            <span className="ml-1 text-xs text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={value.postCode}
            onChange={(e) => patch("postCode", e.target.value)}
            maxLength={20}
            placeholder="e.g. SW1A 1AA or 10001"
            className={INPUT_CLS}
          />
        </div>
      )}

      {/* Company address (for on-site / hybrid) */}
      {showAddress && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company / office address
            <span className="ml-1 text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={value.companyAddress}
            onChange={(e) => patch("companyAddress", e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Street address, building name, floor…"
            className={`${INPUT_CLS} resize-none`}
          />
        </div>
      )}
    </div>
  );
}
