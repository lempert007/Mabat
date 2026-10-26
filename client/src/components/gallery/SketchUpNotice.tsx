import { FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n/he';

interface SketchUpNoticeProps {
  onPickAnother: () => void;
}

/**
 * Shown instead of starting an upload when someone picks a `.skp`.
 *
 * SketchUp's own format can only be opened by SketchUp, so the server cannot read one however
 * long we wait for it. Saying so here, before a large file goes over the wire, costs a click
 * and saves an upload that was going to fail.
 */
export function SketchUpNotice({ onPickAnother }: SketchUpNoticeProps) {
  const steps = [
    { label: t.upload.sketchup.menuLabel, value: t.upload.sketchup.menuPath },
    { label: t.upload.sketchup.formatLabel, value: t.upload.sketchup.formatList },
  ];

  return (
    <div className="rounded-2xl border border-warning/25 bg-warning-soft/60 p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0 text-warning">
          <FileWarning size={18} strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-3 text-start">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-fg">{t.upload.sketchup.title}</p>
            <p className="text-[13px] leading-relaxed text-fg-2">{t.upload.sketchup.body}</p>
          </div>

          <dl className="flex flex-col gap-1.5 text-[13px]">
            {steps.map((step) => (
              <div key={step.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <dt className="text-fg-3">{step.label}</dt>
                <dd dir="ltr" className="rounded-lg bg-white/6 px-2 py-0.5 font-medium text-fg">
                  {step.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-[13px] leading-relaxed text-fg-2">{t.upload.sketchup.done}</p>
          <div>
            <Button variant="ghost" onClick={onPickAnother}>
              {t.upload.sketchup.pickAnother}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
