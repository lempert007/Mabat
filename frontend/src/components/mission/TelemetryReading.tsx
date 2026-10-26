/** One line of the ground station's readout: what it is, and its value in its unit. */
export function TelemetryReading({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-fg-3">{label}</dt>
      <dd className="text-[15px] font-semibold tabular-nums tracking-tight">
        <bdi>{value}</bdi>
        <span className="ms-1 text-[11px] font-normal text-fg-3">{unit}</span>
      </dd>
    </div>
  );
}
