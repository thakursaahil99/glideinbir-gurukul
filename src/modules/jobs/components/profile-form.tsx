"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CloudUpload, Eye, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { rpc } from "@/lib/rpc";
import { cn } from "@/lib/utils";
import { EXP_LABEL } from "../logic";
import { EXPERIENCE, type Experience, type SeekerProfile } from "../types";
import { GRADIENT, INPUT, Notice, SkillInput } from "./bits";

const SUGGESTED = ["JavaScript", "Python", "React", "Node", "Java", "C++", "SQL", "Excel", "Communication", "Figma", "Data analysis", "Machine learning", "HTML", "CSS", "Git"];

export function ProfileForm({ initial, name, next }: { initial: SeekerProfile | null; name: string; next: string | null }) {
  const router = useRouter();
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [experience, setExperience] = useState<Experience>(initial?.experience ?? "fresher");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [links, setLinks] = useState(initial?.links ?? {});
  const [resume, setResume] = useState(initial?.resume ?? null);
  const [upload, setUpload] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const steps = [!!headline.trim(), skills.length > 0, !!resume];
  const done = steps.filter(Boolean).length;

  function uploadResume(file: File) {
    if (file.type !== "application/pdf") return setMsg({ ok: false, text: "Upload your resume as a PDF" });
    setMsg(null);
    setUpload(0);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/jobs/resume?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.upload.onprogress = (e) => e.lengthComputable && setUpload(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setUpload(null);
      let data: { ok?: boolean; name?: string; bytes?: number; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
        setResume({ file: "", name: data.name ?? file.name, bytes: data.bytes ?? file.size, updatedAt: new Date().toISOString() });
        setMsg({ ok: true, text: "Resume uploaded." });
      } else setMsg({ ok: false, text: data.error ?? "Upload failed" });
    };
    xhr.onerror = () => {
      setUpload(null);
      setMsg({ ok: false, text: "Network error. Check your connection." });
    };
    xhr.send(file);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await rpc("jobs.profile", { headline, skills, experience, location, about, links });
      if (res.ok) {
        if (next && resume) return router.push(next);
        setMsg({ ok: true, text: resume ? "Profile saved. You can apply in one click now." : "Profile saved. Upload your resume to start applying." });
      } else setMsg({ ok: false, text: res.error });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <section className="glass space-y-4 rounded-[26px] p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Headline</span>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} placeholder="Final-year B.Tech CSE · React & Node developer" className={INPUT} />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Skills</span>
            <SkillInput value={skills} onChange={setSkills} suggestions={SUGGESTED} />
            <p className="mt-1 text-xs text-muted">Jobs show how many of their skills you have. Be honest: recruiters check.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Experience</span>
              <select value={experience} onChange={(e) => setExperience(e.target.value as Experience)} className={INPUT}>
                {EXPERIENCE.map((x) => (
                  <option key={x} value={x}>
                    {EXP_LABEL[x]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Bengaluru" className={INPUT} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">About you</span>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={4} maxLength={1500} placeholder="Projects, achievements, what you're looking for." className={INPUT} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["linkedin", "github", "portfolio"] as const).map((k) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted capitalize">{k}</span>
                <input value={links[k] ?? ""} onChange={(e) => setLinks((l) => ({ ...l, [k]: e.target.value }))} placeholder="https://…" className={INPUT} />
              </label>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="glass rounded-[26px] p-5">
          <p className="font-display text-lg font-bold">{name}</p>
          <p className="text-xs text-muted">Profile {done}/3 complete</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10">
            <motion.div className={cn("h-full", GRADIENT)} animate={{ width: `${(done / 3) * 100}%` }} transition={{ duration: 0.6 }} />
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {["Headline", "Skills", "Resume"].map((s, i) => (
              <li key={s} className={cn("flex items-center gap-2", steps[i] ? "" : "text-muted")}>
                <CheckCircle2 className={cn("size-4", steps[i] ? "text-teal" : "text-fg/20")} /> {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="glass rounded-[26px] p-5">
          <p className="text-sm font-semibold">Resume (PDF, max 5 MB)</p>
          <input ref={fileRef} type="file" accept="application/pdf" hidden aria-label="Upload resume" onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])} />
          {upload !== null ? (
            <div className="mt-3">
              <p className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Uploading… {upload}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
                <motion.div className={cn("h-full", GRADIENT)} animate={{ width: `${upload}%` }} />
              </div>
            </div>
          ) : resume ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-fg/[0.05] p-3">
              <FileText className="size-8 text-[#6aa6ff]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{resume.name}</p>
                <p className="text-xs text-muted">{Math.max(1, Math.round(resume.bytes / 1024))} KB</p>
              </div>
              <a href="/api/jobs/resume" target="_blank" rel="noreferrer" aria-label="View resume" className="grid size-8 place-items-center rounded-lg hover:bg-fg/10">
                <Eye className="size-4" />
              </a>
            </div>
          ) : null}
          <button type="button" disabled={upload !== null} onClick={() => fileRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5 disabled:opacity-50">
            <CloudUpload className="size-4" /> {resume ? "Replace resume" : "Upload resume"}
          </button>
        </section>

        <Notice msg={msg} />
        <button type="button" disabled={busy} onClick={save} className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white disabled:opacity-60", GRADIENT)}>
          {busy && <Loader2 className="size-4 animate-spin" />} {next && resume ? "Save & go back to the job" : "Save profile"}
        </button>
      </aside>
    </div>
  );
}
