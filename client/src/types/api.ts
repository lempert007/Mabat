/**
 * Wire types for the Mabat API, named for how the interface uses them.
 *
 * Every shape here comes from `src/api/schema.d.ts`, which is generated from the server's
 * OpenAPI schema, so a field changed on the server shows up as a type error here rather than as
 * `undefined` at run time. After changing a schema on the server:
 *
 *     cd server && uv run python -m app.cli openapi
 *     cd client && npm run api:types
 *
 * Responses use the `-Output` shapes, where every field is present. Requests use the `-Input`
 * shapes, where anything with a default may be left out.
 */
import type { components } from '@/api/schema';

type Schemas = components['schemas'];

export type Vec3 = Schemas['Vec3'];
/** A rotation. The identity is (0, 0, 0, 1). */
export type Quaternion = Schemas['Quaternion-Output'];
export type CameraPose = Schemas['CameraPose'];

export type User = Schemas['UserOut'];
export type SessionInfo = Schemas['SessionOut'];

export type Project = Schemas['ProjectOut'];
export type ProjectSettings = Schemas['ProjectSettings-Output'];
export type ProjectUpdate = Schemas['ProjectUpdate'];
/** Whether the editor considers the project fit to show. */
export type ProjectStage = Project['stage'];
export type EnvironmentPreset = ProjectSettings['environment'];

/* ---------- The delivery mission ---------- */

export type Mission = Schemas['Mission-Output'];
/** The carrier. */
export type Vehicle = Schemas['Vehicle-Output'];
/** Something on the ground: what the rope brings down, and whatever it brings with it. */
export type Actor = Schemas['Actor-Output'];
export type ActorKind = Actor['kind'];
/** Where an actor is at one moment: it arrives, waits, and moves on. */
export type Keyframe = Schemas['Keyframe-Output'];
export type StageText = Schemas['StageText-Output'];
export type NoiseZone = Schemas['NoiseZone-Output'];
export type CameraShot = NonNullable<StageText['shot']>;
export type MissionModel = Schemas['MissionModelOut'];
/** The keys of `Mission.stages`. OpenAPI states them, but the generator types the map by string. */
export type StageKind = 'takeoff' | 'cruise' | 'approach' | 'lower' | 'onsite' | 'raise' | 'return' | 'land';

/* ---------- Points and their content ---------- */

export type Category = Schemas['CategoryOut'];
export type Poi = Schemas['PoiOut'];
export type PoiCreate = Schemas['PoiCreate'];
export type PoiUpdate = Schemas['PoiUpdate'];
export type Attachment = Schemas['AttachmentOut'];

export type HeadingBlock = Schemas['HeadingBlock-Output'];
export type TextBlock = Schemas['TextBlock-Output'];
export type SpecsBlock = Schemas['SpecsBlock-Output'];
export type TableBlock = Schemas['TableBlock-Output'];
export type ImageItem = Schemas['ImageItem-Output'];
export type ImagesBlock = Schemas['ImagesBlock-Output'];
export type DocumentsBlock = Schemas['DocumentsBlock-Output'];
export type LinkBlock = Schemas['LinkBlock-Output'];
/** A named, collapsible group of content blocks. Sections never nest. */
export type SectionBlock = Schemas['SectionBlock-Output'];
/** Blocks that carry content. These are what a section is allowed to contain. */
export type ContentBlock = SectionBlock['blocks'][number];
export type Block = Poi['blocks'][number];
export type ContentBlockType = ContentBlock['type'];
export type BlockType = Block['type'];

/* ---------- Moving points between models ---------- */

/** The file produced by export and accepted by import. */
export type PointsDocument = Schemas['PointsDocument-Output'];
export type ImportMode = Schemas['ImportRequest']['mode'] & string;
export type ImportResult = Schemas['ImportResult'];
