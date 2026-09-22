/** Wire types for the Mabat API. Field names are camelCase, matching the backend aliases. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A rotation. The identity is (0, 0, 0, 1). */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface CameraPose {
  position: Vec3;
  target: Vec3;
}

export type Role = 'editor' | 'guest';

export interface User {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface SessionInfo {
  role: Role;
  user: User | null;
}

/** How the upload is getting on. Set by the server. */
export type ProjectStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

/** Whether the editor considers the project fit to show. */
export type ProjectStage = 'draft' | 'ready';
export type EnvironmentPreset = 'studio' | 'night' | 'dawn';

export interface ProjectSettings {
  /** Turns an uploaded model the right way up. Null means it arrived correctly oriented. */
  modelRotation: Quaternion | null;
  introCamera: CameraPose | null;
  environment: EnvironmentPreset;
  showGrid: boolean;
}

export interface ModelStats {
  triangles?: number;
  vertices?: number;
  boundsMin?: [number, number, number];
  boundsMax?: [number, number, number];
  extents?: [number, number, number];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  stage: ProjectStage;
  errorMessage: string | null;
  sourceFilename: string;
  sourceFormat: string;
  hasModel: boolean;
  modelVersion: string | null;
  hasThumbnail: boolean;
  modelStats: ModelStats;
  settings: ProjectSettings;
  poiCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  settings?: ProjectSettings;
  stage?: ProjectStage;
}

export interface Category {
  id: string;
  projectId: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface Poi {
  id: string;
  projectId: string;
  categoryId: string | null;
  identifier: string;
  title: string;
  summary: string;
  position: Vec3;
  normal: Vec3;
  camera: CameraPose | null;
  blocks: Block[];
  sortOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PoiCreate {
  title?: string;
  identifier?: string;
  summary?: string;
  categoryId?: string | null;
  position: Vec3;
  normal?: Vec3;
  camera?: CameraPose | null;
  blocks?: Block[];
}

export interface PoiUpdate {
  title?: string;
  identifier?: string;
  summary?: string;
  categoryId?: string | null;
  clearCategory?: boolean;
  position?: Vec3;
  normal?: Vec3;
  camera?: CameraPose | null;
  clearCamera?: boolean;
  blocks?: Block[];
}

export type AttachmentKind = 'image' | 'document';

export interface Attachment {
  id: string;
  projectId: string;
  poiId: string | null;
  kind: AttachmentKind;
  filename: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  createdAt: string;
}

/* ---------- Content blocks ---------- */

export interface HeadingBlock {
  id: string;
  type: 'heading';
  text: string;
}

export interface TextBlock {
  id: string;
  type: 'text';
  markdown: string;
}

export interface SpecItem {
  label: string;
  value: string;
}

export interface SpecsBlock {
  id: string;
  type: 'specs';
  items: SpecItem[];
}

export interface TableBlock {
  id: string;
  type: 'table';
  columns: string[];
  rows: string[][];
}

export interface ImageItem {
  attachmentId: string;
  caption: string;
}

export interface ImagesBlock {
  id: string;
  type: 'images';
  items: ImageItem[];
}

export interface DocumentItem {
  attachmentId: string;
  title: string;
}

export interface DocumentsBlock {
  id: string;
  type: 'documents';
  items: DocumentItem[];
}

export interface LinkBlock {
  id: string;
  type: 'link';
  url: string;
  label: string;
}

/** Blocks that carry content. These are what a section is allowed to contain. */
export type ContentBlock =
  | HeadingBlock
  | TextBlock
  | SpecsBlock
  | TableBlock
  | ImagesBlock
  | DocumentsBlock
  | LinkBlock;

/** A named, collapsible group of content blocks. Sections never nest. */
export interface SectionBlock {
  id: string;
  type: 'section';
  title: string;
  defaultOpen: boolean;
  blocks: ContentBlock[];
}

export type Block = ContentBlock | SectionBlock;

export type ContentBlockType = ContentBlock['type'];
export type BlockType = Block['type'];

/* ---------- Moving points between models ---------- */

export interface ExportedCategory {
  name: string;
  color: string;
}

export interface ExportedPoint {
  identifier: string;
  title: string;
  summary: string;
  categoryName: string | null;
  position: Vec3;
  normal: Vec3;
  camera: CameraPose | null;
  blocks: Block[];
}

/** The file produced by export and accepted by import. */
export interface PointsDocument {
  format: 'mabat.points';
  version: number;
  exportedAt: string;
  sourceProjectId: string | null;
  sourceProjectName: string;
  categories: ExportedCategory[];
  points: ExportedPoint[];
}

export type ImportMode = 'append' | 'replace';

export interface ImportResult {
  pointsCreated: number;
  categoriesCreated: number;
  attachmentsCopied: number;
  attachmentsMissing: number;
}
