export default function SectionHeading({ title, subtitle, subtitleClassName = "text-lg" }) {
  return (
    <div className="flex flex-col items-center gap-[30px] text-center">
      <h2 className="font-display text-2xl uppercase text-white sm:text-[30px]">{title}</h2>
      {subtitle && (
        <p className={`max-w-[800px] font-ui text-subtext ${subtitleClassName}`}>{subtitle}</p>
      )}
    </div>
  );
}
