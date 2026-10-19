"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  Eye,
  FileText,
  GripVertical,
  Link2,
  Loader2,
  MonitorPlay,
  Plus,
  Rocket,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { AreaField, ColorField, LinesField, Select, TextField, Toggle } from "@/components/admin/fields";
import { cn, formatPaise } from "@/lib/utils";
import { formatDuration, parseYouTubeId } from "../logic";
import type { CourseDraft } from "../schema";
import { CATEGORIES, LEVELS, type CourseStatus, type Lecture, type Section, type VideoSource } from "../types";
import { mediaUrl } from "../urls";
import { CourseCover, ProgressBar } from "./bits";
import { rpc } from "@/lib/rpc";

export interface StudentRow {
  name: string;
  enrolledAt: string;
  progress: number;
  paid: number;
}

export interface EditorProps {
  id: string;
  slug: string;
  status: CourseStatus;
  initial: CourseDraft;
  students: StudentRow[];
}

const PALETTES: [string, string][] = [
  ["#ff8a00", "#ff4d6d"],
  ["#5b47ff", "#00c2ff"],
  ["#00b89c", "#7ddc5a"],
  ["#c04dff", "#ff4da6"],
  ["#2ee6c5", "#5b47ff"],
  ["#ffb800", "#ff5e3a"],
  ["#3d8bff", "#2ee6c5"],
  ["#15132b", "#5b47ff"],
];

type Tab = "details" | "curriculum" | "students";
type Msg = { ok: boolean; text: string; problems?: string[] } | null;

const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  return copy;
};

