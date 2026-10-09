export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className={`logo logo--${size}`} role="img" aria-label="StudyLoop">
      <span className="logo__a" aria-hidden>
        Study
      </span>
      <span className="logo__b" aria-hidden>
        Loop
      </span>
    </span>
  );
}
