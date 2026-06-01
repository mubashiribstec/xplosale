export type TemplateVars = {
  "candidate.name"?: string;
  "candidate.email"?: string;
  "job.title"?: string;
  "company.name"?: string;
  "sender.name"?: string;
  [key: string]: string | undefined;
};

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