export function CourseEditor({ id, slug, status: initialStatus, initial, students }: EditorProps) {
  const router = useRouter();
  // The editor owns its state after load, so saves never need a router.refresh()
  // (an aborted refresh inside a transition could leave the buttons stuck pending).
  const [status, setStatus] = useState(initialStatus);
  const [draft, setDraft] = useState<CourseDraft>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<Tab>("details");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(draft) !== saved;

  const patch = (p: Partial<CourseDraft>) => setDraft((d) => ({ ...d, ...p }));

  const save = async (): Promise<boolean> => {
    const res = await rpc("teach.save", id, draft);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error ?? "Couldn't save", problems: res.problems });
      return false;
    }
    setSaved(JSON.stringify(draft));
    return true;
  };

  const onSave = () =>
    start(async () => {
      if (await save()) setMsg({ ok: true, text: "Saved" });
    });

  const onStatus = (next: "published" | "draft") =>
    start(async () => {
      if (dirty && !(await save())) return;
      const res = await rpc("teach.status", id, next);
      setMsg(res.ok ? { ok: true, text: next === "published" ? "Published! It's live in the catalog." : "Unpublished. It's hidden from the catalog." } : { ok: false, text: res.error ?? "Failed", problems: res.problems });
      if (res.ok) setStatus(next);
    });

  const onDelete = () => {
    if (!confirm("Delete this course? This can't be undone.")) return;
    start(async () => {
      const res = await rpc("teach.delete", id);
      if (res.ok) router.push("/courses/teach");
      else setMsg({ ok: false, text: res.error ?? "Couldn't delete" });
    });
  };

  const lectureCount = draft.sections.reduce((s, x) => s + x.lectures.length, 0);

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <Link href="/courses/teach" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> All my courses
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 truncate font-display text-3xl font-bold tracking-tight sm:text-4xl">{draft.title || "Untitled course"}</h1>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold capitalize", status === "published" ? "bg-teal/15 text-teal" : "bg-saffron/15 text-saffron")}>{status}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="glass inline-flex rounded-2xl p-1">
          {(["details", "curriculum", "students"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("relative rounded-xl px-4 py-2 text-sm font-semibold capitalize", tab === t ? "text-bg" : "text-muted hover:text-fg")}
            >
              {tab === t && <motion.span layoutId="editor-tab" className="absolute inset-0 rounded-xl bg-fg" />}
              <span className="relative">
                {t}
                {t === "curriculum" && ` (${lectureCount})`}
                {t === "students" && ` (${students.length})`}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Link href={`/courses/${slug}`} className="glass flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold">
            <Eye className="size-4" /> Preview
          </Link>
          <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-xl border border-rose/40 px-3.5 py-2 text-sm font-semibold text-rose hover:bg-rose/10">
            <Trash2 className="size-4" /> Delete
          </button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn("mt-5 rounded-2xl border p-4 text-sm", msg.ok ? "border-teal/40 bg-teal/10" : "border-rose/40 bg-rose/10")}
          >
            <p className="flex items-center gap-2 font-semibold">
              {msg.ok ? <Check className="size-4 text-teal" /> : <CircleAlert className="size-4 text-rose" />} {msg.text}
            </p>
            {msg.problems && (
              <ul className="mt-2 list-disc space-y-0.5 pl-10">
                {msg.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6">
        {tab === "details" && <DetailsTab draft={draft} patch={patch} />}
        {tab === "curriculum" && <CurriculumTab courseId={id} sections={draft.sections} update={(fn) => setDraft((d) => ({ ...d, sections: fn(d.sections) }))} />}
        {tab === "students" && <StudentsTab students={students} />}
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-3 bottom-3 z-40 lg:left-[300px]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-line bg-card-solid/95 p-3 shadow-2xl backdrop-blur">

          <p className="flex-1 text-sm text-muted">{dirty ? "You have unsaved changes" : "All changes saved"}</p>
          {dirty && (
            <button type="button" onClick={() => setDraft(JSON.parse(saved))} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:text-fg">
              <Undo2 className="size-4" /> Discard
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={pending || !dirty}
            className="flex items-center gap-1.5 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-bg disabled:opacity-40"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
          </button>
          {status === "published" ? (
            <button type="button" onClick={() => onStatus("draft")} disabled={pending} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5">
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStatus("published")}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-saffron via-rose to-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Rocket className="size-4" /> Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Details ---------------- */

function DetailsTab({ draft, patch }: { draft: CourseDraft; patch: (p: Partial<CourseDraft>) => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="glass grid gap-4 rounded-[24px] p-5 sm:p-6">
        <TextField label="Title" value={draft.title} onChange={(title) => patch({ title })} maxLength={120} />
        <TextField label="Subtitle" hint="One line that sells it" value={draft.subtitle} onChange={(subtitle) => patch({ subtitle })} maxLength={200} />
        <AreaField label="Description" hint="Min 30 characters to publish" rows={6} value={draft.description} onChange={(description) => patch({ description })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Category" value={draft.category} options={CATEGORIES} onChange={(category) => patch({ category })} />
          <Select label="Level" value={draft.level} options={LEVELS} onChange={(level) => patch({ level })} />
          <TextField label="Language" value={draft.language} onChange={(language) => patch({ language })} maxLength={30} />
        </div>
        <TextField
          label="Price (₹)"
          hint="0 makes it free"
          type="number"
          min={0}
          max={100000}
          value={String(draft.priceRupees)}
          onChange={(v) => patch({ priceRupees: Math.max(0, Math.floor(Number(v) || 0)) })}
        />
        <LinesField label="What learners will achieve" hint="One outcome per line (up to 12)" value={draft.outcomes} onChange={(outcomes) => patch({ outcomes: outcomes.slice(0, 12) })} />
      </div>

      <div className="space-y-4">
        <div className="glass overflow-hidden rounded-[24px]">
          <CourseCover colors={draft.colors} category={draft.category} big className="aspect-video" />
          <div className="p-4">
            <p className="line-clamp-2 font-display font-bold">{draft.title || "Untitled course"}</p>
            <p className="mt-1 font-display text-xl font-bold">{draft.priceRupees ? formatPaise(draft.priceRupees * 100) : <span className="text-teal">Free</span>}</p>
          </div>
        </div>
        <div className="glass grid gap-3 rounded-[24px] p-5">
          <p className="text-sm font-semibold">Cover colours</p>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.join()}
                type="button"
                aria-label={`Use ${p.join(" and ")}`}
                onClick={() => patch({ colors: p })}
                className={cn("size-9 rounded-xl ring-offset-2 ring-offset-bg transition-transform hover:scale-110", draft.colors.join() === p.join() && "ring-2 ring-fg")}
                style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}
              />
            ))}
          </div>
          <ColorField label="From" value={draft.colors[0]} onChange={(v) => patch({ colors: [v, draft.colors[1]] })} />
          <ColorField label="To" value={draft.colors[1]} onChange={(v) => patch({ colors: [draft.colors[0], v] })} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Curriculum ---------------- */

const newLecture = (): Lecture => ({ id: crypto.randomUUID(), title: "New lecture", durationSec: 0, video: null, notes: null, preview: false });

type SectionsUpdate = (fn: (all: Section[]) => Section[]) => void;

/**
 * Every change is applied to the latest state by id (never to a captured copy),
 * so async work (uploads, duration probes) can't undo edits made meanwhile.
 */
function CurriculumTab({ courseId, sections, update }: { courseId: string; sections: Section[]; update: SectionsUpdate }) {
  const editSection = (id: string, fn: (s: Section) => Section) => update((all) => all.map((s) => (s.id === id ? fn(s) : s)));
  const moveSection = (id: string, dir: -1 | 1) => update((all) => move(all, all.findIndex((s) => s.id === id), dir));
  const editLectures = (sectionId: string, fn: (ls: Lecture[]) => Lecture[]) => editSection(sectionId, (s) => ({ ...s, lectures: fn(s.lectures) }));
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <motion.div key={s.id} layout className="glass rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 shrink-0 text-muted" />
            <span className="text-xs font-bold text-muted">Section {i + 1}</span>
            <label className="sr-only" htmlFor={`sec-${s.id}`}>
              Section title
            </label>
            <input
              id={`sec-${s.id}`}
              value={s.title}
              onChange={(e) => {
                const title = e.target.value;
                editSection(s.id, (x) => ({ ...x, title }));
              }}
              maxLength={120}
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-lg font-bold outline-none hover:border-line focus:border-primary"
            />
            <IconBtn label="Move section up" disabled={i === 0} onClick={() => moveSection(s.id, -1)}>
              <ArrowUp className="size-4" />
            </IconBtn>
            <IconBtn label="Move section down" disabled={i === sections.length - 1} onClick={() => moveSection(s.id, 1)}>
              <ArrowDown className="size-4" />
            </IconBtn>
            <IconBtn
              label="Delete section"
              danger
              onClick={() => (s.lectures.length === 0 || confirm(`Delete "${s.title}" and its ${s.lectures.length} lectures?`)) && update((all) => all.filter((x) => x.id !== s.id))}
            >
              <Trash2 className="size-4" />
            </IconBtn>
          </div>

          <ul className="mt-3 space-y-2">
            {s.lectures.map((l, li) => (
              <LectureRow
                key={l.id}
                courseId={courseId}
                lecture={l}
                index={li}
                count={s.lectures.length}
                onPatch={(p) => editLectures(s.id, (ls) => ls.map((x) => (x.id === l.id ? { ...x, ...p } : x)))}
                onMove={(dir) => editLectures(s.id, (ls) => move(ls, ls.findIndex((x) => x.id === l.id), dir))}
                onDelete={() => editLectures(s.id, (ls) => ls.filter((x) => x.id !== l.id))}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => editLectures(s.id, (ls) => [...ls, newLecture()])}
            className="mt-3 flex items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-semibold text-muted hover:border-primary hover:text-fg"
          >
            <Plus className="size-4" /> Add lecture
          </button>
        </motion.div>
      ))}
      <button
        type="button"
        onClick={() => update((all) => [...all, { id: crypto.randomUUID(), title: `Section ${all.length + 1}`, lectures: [] }])}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line py-5 font-semibold text-muted hover:border-primary hover:text-fg"
      >
        <Plus className="size-5" /> Add section
      </button>
    </div>
  );
}

function LectureRow({
  courseId,
  lecture: l,
  index,
  count,
  onPatch,
  onMove,
  onDelete,
}: {
  courseId: string;
  lecture: Lecture;
  index: number;
  count: number;
  /** Merges only the changed fields into the latest copy of this lecture. */
  onPatch: (p: Partial<Lecture>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(!l.video);
  return (
    <li className="rounded-2xl border border-line bg-card">
      <div className="flex items-center gap-2 p-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Edit lecture" className="grid size-8 place-items-center rounded-lg hover:bg-fg/5">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <span className="text-xs text-muted tabular-nums">{index + 1}.</span>
        <label className="sr-only" htmlFor={`lec-${l.id}`}>
          Lecture title
        </label>
        <input
          id={`lec-${l.id}`}
          value={l.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          maxLength={120}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-semibold outline-none focus:bg-fg/5"
        />
        {!l.video && <span className="rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-bold text-rose">No video</span>}
        {l.preview && <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">Preview</span>}
        <span className="hidden w-12 text-right text-xs text-muted sm:block">{l.durationSec ? formatDuration(l.durationSec) : "—"}</span>
        <IconBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-3.5" />
        </IconBtn>
        <IconBtn label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-3.5" />
        </IconBtn>
        <IconBtn label="Delete lecture" danger onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </IconBtn>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-4 border-t border-line p-4">
              <VideoField courseId={courseId} video={l.video} onChange={(video, durationSec) => onPatch(durationSec === undefined ? { video } : { video, durationSec })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <DurationField value={l.durationSec} onChange={(durationSec) => onPatch({ durationSec })} />
                <NotesField courseId={courseId} notes={l.notes} onChange={(notes) => onPatch({ notes })} />
              </div>
              <Toggle label="Free preview" description="Anyone can watch this lecture before buying" checked={l.preview} onChange={(preview) => onPatch({ preview })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Reads a video's length from its metadata (works for uploads via object URLs and for direct links). */
function probeDuration(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (n: number | null) => {
      clearTimeout(t);
      v.removeAttribute("src");
      v.load();
      resolve(n);
    };
    const t = setTimeout(() => done(null), 10_000);
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => done(null);
    v.src = src;
  });
}

function upload(courseId: string, kind: "video" | "pdf", file: File, onProgress: (p: number) => void): Promise<{ file?: string; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/courses/upload?courseId=${courseId}&kind=${kind}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        resolve(xhr.status === 200 ? { file: body.file } : { error: body.error ?? "Upload failed" });
      } catch {
        resolve({ error: "Upload failed" });
      }
    };
    xhr.onerror = () => resolve({ error: "Network error during upload" });
    xhr.send(file);
  });
}

function VideoField({ courseId, video, onChange }: { courseId: string; video: VideoSource | null; onChange: (v: VideoSource | null, durationSec?: number) => void }) {
  const [mode, setMode] = useState<VideoSource["kind"]>(video?.kind ?? "youtube");
  const [text, setText] = useState(video?.kind === "youtube" ? `https://youtu.be/${video.src}` : video?.kind === "url" ? video.src : "");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const applyText = async (value: string) => {
    setText(value);
    setError(null);
    if (!value.trim()) return onChange(null);
    if (mode === "youtube") {
      const id = parseYouTubeId(value);
      if (!id) return setError("That doesn't look like a YouTube link");
      onChange({ kind: "youtube", src: id });
    } else {
      if (!/^https:\/\/\S+$/.test(value.trim())) return setError("Paste a full https:// link to an MP4 or WebM file");
      onChange({ kind: "url", src: value.trim() });
      const d = await probeDuration(value.trim());
      if (d) onChange({ kind: "url", src: value.trim() }, d);
    }
  };

  const onFile = async (file: File) => {
    setError(null);
    if (!["video/mp4", "video/webm"].includes(file.type)) return setError("Choose an MP4 or WebM video");
    const local = URL.createObjectURL(file);
    const duration = await probeDuration(local);
    URL.revokeObjectURL(local);
    setProgress(0);
    const res = await upload(courseId, "video", file, setProgress);
    setProgress(null);
    if (res.error || !res.file) return setError(res.error ?? "Upload failed");
    onChange({ kind: "upload", src: res.file }, duration ?? undefined);
  };

  const tabs = [
    { k: "youtube" as const, label: "YouTube", icon: MonitorPlay },
    { k: "url" as const, label: "Video link", icon: Link2 },
    { k: "upload" as const, label: "Upload", icon: Upload },
  ];

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">Video</p>
      <div className="mb-2 inline-flex rounded-xl border border-line p-0.5">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => {
              setMode(t.k);
              setError(null);
            }}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold", mode === t.k ? "bg-fg text-bg" : "text-muted hover:text-fg")}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {mode === "upload" ? (
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <button
            type="button"
            disabled={progress !== null}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50"
          >
            <Upload className="size-4" /> {video?.kind === "upload" ? "Replace video" : "Choose video (MP4/WebM, up to 300 MB)"}
          </button>
          {progress !== null && (
            <div className="flex min-w-40 flex-1 items-center gap-2">
              <ProgressBar value={progress} className="flex-1" />
              <span className="text-xs tabular-nums">{progress}%</span>
            </div>
          )}
          {video?.kind === "upload" && progress === null && (
            <a href={mediaUrl(courseId, video.src)} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm font-semibold text-teal">
              <Check className="size-4" /> Uploaded · play
            </a>
          )}
        </div>
      ) : (
        <input
          value={text}
          onChange={(e) => applyText(e.target.value)}
          placeholder={mode === "youtube" ? "https://youtu.be/… (unlisted works)" : "https://…/lecture.mp4"}
          className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
      )}
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
      {mode === "youtube" && <p className="mt-1.5 text-xs text-muted">YouTube links can be shared outside Glideinbir. Upload videos you want to keep paid-only.</p>}
    </div>
  );
}

function DurationField({ value, onChange }: { value: number; onChange: (sec: number) => void }) {
  const m = Math.floor(value / 60);
  const s = value % 60;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">Duration</p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2">
          <input type="number" min={0} max={600} aria-label="Minutes" value={m} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0) * 60 + s)} className="w-14 bg-transparent text-sm outline-none" />
          <span className="text-xs text-muted">min</span>
        </label>
        <label className="flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2">
          <input type="number" min={0} max={59} aria-label="Seconds" value={s} onChange={(e) => onChange(m * 60 + Math.min(59, Math.max(0, Number(e.target.value) || 0)))} className="w-12 bg-transparent text-sm outline-none" />
          <span className="text-xs text-muted">sec</span>
        </label>
      </div>
    </div>
  );
}

