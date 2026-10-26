/** Which model files the upload dialog offers, and which of them need a detour first. */

/** Everything the server can turn into a GLB. Keep in step with `SUPPORTED_UPLOAD_FORMATS`. */
const SUPPORTED = [
  'glb',
  'gltf',
  'dae',
  'obj',
  'stl',
  'ply',
  'off',
  '3mf',
  'fbx',
  '3ds',
  'x3d',
  'usd',
  'usda',
  'usdc',
  'usdz',
  'abc',
  'zip',
  'kmz',
];

/**
 * Formats we recognise but nothing on the server can open. They stay in the file picker on
 * purpose: greying a `.skp` out would leave the person guessing, where offering it lets us
 * explain the one export step that fixes it.
 */
const NEEDS_EXPORT = ['skp'];

/** The `accept` attribute for the file input. */
export const MODEL_ACCEPT = [...SUPPORTED, ...NEEDS_EXPORT].map((ext) => `.${ext}`).join(',');

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

/** True when the file has to be exported from its own program before we can read it. */
export function needsExport(file: File | null): boolean {
  return file !== null && NEEDS_EXPORT.includes(extensionOf(file.name));
}
