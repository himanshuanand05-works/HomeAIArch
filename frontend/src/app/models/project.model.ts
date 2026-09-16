import { PlotSnapshot } from './plot.model';
import { TemplateSnapshot } from './template.model';
import {
  SnapshotBathConnectivity,
  SnapshotKitchen,
  SnapshotMandatory,
  SnapshotRoom,
} from './profile.model';

export interface PrefsSnapshot {
  floors: number;
  rooms: SnapshotRoom[];
  kitchen: SnapshotKitchen;
  bathConnectivity: SnapshotBathConnectivity;
  mandatory: SnapshotMandatory;
  maxCoverage: number | null;
  template: TemplateSnapshot;
}

export interface ProjectModel {
  id: string;
  ownerId: string;
  plotId: string;
  homeProfileId: string | null;
  name: string;
  plotSnapshot: PlotSnapshot;
  prefsSnapshot: PrefsSnapshot;
  status: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  ownerId: string;
  plotId: string;
  homeProfileId: string;
  name?: string;
}
