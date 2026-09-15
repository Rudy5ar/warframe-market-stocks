export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="h-8 w-48 rounded-sm bg-void-raised" />
      <div className="h-4 w-80 rounded-sm bg-void-raised" />
      <div className="mt-4 h-40 rounded-sm border border-line bg-void-raised" />
    </div>
  );
}
