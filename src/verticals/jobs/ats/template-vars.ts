export type TemplateVars = {
  "candidate.name"?: string;
  "candidate.email"?: string;
  "job.title"?: string;
  "company.name"?: string;
  "sender.name"?: string;
  [key: string]: string | undefined;
};

// Plain-text rendering (use for subject lines)
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// HTML-safe rendering (use for email body HTML to prevent injection)
export function renderTemplateHtml(template: string, vars: TemplateVars): string {
  const escaped: TemplateVars = {};
  for (const key of Object.keys(vars)) {
    escaped[key] = vars[key] != null ? escapeHtml(vars[key]!) : undefined;
  }
  return renderTemplate(template, escaped);
}
