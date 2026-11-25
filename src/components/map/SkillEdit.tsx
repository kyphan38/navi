'use client';

import { useState } from 'react';

import { useUid } from '@/components/AuthGate';
import { pillarMigration } from '@/lib/pillars';
import { addSkill, removeSkill, seedSkills, updateSkill } from '@/lib/repo';
import { missingStarters } from '@/lib/skill-level';

const input = 'min-w-0 border-b border-line bg-transparent pb-1 text-[15px] text-ink placeholder:text-faint focus:border-line-strong';
const quiet = 'shrink-0 font-mono text-[12px] text-faint hover:text-ink disabled:opacity-40';

/** Name and area inputs, shared by add and edit. Areas already in use are offered. */
function NameArea({
  name,
  area,
  areas,
  onName,
  onArea,
}: {
  name: string;
  area: string;
  areas: string[];
  onName: (v: string) => void;
  onArea: (v: string) => void;
}) {
  return (
    <>
      <input value={name} onChange={(e) => onName(e.target.value)} maxLength={200} placeholder="skill" aria-label="Skill name" className={`${input} flex-1`} />
      <input value={area} onChange={(e) => onArea(e.target.value)} maxLength={100} placeholder="area" aria-label="Area" list="skill-areas" className={`${input} w-28`} />
      <datalist id="skill-areas">
        {areas.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </>
  );
}

/** Rename, move to another area, or remove one skill (inside its detail). */
export function SkillEdit({ id, name, area, areas }: { id: string; name: string; area: string; areas: string[] }) {
  const uid = useUid();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(name);
  const [a, setA] = useState(area);
  const [sure, setSure] = useState(false);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={quiet}>
        edit
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!n.trim() || !a.trim()) return;
        updateSkill(uid, id, { name: n.trim(), area: a.trim() });
        setOpen(false);
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <NameArea name={n} area={a} areas={areas} onName={setN} onArea={setA} />
      <button type="submit" disabled={!n.trim() || !a.trim()} className={quiet}>
        save
      </button>
      <button type="button" onClick={() => (sure ? removeSkill(uid, id) : setSure(true))} className={quiet}>
        {sure ? 'remove, sure?' : 'remove'}
      </button>
    </form>
  );
}

/** Add a skill by hand, and add starter skills the learner does not have yet. */
export function SkillAdd({ skills, areas }: { skills: { id: string; area: string }[]; areas: string[] }) {
  const uid = useUid();
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const missing = missingStarters(skills);
  const moves = pillarMigration(skills);
  return (
    <div className="mt-2 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !area.trim()) return;
          addSkill(uid, name.trim(), area.trim());
          setName('');
        }}
        className="flex flex-wrap items-center gap-3"
      >
        <NameArea name={name} area={area} areas={areas} onName={setName} onArea={setArea} />
        <button type="submit" disabled={!name.trim() || !area.trim()} className={quiet}>
          add
        </button>
      </form>
      {moves.length > 0 && (
        <p className="flex items-baseline gap-3 text-[14px] text-muted">
          <span>{moves.length} skills use old areas</span>
          <button type="button" onClick={() => moves.forEach((m) => updateSkill(uid, m.id, { area: m.area }))} className={quiet}>
            move
          </button>
        </p>
      )}
      {missing.length > 0 && (
        <p className="flex items-baseline gap-3 text-[14px] text-muted">
          <span>{missing.length} starter skills not added</span>
          <button type="button" onClick={() => seedSkills(uid, missing)} className={quiet}>
            add them
          </button>
        </p>
      )}
    </div>
  );
}
