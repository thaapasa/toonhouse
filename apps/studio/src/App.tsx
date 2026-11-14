import type { ClipId, Pt, Rig } from '@toonhouse/model';
import { clipsFor, drawCharacter } from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { useEffect, useState } from 'react';

import { CHARACTERS } from './characters.ts';
import { AssetList } from './components/AssetList.tsx';
import { ClipBar } from './components/ClipBar.tsx';
import type { Box } from './components/DragHandles.tsx';
import { DragHandles } from './components/DragHandles.tsx';
import { Header } from './components/Header.tsx';
import { Inspector, type SaveStatus } from './components/Inspector.tsx';
import { PieceView } from './components/PieceView.tsx';
import { type ViewOptions, Viewport } from './components/Viewport.tsx';
import {
  type AngleField,
  angleFields,
  attachmentMover,
  attachments,
  findTarget,
  type RigTarget,
  roundPt,
  withAngle,
  withTarget,
} from './rigEdit.ts';
import { useRigNames } from './rigNames.ts';

const FPS = 30;
/** The dev server saves rigs here, see server/saveRig.ts. */
const SAVE_RIG_URL = '/api/rig';

const sameRig = (a: Rig, b: Rig) => JSON.stringify(a) === JSON.stringify(b);

function without<T>(record: Record<string, T>, key: string) {
  const rest = { ...record };
  delete rest[key];
  return rest;
}

