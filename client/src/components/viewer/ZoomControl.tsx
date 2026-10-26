import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useViewerStore } from '@/store/viewerStore';
import { t } from '@/i18n/he';

/** One press of the plus or minus button moves this fraction of the way along the slider. */
const BUTTON_STEP = 0.06;

/**
 * Zoom as a slider, alongside the wheel.
 *
 * Distance is mapped logarithmically: the same slider movement is the same proportional change
 * whether you are looking at the whole mountain or at one window, which is what feels even.
 */
export function ZoomControl() {
  const cameraApi = useViewerStore((s) => s.cameraApi);
  const distance = useViewerStore((s) => s.cameraDistance);

  const range = cameraApi?.distanceRange();
  const toSlider = useCallback(
    (value: number) => {
      if (!range || value <= 0) return 0;
      const span = Math.log(range.max / range.min);
      return span > 0 ? 1 - Math.log(value / range.min) / span : 0;
    },
    [range],
  );

  const apply = useCallback(
    (position: number) => {
      if (!cameraApi || !range) return;
      const clamped = Math.min(Math.max(position, 0), 1);
      cameraApi.setDistance(range.max * (range.min / range.max) ** clamped, true);
    },
    [cameraApi, range],
  );

  if (!cameraApi || !range) return null;
  const position = toSlider(distance);

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-full glass px-1.5 py-1 h-12">
      <IconButton label={t.viewer.zoomOut} size="sm" onClick={() => apply(position - BUTTON_STEP)}>
        <Minus size={15} />
      </IconButton>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={position}
        aria-label={t.viewer.zoom}
        onChange={(event) => apply(Number(event.target.value))}
        className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-accent focus-ring
          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fg
          [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      />
      <IconButton label={t.viewer.zoomIn} size="sm" onClick={() => apply(position + BUTTON_STEP)}>
        <Plus size={15} />
      </IconButton>
    </div>
  );
}
