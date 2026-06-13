"use client";

import { useState, useEffect } from "react";
import { COUNTRIES, getCitiesForCountry, getCountryName } from "@/lib/countries";
import { inputStyle, selectStyle, textareaStyle, labelStyle, labelTextStyle } from "@/components/shared/shops/formStyles";

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
      <p style={{ fontSize: 14, color: "var(--ink-faint)", fontFamily: "var(--body)" }}>
        Location: <strong style={{ color: "var(--ink)" }}>Remote / Worldwide</strong>
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Country */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Country <span style={{ color: "var(--clay)" }}>*</span></span>
        <select
          value={countryCode}
          onChange={(e) => handleCountryChange(e.target.value)}
          required
          style={selectStyle}
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
          <option value="OTHER">Other (not listed)</option>
        </select>
      </label>

      {/* Custom country input */}
      {showCustomCountry && (
        <label style={labelStyle}>
          <span style={labelTextStyle}>Country name <span style={{ color: "var(--clay)" }}>*</span></span>
          <input
            type="text"
            value={customCountry}
            onChange={(e) => setCustomCountry(e.target.value)}
            required
            maxLength={100}
            placeholder="Enter your country name"
            style={inputStyle}
          />
        </label>
      )}

      {/* City */}
      {showCitySection && (
        <label style={labelStyle}>
          <span style={labelTextStyle}>City <span style={{ color: "var(--clay)" }}>*</span></span>
          {cities.length > 0 ? (
            <select
              value={citySelect}
              onChange={(e) => setCitySelect(e.target.value)}
              required
              style={selectStyle}
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
              style={inputStyle}
            />
          )}
        </label>
      )}

      {/* Custom city input */}
      {showCitySection && showCustomCity && (
        <label style={labelStyle}>
          <span style={labelTextStyle}>City name <span style={{ color: "var(--clay)" }}>*</span></span>
          <input
            type="text"
            value={customCity}
            onChange={(e) => setCustomCity(e.target.value)}
            required
            maxLength={100}
            placeholder="Enter your city name"
            style={inputStyle}
          />
        </label>
      )}

      {/* Post code (optional) */}
      {showCitySection && (
        <label style={labelStyle}>
          <span style={labelTextStyle}>
            Post / ZIP code <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span>
          </span>
          <input
            type="text"
            value={value.postCode}
            onChange={(e) => patch("postCode", e.target.value)}
            maxLength={20}
            placeholder="e.g. SW1A 1AA or 10001"
            style={inputStyle}
          />
        </label>
      )}

      {/* Company address (for on-site / hybrid) */}
      {showAddress && (
        <label style={labelStyle}>
          <span style={labelTextStyle}>
            Company / office address <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span>
          </span>
          <textarea
            value={value.companyAddress}
            onChange={(e) => patch("companyAddress", e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Street address, building name, floor…"
            style={{ ...textareaStyle, minHeight: 60 }}
          />
        </label>
      )}
    </div>
  );
}
