import { Component, Suspense, lazy, useState } from "react";

// The rich text editor, with a way through when it does not arrive.
//
// The editor is about a megabyte and a half and is fetched the first time a
// writing screen opens. That download can fail: a slow connection, a blocked
// script, a bad moment. Before this, a failure left an empty bordered box on
// screen and said nothing at all, which looks exactly like a broken page and
// leaves no way to write.
//
// So two things. The plain HTML box is always one click away, whether or not
// the editor is working, because somebody with their article already written
// as HTML should not have to go through a toolbar to paste it. And if the
// editor does fail to load, this falls back to that box and says why, rather
// than leaving a hole.
const RichText = lazy(() => import("./RichText.jsx"));

class Rescue extends Component {
  state = { broken: false };

  static getDerivedStateFromError() {
    return { broken: true };
  }

  componentDidCatch(error) {
    this.props.onBroken?.(error);
  }

  render() {
    return this.state.broken ? null : this.props.children;
  }
}

const tab = (on) =>
  `rounded-full px-4 py-1.5 font-ui text-sm transition-colors ${
    on ? "bg-white text-black" : "bg-white/10 text-neutral-300 hover:text-white"
  }`;

export default function Writing({
  value,
  onChange,
  folder = "blog",
  height = 560,
  placeholder = "Start writing…",
}) {
  const [wanted, setWanted] = useState("rich");
  const [broken, setBroken] = useState(false);

  // A failed editor is not a choice, so it overrides whatever was picked.
  const showing = broken ? "html" : wanted;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setWanted("rich")}
          aria-pressed={showing === "rich"}
          disabled={broken}
          className={`${tab(showing === "rich")} disabled:opacity-40`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setWanted("html")}
          aria-pressed={showing === "html"}
          className={tab(showing === "html")}
        >
          Paste HTML
        </button>
      </div>

      {broken && (
        <p role="alert" className="mb-2 font-ui text-sm text-[#ffb4c4]">
          The editor would not load, so here is the plain box instead. Your writing is safe;
          paste or type HTML and save as normal. Reloading the page often fixes the editor.
        </p>
      )}

      {showing === "html" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          style={{ height }}
          placeholder="<h2>A heading</h2>&#10;<p>And a paragraph under it.</p>"
          aria-label="The article, as HTML"
          className="w-full resize-y rounded-xl border border-white/15 bg-[#0b0f18] p-4 font-mono text-[13px] leading-relaxed text-neutral-200 focus:border-primary focus:outline-none"
        />
      ) : (
        <Rescue onBroken={() => setBroken(true)}>
          <Suspense
            fallback={
              <div
                className="flex flex-col items-center justify-center gap-2 text-center"
                style={{ height }}
              >
                <p className="font-ui text-base text-white">Getting the editor ready…</p>
                <p className="font-ui text-sm text-neutral-400">
                  It is a large download the first time. Paste HTML works straight away.
                </p>
              </div>
            }
          >
            <RichText
              value={value}
              onChange={onChange}
              folder={folder}
              height={height}
              placeholder={placeholder}
            />
          </Suspense>
        </Rescue>
      )}
    </div>
  );
}
