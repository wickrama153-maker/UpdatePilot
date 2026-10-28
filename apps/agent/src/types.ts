export interface DiscoveredApp {
  name: string;
  publisher?: string | null;
  installedVersion: string;
  packageId?: string | null;
  source: 'winget' | 'msstore' | 'registry' | 'custom' | 'unknown';
  availableVersion?: string | null;
  updateStatus: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'UNKNOWN' | 'UNSUPPORTED' | 'UNMATCHED';
  publisherUrl?: string | null;
  changelogUrl?: string | null;
  releaseDate?: string | null;
}
