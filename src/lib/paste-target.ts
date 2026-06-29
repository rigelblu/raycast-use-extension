import { getFrontmostApplication, type Application } from "@raycast/api";

export type PasteSurface = "default" | "codex-desktop";

type ApplicationIdentity = Pick<Application, "name" | "localizedName" | "path" | "bundleId">;

export function isCodexDesktopApplication(application: Partial<ApplicationIdentity> | undefined): boolean {
  if (!application) return false;

  const fields = [application.name, application.localizedName, application.path, application.bundleId]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return fields.some((field) => /\bcodex\b/.test(field) || field.includes("/codex.app"));
}

export async function detectPasteSurface(): Promise<PasteSurface> {
  try {
    const application = await getFrontmostApplication();
    return isCodexDesktopApplication(application) ? "codex-desktop" : "default";
  } catch {
    return "default";
  }
}
