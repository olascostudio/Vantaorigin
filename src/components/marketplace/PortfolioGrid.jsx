import { useEffect, useMemo, useState } from "react";
import portfolio from "../../data/portfolio.json";

// Cards come from data/portfolio.json, which the ArtStation sync rewrites.
// Shape per project: { id, title, artist, albumId, album, description,
// permalink, cover, images[], publishedAt, likes }.

const PAGE_SIZE = 12;

function Lightbox({ project, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const images = project.images.length ? project.images : [project.cover].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-10 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={project.title}
        className="w-full max-w-[1000px] overflow-hidden rounded-2xl bg-[#222c40]"
      >
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <h3 className="font-ui text-xl font-bold text-white">{project.title}</h3>
            <p className="mt-1 font-ui text-base text-accent">By: {project.artist}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6">
          {images.map((image) => (
            <img key={image} src={image} alt="" className="w-full rounded-xl" loading="lazy" />
          ))}
        </div>

        {project.description && (
          <p className="px-6 pt-6 font-ui text-base leading-relaxed text-neutral-200">
            {project.description}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <a
            href={project.permalink}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-7 py-2.5 font-ui text-base font-bold text-white hover:opacity-90"
          >
            View on ArtStation
          </a>
          <p className="font-ui text-sm text-neutral-400">
            {new Date(project.publishedAt).toLocaleDateString()} · {project.likes} likes
          </p>
        </div>
      </div>
    </div>
  );
}

function Card({ project, onOpen }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(project)}
        className="group flex w-full flex-col overflow-hidden rounded-2xl bg-[#2b3547] text-left transition-transform hover:-translate-y-1"
        data-testid="portfolio-card"
      >
        <div className="aspect-square w-full overflow-hidden bg-[#1b2233]">
          {project.cover ? (
            <img
              src={project.cover}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-ui text-sm text-neutral-400">
              No preview
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="line-clamp-2 font-ui text-base font-bold text-white">{project.title}</p>
          <p className="font-ui text-sm text-accent">By: {project.artist}</p>
          <p className="mt-auto pt-2 font-ui text-xs text-neutral-400">{project.album}</p>
        </div>
      </button>
    </li>
  );
}

export default function PortfolioGrid({ albumId, artist, query, albumUrl }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(null);

  const projects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return portfolio.projects.filter((project) => {
      const matchesAlbum = !albumId || project.albumId === albumId;
      const matchesArtist = !artist || project.artist === artist;
      const matchesTerm =
        !term ||
        project.title.toLowerCase().includes(term) ||
        project.artist.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term);
      return matchesAlbum && matchesArtist && matchesTerm;
    });
  }, [albumId, artist, query]);

  useEffect(() => setVisible(PAGE_SIZE), [albumId, artist, query]);

  if (!projects.length) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 px-5 pb-10 text-center">
        <p className="font-ui text-xl font-bold text-white">Nothing here yet</p>
        <p className="font-ui text-base text-neutral-400">
          {query
            ? `No work matches “${query}”.`
            : "New work added to this album on ArtStation lands here automatically."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-10">
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.slice(0, visible).map((project) => (
          <Card key={project.id} project={project} onOpen={setOpen} />
        ))}
      </ul>

      {visible < projects.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-full border border-white/25 px-8 py-3 font-ui text-base font-bold text-white hover:bg-white/10"
          >
            Load more ({projects.length - visible} left)
          </button>
        </div>
      )}

      <p className="mt-8 text-center font-ui text-xs text-neutral-500">
        Synced from{" "}
        <a
          href={albumUrl || portfolio.profile}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-neutral-300"
        >
          ArtStation
        </a>{" "}
        · {new Date(portfolio.syncedAt).toLocaleString()}
      </p>

      {open && <Lightbox project={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
