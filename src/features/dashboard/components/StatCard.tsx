type StatCardProps = {
  label: string
  hint: string
  accentClassName: string
  value: number | undefined
  isLoading: boolean
}

export function StatCard({
  label,
  hint,
  accentClassName,
  value,
  isLoading,
}: StatCardProps) {
  return (
    <div className="border-border bg-card relative rounded-2xl border p-6 ps-7">
      <span
        className={`absolute inset-y-6 start-0 w-1.5 rounded-full ${accentClassName}`}
        aria-hidden="true"
      />
      <span className="text-muted-foreground text-sm">{label}</span>
      <strong className="text-foreground my-3 block text-3xl font-semibold">
        {isLoading || value === undefined ? "—" : value.toString().padStart(2, "0")}
      </strong>
      <span className="text-muted-foreground text-sm">{hint}</span>
    </div>
  )
}