export function App() {
  const names = useRigNames();
  const [characterId, setCharacterId] = useState(CHARACTERS[0]!.id);
  const [clipId, setClipId] = useState<ClipId>('walk');
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<ViewOptions>({
    bones: false,
    ground: true,
    facing: 1,
    zoom: 1,
  });
  // Edited rigs that are not saved yet, and rigs saved in this session, by
  // character. The saved ones stand in for the files until the dev server
  // reloads them.
  const [drafts, setDrafts] = useState<Record<string, Rig>>({});
  const [saved, setSaved] = useState<Record<string, Rig>>({});
  const [target, setTarget] = useState<RigTarget | null>(null);
  const [angleId, setAngleId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>({ state: 'idle' });

  const character = CHARACTERS.find((c) => c.id === characterId)!;
  const fileRig = saved[characterId] ?? character.rig;
  const rig = drafts[characterId] ?? fileRig;
  const isDirty = (id: string) => {
    const c = CHARACTERS.find((x) => x.id === id);
    const draft = drafts[id];
    return !!c && !!draft && !sameRig(draft, saved[id] ?? c.rig);
  };
  const dirty = isDirty(characterId);
  const selected = findTarget(rig, target);

  const clips = clipsFor(rig.kind);
  // Another kind of character may not have the clip; then play its first.
  const clip = clips.find((c) => c.id === clipId) ?? clips[0]!;
  const playback = usePlayback({
    duration: clip.duration,
    fps: FPS,
    loop,
    speed,
  });
  const frame = clip.frameAt(playback.t);
  const drawing = drawCharacter(rig, frame, { facing: view.facing });

  const pickClip = (id: ClipId) => {
    setClipId(id);
    playback.seek(0);
    playback.setPlaying(true);
  };
  const pickCharacter = (id: string) => {
    setCharacterId(id);
    setStatus({ state: 'idle' });
  };

  const setRig = (next: Rig) => {
    setDrafts((d) => ({ ...d, [characterId]: next }));
    if (status.state !== 'saving') setStatus({ state: 'idle' });
  };
  const moveTarget = (p: Pt) => {
    if (target) setRig(withTarget(rig, target, roundPt(p)));
  };
  // The rest angles of the selected piece, and the one that the piece view
  // edits instead of the pivot.
  const pieceAngles =
    selected?.type === 'piece'
      ? angleFields(rig).filter((f) => f.part === selected.part)
      : [];
  const angleMode = pieceAngles.find((f) => f.id === angleId) ?? null;
  const changeAngle = (f: AngleField, deg: number) => {
    setAngleId(f.id);
    setRig(withAngle(rig, f, deg));
  };
  const revert = () => {
    setDrafts((d) => without(d, characterId));
    setStatus({ state: 'idle' });
  };
  const save = async () => {
    const id = characterId;
    const next = rig;
    setStatus({ state: 'saving' });
    try {
      const res = await fetch(SAVE_RIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: character.file, rig: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? res.statusText);
      }
      setSaved((s) => ({ ...s, [id]: next }));
      // Keep edits made while saving.
      setDrafts((d) => (d[id] && !sameRig(d[id], next) ? d : without(d, id)));
      setStatus({ state: 'saved' });
    } catch (e) {
      setStatus({
        state: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // Drag an attachment point on the posed character.
  const startAttachmentDrag = (joint: string) => {
    const a = attachments(rig).find((x) => x.joint === joint);
    if (!a) return () => {};
    const t: RigTarget = { type: 'attachment', joint };
    const start = findTarget(rig, t)!.at;
    const toPiece = attachmentMover(rig, frame, view.facing, a);
    const base = rig;
    return (d: Pt) => {
      const m = toPiece(d);
      setRig(
        withTarget(base, t, roundPt({ x: start.x + m.x, y: start.y + m.y })),
      );
    };
  };
  const attachmentOverlay = (px: number, box: Box) => (
    <DragHandles
      handles={attachments(rig).map((a) => ({
        id: a.joint,
        at: drawing.skeleton.joints.find((j) => j.name === a.joint)!.at,
        label: names.joint(a.joint),
      }))}
      selected={selected?.type === 'attachment' ? selected.joint : null}
      px={px}
      box={box}
      onSelect={(joint) => setTarget({ type: 'attachment', joint })}
      onDragStart={startAttachmentDrag}
    />
  );

  const { step, setPlaying, playing } = playback;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Escape') setTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, setPlaying, playing]);

  // Ask before leaving the page with unsaved rigs.
  const anyDirty = Object.keys(drafts).some(isDirty);
  useEffect(() => {
    if (!anyDirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [anyDirty]);

  const prefix = `part-${character.id}`;
  return (
    <div className="studio">
      <Header file={character.file} />
      <div className="body">
        <AssetList
          characters={CHARACTERS}
          selected={characterId}
          unsaved={CHARACTERS.filter((c) => isDirty(c.id)).map((c) => c.id)}
          onSelect={pickCharacter}
        />
        <main className="main">
          {selected?.type === 'piece' ? (
            <PieceView
              prefix={prefix}
              parts={character.parts}
              rig={rig}
              part={selected.part}
              drawing={drawing}
              zoom={view.zoom}
              onZoom={(zoom) => setView({ ...view, zoom })}
              onBack={() => setTarget(null)}
              angles={pieceAngles}
              mode={angleMode}
              onMode={(f) => setAngleId(f?.id ?? null)}
              onPivot={moveTarget}
              onAngle={changeAngle}
            />
          ) : (
            <Viewport
              prefix={prefix}
              parts={character.parts}
              drawing={drawing}
              travel={frame.travel}
              view={view}
              onView={setView}
              overlay={
                selected?.type === 'attachment' ? attachmentOverlay : undefined
              }
            />
          )}
          <ClipBar
            clips={clips}
            clip={clip}
            fps={FPS}
            playback={playback}
            loop={loop}
            speed={speed}
            onClip={pickClip}
            onLoop={setLoop}
            onSpeed={setSpeed}
          />
        </main>
        <Inspector
          rig={rig}
          target={target}
          onTarget={setTarget}
          onMove={moveTarget}
          angles={pieceAngles}
          angleMode={angleMode}
          onAngle={changeAngle}
          onRig={setRig}
          dirty={dirty}
          status={status}
          onSave={() => void save()}
          onRevert={revert}
        />
      </div>
    </div>
  );
}