function NotesField({ courseId, notes, onChange }: { courseId: string; notes: Lecture["notes"]; onChange: (n: Lecture["notes"]) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">Notes (PDF)</p>
      <input
        ref={ref}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setError(null);
          if (f.type !== "application/pdf") return setError("Choose a PDF");
          setBusy(0);
          const res = await upload(courseId, "pdf", f, setBusy);
          setBusy(null);
          if (res.error || !res.file) return setError(res.error ?? "Upload failed");
          onChange({ src: res.file, name: f.name.slice(0, 120) });
        }}
      />
      {notes ? (
        <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
          <FileText className="size-4 shrink-0 text-saffron" />
          <a href={mediaUrl(courseId, notes.src)} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate hover:underline">
            {notes.name}
          </a>
          <button type="button" onClick={() => onChange(null)} className="text-muted hover:text-rose" aria-label="Remove notes">
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy !== null} onClick={() => ref.current?.click()} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-fg/5 disabled:opacity-50">
          {busy !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {busy !== null ? `Uploading ${busy}%` : "Attach PDF (up to 25 MB)"}
        </button>
      )}
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
    </div>
  );
}

function IconBtn({ label, danger, children, ...props }: { label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-muted disabled:opacity-25", danger ? "hover:bg-rose/10 hover:text-rose" : "hover:bg-fg/5 hover:text-fg")}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Students ---------------- */

function StudentsTab({ students }: { students: StudentRow[] }) {
  const sorted = useMemo(() => [...students].sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)), [students]);
  if (!students.length)
    return (
      <div className="glass rounded-[24px] px-6 py-14 text-center">
        <p className="font-display text-xl font-bold">No students yet</p>
        <p className="mt-1 text-sm text-muted">Publish the course and share its link to get your first learners.</p>
      </div>
    );
  return (
    <div className="glass overflow-x-auto rounded-[24px] p-5">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-muted uppercase">
          <tr>
            <th className="pb-3 font-semibold">Learner</th>
            <th className="pb-3 font-semibold">Enrolled</th>
            <th className="pb-3 font-semibold">Paid</th>
            <th className="pb-3 font-semibold">Progress</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((s, i) => (
            <tr key={i}>
              <td className="py-3 font-semibold">{s.name}</td>
              <td className="py-3 text-muted">{new Date(s.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td className="py-3">{s.paid ? formatPaise(s.paid) : "Free"}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <ProgressBar value={s.progress} className="w-28" />
                  <span className="text-xs tabular-nums">{s.progress}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
