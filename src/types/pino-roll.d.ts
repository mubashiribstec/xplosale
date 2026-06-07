declare module "pino-roll" {
  import type { Writable } from "stream";
  interface RollOptions {
    frequency?: "daily" | "hourly" | number;
    mkdir?: boolean;
    size?: string | number;
    dateFormat?: string;
  }
  export function roll(path: string, options?: RollOptions): Promise<Writable>;
}
