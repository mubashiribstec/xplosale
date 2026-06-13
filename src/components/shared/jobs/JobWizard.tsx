"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SkillsChipInput from "@/components/shared/SkillsChipInput";
import JobLocationPicker, { type JobLocation } from "@/components/shared/jobs/JobLocationPicker";
import { EMPLOYMENT_TYPE_OPTIONS, EXPERIENCE_LEVEL_OPTIONS } from "@/lib/job-facets";
import { inputStyle, selectStyle, textareaStyle, labelStyle, labelTextStyle } from "@/components/shared/shops/formStyles";

const DRAFT_KEY = "xplosale.job-wizard-draft.v1";

const REMOTE_TYPES = [
  { value: "ONSITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
] as const;

const EMPTY_LOCATION: JobLocation = {
  country: "",
  city: "",
  postCode: "",
  companyAddress: "",
};

const STEPS = [
  { title: "Role basics", tip: "What's the role, and what kind of position is it? A clear title and description attract better candidates." },
  { title: "Location", tip: "Where is this role based? Remote roles don't need a location." },
  { title: "Skills & compensation", tip: "Skills are used to automatically score and rank candidates. A salary range builds trust with applicants." },
  { title: "Review & publish", tip: "Check everything looks right. Your posting is saved as a draft — review and publish it from the edit page." },
] as const;

interface DraftState {
  step: number;
  title: string;
  description: string;
  remoteType: string;
  employmentType: string;
  experienceLevel: string;
  location: JobLocation;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  requiredKeywords: string[];
  currency: string;
  salaryMin: string;
  salaryMax: string;
  savedAt: number;
}

export default function JobWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remoteType, setRemoteType] = useState("ONSITE");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [location, setLocation] = useState<JobLocation>(EMPTY_LOCATION);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>([]);
  const [currency, setCurrency] = useState("PKR");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DraftState | null>(null);

  // Detect saved draft on mount (deferred to avoid setState during hydration)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DraftState;
          if (parsed.title || parsed.description) setDraft(parsed);
        }
      } catch { /* corrupted draft — ignore */ }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Persist draft (debounced)
  useEffect(() => {
    if (saving) return;
    const t = setTimeout(() => {
      const hasContent = title || description;
      if (!hasContent) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          step, title, description, remoteType, employmentType, experienceLevel,
          location, requiredSkills, niceToHaveSkills, requiredKeywords,
          currency, salaryMin, salaryMax, savedAt: Date.now(),
        } satisfies DraftState));
      } catch { /* storage full — ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [step, title, description, remoteType, employmentType, experienceLevel, location, requiredSkills, niceToHaveSkills, requiredKeywords, currency, salaryMin, salaryMax, saving]);

  function restoreDraft() {
    if (!draft) return;
    setTitle(draft.title); setDescription(draft.description);
    setRemoteType(draft.remoteType || "ONSITE");
    setEmploymentType(draft.employmentType ?? "");
    setExperienceLevel(draft.experienceLevel ?? "");
    setLocation(draft.location ?? EMPTY_LOCATION);
    setRequiredSkills(draft.requiredSkills ?? []);
    setNiceToHaveSkills(draft.niceToHaveSkills ?? []);
    setRequiredKeywords(draft.requiredKeywords ?? []);
    setCurrency(draft.currency || "PKR");
    setSalaryMin(draft.salaryMin ?? "");
    setSalaryMax(draft.salaryMax ?? "");
    setStep(Math.min(draft.step, 3));
    setDraft(null);
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraft(null);
  }

  // Per-step validation mirroring the server zod schema
  const stepValid = [
    title.trim().length >= 5 && title.trim().length <= 200 && description.trim().length >= 20 && description.trim().length <= 10000,
    true,
    !(salaryMin && salaryMax && parseInt(salaryMin, 10) > parseInt(salaryMax, 10)),
    true,
  ][step];

  function next() {
    if (!stepValid) { setAttempted(true); return; }
    setAttempted(false);
    setStep((s) => Math.min(s + 1, 3));
  }

  function back() {
    setAttempted(false);
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    setError("");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        remoteType,
        currency: currency.trim() || "PKR",
        requiredSkills,
        niceToHaveSkills,
        requiredKeywords,
      };
      if (employmentType) body.employmentType = employmentType;
      if (experienceLevel) body.experienceLevel = experienceLevel;
      if (salaryMin) body.salaryMin = parseInt(salaryMin, 10);
      if (salaryMax) body.salaryMax = parseInt(salaryMax, 10);
      if (location.country) body.country = location.country;
      if (location.city) body.city = location.city;
      if (location.postCode) body.postCode = location.postCode;
      if (location.companyAddress) body.companyAddress = location.companyAddress;

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; error?: string; details?: unknown; data?: { id: string } };

      if (!res.ok || !json.ok) {
        if (json.details && typeof json.details === "object") {
          const fields = json.details as Record<string, string[]>;
          setError(Object.values(fields).flat().join(". "));
        } else {
          setError(json.error ?? "Something went wrong.");
        }
        setSaving(false);
        return;
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      router.push(`/me/employer/jobs/${json.data!.id}/edit`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  const focusProps = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      (e.currentTarget.style.borderColor = "var(--clay)"),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      (e.currentTarget.style.borderColor = "var(--line)"),
  };

  const employmentTypeLabel = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === employmentType)?.label ?? "—";
  const experienceLevelLabel = EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === experienceLevel)?.label ?? "—";
  const remoteTypeLabel = REMOTE_TYPES.find((o) => o.value === remoteType)?.label ?? remoteType;
  const locationLabel = remoteType === "REMOTE"
    ? "Remote / Worldwide"
    : [location.city, location.country].filter(Boolean).join(", ") || "—";
  const salaryLabel = salaryMin || salaryMax
    ? `${currency} ${salaryMin ? Number(salaryMin).toLocaleString() : "?"} – ${salaryMax ? Number(salaryMax).toLocaleString() : "?"}`
    : "Not disclosed";

  const summaryRow = (label: string, val: string, editStep: number) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", width: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: "var(--ink)", flex: 1, wordBreak: "break-word" }}>{val || "—"}</span>
      <button
        type="button"
        onClick={() => { setStep(editStep); setAttempted(false); }}
        style={{ background: "none", border: "none", color: "var(--clay)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)", padding: 0, flexShrink: 0 }}
      >
        Edit
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--body)" }}>

      {/* Resume draft banner */}
      {draft && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          padding: "12px 16px", background: "rgba(160,78,55,.06)", border: "1px solid var(--clay)",
          borderRadius: 12, marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
            📝 You have an unfinished job posting draft{draft.title ? ` — “${draft.title}”` : ""}. Continue where you left off?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={restoreDraft} style={{ padding: "7px 16px", background: "var(--clay)", color: "var(--white)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)" }}>
              Resume draft
            </button>
            <button type="button" onClick={discardDraft} style={{ padding: "7px 16px", background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)" }}>
              Start fresh
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                background: i < step ? "var(--green)" : i === step ? "var(--clay)" : "var(--paper-2)",
                color: i <= step ? "var(--white)" : "var(--ink-faint)",
                border: i <= step ? "none" : "1.5px solid var(--line)",
                transition: "background .25s, color .25s",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 3, margin: "0 6px", borderRadius: 99, background: "var(--paper-2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "var(--green)", width: i < step ? "100%" : "0%", transition: "width .35s ease" }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 4px" }}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(20px,3.5vw,26px)", color: "var(--ink)", margin: "0 0 6px" }}>
          {STEPS[step].title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
          {STEPS[step].tip}
        </p>
      </div>

      {/* Step content */}
      <div key={step} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp .35s cubic-bezier(.16,1,.3,1)" }}>

        {step === 0 && (
          <>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Job Title <span style={{ color: "var(--clay)" }}>*</span></span>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer" maxLength={200} style={inputStyle} {...focusProps}
              />
              {attempted && (title.trim().length < 5 || title.trim().length > 200) && (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Title must be 5–200 characters.</span>
              )}
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Description <span style={{ color: "var(--clay)" }}>*</span></span>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and requirements…"
                maxLength={10000} rows={8}
                style={textareaStyle} {...focusProps}
              />
              <span style={{ fontSize: 11, color: description.trim().length >= 20 ? "var(--ink-faint)" : "var(--clay)", alignSelf: "flex-end" }}>
                {description.length}/10000{description.trim().length < 20 ? " — at least 20 characters" : ""}
              </span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Employment Type</span>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} style={selectStyle} {...focusProps}>
                  <option value="">Not specified</option>
                  {EMPLOYMENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Experience Level</span>
                <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} style={selectStyle} {...focusProps}>
                  <option value="">Not specified</option>
                  {EXPERIENCE_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Work Type</span>
              <select value={remoteType} onChange={(e) => setRemoteType(e.target.value)} style={selectStyle} {...focusProps}>
                {REMOTE_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </label>
          </>
        )}

        {step === 1 && (
          <JobLocationPicker value={location} onChange={setLocation} remoteType={remoteType} />
        )}

        {step === 2 && (
          <>
            <SkillsChipInput
              label="Required skills"
              value={requiredSkills}
              onChange={setRequiredSkills}
              placeholder="e.g. React, TypeScript…"
            />
            <SkillsChipInput
              label="Nice-to-have skills"
              value={niceToHaveSkills}
              onChange={setNiceToHaveSkills}
              placeholder="e.g. GraphQL, Docker…"
            />
            <SkillsChipInput
              label="Keywords"
              value={requiredKeywords}
              onChange={setRequiredKeywords}
              placeholder="e.g. leadership, agile…"
            />
            <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
              Skills and keywords are used to automatically score and rank candidates. Leave blank to skip scoring.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Currency</span>
                <input
                  type="text" value={currency} onChange={(e) => setCurrency(e.target.value)}
                  maxLength={10} style={inputStyle} {...focusProps}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Min salary</span>
                <input
                  type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                  min={1} placeholder="e.g. 80000" style={inputStyle} {...focusProps}
                />
              </label>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Max salary</span>
                <input
                  type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                  min={1} placeholder="e.g. 150000" style={inputStyle} {...focusProps}
                />
              </label>
            </div>
            {attempted && !stepValid && (
              <span style={{ fontSize: 12, color: "var(--clay)" }}>Min salary cannot be greater than max salary.</span>
            )}
          </>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {summaryRow("Title", title, 0)}
            {summaryRow("Description", description.length > 140 ? `${description.slice(0, 140)}…` : description, 0)}
            {summaryRow("Employment type", employmentTypeLabel, 0)}
            {summaryRow("Experience level", experienceLevelLabel, 0)}
            {summaryRow("Work type", remoteTypeLabel, 0)}
            {summaryRow("Location", locationLabel, 1)}
            {summaryRow("Required skills", requiredSkills.join(", "), 2)}
            {summaryRow("Nice-to-have skills", niceToHaveSkills.join(", "), 2)}
            {summaryRow("Salary", salaryLabel, 2)}

            <div style={{ marginTop: 18, padding: "12px 16px", background: "var(--paper-2)", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
                <strong>Next:</strong> this posting will be saved as a <strong>draft</strong>. You&rsquo;ll be taken to the edit page where you can review everything and publish it when ready.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: "16px 0 0", padding: "10px 14px", background: "rgba(160,78,55,.06)", borderRadius: 9 }}>
          {error}
        </p>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        {step > 0 && (
          <button
            type="button" onClick={back} disabled={saving}
            style={{ padding: "13px 22px", background: "transparent", color: "var(--ink-soft)", border: "1.5px solid var(--line)", borderRadius: 12, fontSize: 15, fontWeight: 600, fontFamily: "var(--body)", cursor: "pointer" }}
          >
            ← Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button" onClick={next}
            style={{
              flex: 1, padding: "13px 0", background: stepValid ? "var(--clay)" : "var(--paper-3)",
              color: stepValid ? "var(--white)" : "var(--ink-faint)", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, fontFamily: "var(--body)", cursor: "pointer",
              transition: "background .2s",
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button" onClick={() => void handleCreate()} disabled={saving}
            style={{
              flex: 1, padding: "13px 0", background: "var(--green)", color: "var(--white)",
              border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "var(--body)",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating your job posting…" : "🎉 Save as draft"}
          </button>
        )}
      </div>
    </div>
  );
}
