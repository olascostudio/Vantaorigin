import { useEffect, useRef, useState } from "react";

// Click anywhere on the text to edit it; Escape cancels, blur or Ctrl+Enter commits.
export default function EditableText({
  value,
  onChange,
  placeholder = "Click to add",
  multiline = false,
  label,
  className = "",
  inputClassName = "",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
    if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      commit();
    }
  };

  if (editing) {
    const Tag = multiline ? "textarea" : "input";
    return (
      <Tag
        ref={ref}
        value={draft}
        aria-label={label}
        rows={multiline ? Math.max(3, draft.split("\n").length + 1) : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={`w-full rounded-lg bg-white/10 px-4 py-2.5 font-ui text-inherit text-white outline-none ring-2 ring-[#6b8ff5] ${inputClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Edit ${label}`}
      className={`w-full rounded-lg px-4 py-2.5 text-left transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b8ff5] ${className} ${
        value ? "" : "text-neutral-400"
      }`}
    >
      {value ? (
        multiline ? (
          <span className="block whitespace-pre-line">{value}</span>
        ) : (
          value
        )
      ) : (
        placeholder
      )}
    </button>
  );
}
