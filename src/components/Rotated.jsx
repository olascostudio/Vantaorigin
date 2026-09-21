// Reproduces Figma's rotated-layer export: an absolutely positioned bounding
// box (the rotated layer's axis-aligned bounds) with the unrotated layer
// centred inside it and transformed.
export default function Rotated({ box, size, transform, className = "", children }) {
  return (
    <div
      className={`absolute flex items-center justify-center ${className}`}
      style={{ left: box[0], top: box[1], width: box[2], height: box[3] }}
    >
      <div className="flex-none" style={{ transform }}>
        <div className="relative" style={{ width: size[0], height: size[1] }}>
          {children}
        </div>
      </div>
    </div>
  );
}
