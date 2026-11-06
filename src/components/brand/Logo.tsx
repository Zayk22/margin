export function Logo({ showWordmark = true, className = "" }: { showWordmark?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-text ${className}`}>
      <svg viewBox="0 0 64 64" fill="currentColor" className="h-7 w-7 shrink-0" aria-hidden="true">
        <path 
          fillRule="evenodd" 
          d="M16,0 h32 a16,16 0 0 1 16,16 v32 a16,16 0 0 1 -16,16 h-32 a16,16 0 0 1 -16,-16 v-32 a16,16 0 0 1 16,-16 z 
             M20,16 v32 h4 V16 z 
             M28,30 h16 v4 h-16 z" 
        />
      </svg>
      {showWordmark && (
        <span className="font-heading text-xl font-bold tracking-tight">Margin</span>
      )}
    </div>
  );
}