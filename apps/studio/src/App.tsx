import type { ClipId, Pt, Rig } from '@toonhouse/model';
import {
  BACKGROUND_CLIPS,
  backgroundClips,
  type Camera,
  clipsFor,
  drawCharacter,
  partBounds,
  wholeBackground,
} from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { useEffect, useState } from 'react';

import { BACKGROUNDS } from './backgrounds.ts';
import { CHARACTERS, PROPS, RIGS } from './characters.ts';
import { AssetList, type Selection } from './components/AssetList.tsx';
import { BackgroundInspector } from './components/BackgroundInspector.tsx';
import { BackgroundView, type Guest } from './components/BackgroundView.tsx';
import { ClipBar } from './components/ClipBar.tsx';
import type { Box } from './components/DragHandles.tsx';
import { DragHandles } from './components/DragHandles.tsx';
import { Header } from './components/Header.tsx';
import { Inspector, type SaveStatus } from './components/Inspector.tsx';
import { PieceView } from './components/PieceView.tsx';
import { type ViewOptions, Viewport } from './components/Viewport.tsx';
import { isTextKey, useI18n } from './i18n/index.tsx';
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
  const { tr } = useI18n();
  // The character or prop that the rig views show. It stays the same while
  // a background is selected.
  const [characterId, setCharacterId] = useState(CHARACTERS[0]!.id);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [clipId, setClipId] = useState<ClipId>('walk');
  const [backgroundClipId, setBackgroundClipId] = useState<ClipId>('day');
  const [camera, setCamera] = useState<Camera | null>(null);
  const [horizon, setHorizon] = useState(true);
  // Where the developer has dragged the guest on the background.
  const [guestAt, setGuestAt] = useState<Pt | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
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

  const character = RIGS.find((c) => c.id === characterId)!;
  const rigOf = (id: string) => {
    const c = RIGS.find((x) => x.id === id);
    return c && (drafts[id] ?? saved[id] ?? c.rig);
  };
  const fileRig = saved[characterId] ?? character.rig;
  const rig = drafts[characterId] ?? fileRig;
  const isDirty = (id: string) => {
    const c = RIGS.find((x) => x.id === id);
    const draft = drafts[id];
    return !!c && !!draft && !sameRig(draft, saved[id] ?? c.rig);
  };
  const dirty = isDirty(characterId);
  const selected = findTarget(rig, target);

  const background = BACKGROUNDS.find((b) => b.id === backgroundId) ?? null;
  const clips = clipsFor(rig.kind);
  // Another kind of character may not have the clip; then play its first.
  const clip = clips.find((c) => c.id === clipId) ?? clips[0]!;
  const bgClips = background ? backgroundClips(background.background) : [];
  const bgClip = bgClips.find((c) => c.id === backgroundClipId) ?? bgClips[0];
  const activeClip = background && bgClip ? bgClip : clip;
  const playback = usePlayback({
    duration: activeClip.duration,
    fps: FPS,
    loop,
    speed,
  });
  const frame = clip.frameAt(playback.t);
  const drawing = drawCharacter(rig, frame, { facing: view.facing });

  const pickClip = (id: ClipId) => {
    if (background) setBackgroundClipId(id);
    else setClipId(id);
    playback.seek(0);
    playback.setPlaying(true);
  };
  const pick = (s: Selection) => {
    if (s.type === 'background') {
      if (s.id !== backgroundId) {
        setCamera(null);
        setGuestAt(null);
      }
      setBackgroundId(s.id);
    } else {
      setBackgroundId(null);
      setCharacterId(s.id);
      setStatus({ state: 'idle' });
    }
  };

  // A character or a prop on the background plays the clip picked for the
  // rigs, if it has one, and loops it in the time of the background clip.
  let guest: Guest | null = null;
  const guestAsset = RIGS.find((c) => c.id === guestId);
  const guestRig = guestId === null ? undefined : rigOf(guestId);
  if (background && guestAsset && guestRig) {
    const gClips = clipsFor(guestRig.kind);
    const gClip = gClips.find((c) => c.id === clipId) ?? gClips[0]!;
    const gFrame = gClip.frameAt(playback.t % gClip.duration);
    guest = {
      actor: {
        id: guestAsset.id,
        node: drawCharacter(guestRig, gFrame, { facing: view.facing }).node,
        ...(guestAt ?? background.background.ground.start),
      },
      parts: guestAsset.parts,
    };
  }
  const rigName = (c: (typeof RIGS)[number]) => {
    const key = `${c.rig.kind === 'prop' ? 'prop' : 'character'}.${c.id}`;
    return isTextKey(key) ? tr(key) : c.id;
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
  // A prop is drawn to fit its own height instead of that of a character.
  const propBounds =
    rig.kind === 'prop'
      ? partBounds(drawCharacter(rig, clips[0]!.frameAt(0), { facing: 1 }).node)
      : null;
  const clipBar = (
    <ClipBar
      clips={background ? bgClips : clips}
      clip={activeClip}
      fps={FPS}
      playback={playback}
      loop={loop}
      speed={speed}
      onClip={pickClip}
      onLoop={setLoop}
      onSpeed={setSpeed}
    />
  );
  if (background) {
    const cam = camera ?? wholeBackground(background.background);
    return (
      <div className="studio">
        <Header file={background.file} />
        <div className="body">
          <AssetList
            characters={CHARACTERS}
            props={PROPS}
            backgrounds={BACKGROUNDS}
            selected={{ type: 'background', id: background.id }}
            unsaved={RIGS.filter((c) => isDirty(c.id)).map((c) => c.id)}
            onSelect={pick}
          />
          <main className="main">
            <BackgroundView
              asset={background}
              frame={(bgClip ?? BACKGROUND_CLIPS[0]!).frameAt(playback.t)}
              camera={cam}
              onCamera={setCamera}
              horizon={horizon}
              onHorizon={setHorizon}
              onGuestMove={setGuestAt}
              guests={RIGS.map((c) => ({ id: c.id, label: rigName(c) }))}
              guest={guest}
              onGuest={setGuestId}
            />
            {clipBar}
          </main>
          <BackgroundInspector asset={background} camera={cam} />
        </div>
      </div>
    );
  }
  return (
    <div className="studio">
      <Header file={character.file} />
      <div className="body">
        <AssetList
          characters={CHARACTERS}
          props={PROPS}
          backgrounds={BACKGROUNDS}
          selected={{ type: 'rig', id: characterId }}
          unsaved={RIGS.filter((c) => isDirty(c.id)).map((c) => c.id)}
          onSelect={pick}
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
              travel={'travel' in frame ? frame.travel : 0}
              view={view}
              onView={setView}
              fitHeight={propBounds ? -propBounds.y : undefined}
              overlay={
                selected?.type === 'attachment' ? attachmentOverlay : undefined
              }
            />
          )}
          {clipBar}
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
