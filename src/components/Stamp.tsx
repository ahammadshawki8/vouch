/** The one orchestrated moment: an inspection stamp pressed onto the screen when a parcel is sealed. */
export function Stamp({ at, reference }: { at: number; reference: string }) {
  const date = new Date(at).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="stamp-layer" role="status" aria-live="assertive">
      <div className="stamp">
        <div>
          <div className="word">VOUCHED</div>
          <div className="line">{date}</div>
          <div className="line" style={{ maxWidth: 220, marginInline: "auto" }}>
            {reference}
          </div>
        </div>
      </div>
    </div>
  );
}
