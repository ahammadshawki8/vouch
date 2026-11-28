export function CheckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg className="draw" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path pathLength={1} d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function HandIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 12V6.5a1.5 1.5 0 013 0V11m0-5.5V5a1.5 1.5 0 013 0v6m0-4.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-.6a5 5 0 01-3.9-1.9L5 15.4a1.6 1.6 0 012.4-2.1L8 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 9L9 3M4 3h5v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
