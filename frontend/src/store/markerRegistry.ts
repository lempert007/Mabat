/**
 * DOM elements for 3D markers, keyed by point id.
 * Lives outside React state so the projector can update transforms every frame without re-rendering.
 */
const elements = new Map<string, HTMLElement>();

export const markerRegistry = {
  register(id: string, element: HTMLElement | null) {
    if (element) elements.set(id, element);
    else elements.delete(id);
  },
  get(id: string) {
    return elements.get(id);
  },
  entries() {
    return elements.entries();
  },
};
