import type { UpdateCheckResult } from "../types";

interface GitHubRelease {
  tag_name?: string;
  name?: string;
  html_url?: string;
  published_at?: string;
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
  }>;
}

export const DEFAULT_UPDATE_FEED_URL =
  import.meta.env.VITE_UPDATE_FEED_URL ??
  "https://api.github.com/repos/sumitkumar-lab/offline-document-summarizer/releases/latest";

export async function checkForUpdates(
  feedUrl: string,
  currentVersion: string,
): Promise<UpdateCheckResult> {
  const normalizedFeedUrl = normalizeGitHubReleaseFeedUrl(feedUrl);
  if (!normalizedFeedUrl) {
    throw new Error("Add a GitHub Releases feed URL before checking for updates.");
  }

  const response = await fetch(normalizedFeedUrl, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error("Could not read the GitHub Releases feed.");
  }

  const release = (await response.json()) as GitHubRelease;
  const latestVersion = release.tag_name?.trim();
  if (!latestVersion) {
    throw new Error("The release feed did not include a version tag.");
  }

  const downloadUrl = pickInstallerDownloadUrl(release);
  return {
    currentVersion,
    latestVersion,
    isUpdateAvailable: isNewerVersion(latestVersion, currentVersion),
    releaseName: release.name || latestVersion,
    releaseUrl: release.html_url || "",
    publishedAt: release.published_at || "",
    downloadUrl,
  };
}

export function normalizeGitHubReleaseFeedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.hostname === "api.github.com") {
      return url.toString();
    }

    if (url.hostname === "github.com") {
      const [owner, repo] = url.pathname.split("/").filter(Boolean);
      if (owner && repo) {
        return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
      }
    }
  } catch {
    return "";
  }

  return "";
}

function pickInstallerDownloadUrl(release: GitHubRelease): string {
  const assets = release.assets ?? [];
  const installer = assets.find((asset) =>
    asset.name?.toLowerCase().endsWith("_x64-setup.exe"),
  );
  const exe = assets.find((asset) => asset.name?.toLowerCase().endsWith(".exe"));
  const msi = assets.find((asset) => asset.name?.toLowerCase().endsWith(".msi"));
  return (
    installer?.browser_download_url ||
    exe?.browser_download_url ||
    msi?.browser_download_url ||
    release.html_url ||
    ""
  );
}

function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  const latest = versionParts(latestVersion);
  const current = versionParts(currentVersion);
  const maxLength = Math.max(latest.length, current.length);

  for (let index = 0; index < maxLength; index += 1) {
    const latestPart = latest[index] ?? 0;
    const currentPart = current[index] ?? 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}

function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}
