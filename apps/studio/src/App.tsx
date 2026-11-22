import type { ClipId, Pt, Rig, WeatherState } from '@toonhouse/model';
import {
  type Camera,
  clipOf,
  clipsFor,
  type ColorChoice,
  colorRig,
  drawRig,
  FAIR_WEATHER,
  FPS,
  inWind,
  NOON,
  partBounds,
  presetColors,
  presetPatterns,
  restClip,
  restingSky,
  wholeBackground,
} from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { useEffect, useMemo, useState } from 'react';

import { SAVE_RIG_URL } from '../server/api.ts';
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
import { locationSearch, readLocation } from './location.ts';
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

const KNOWN = {
  characters: CHARACTERS.map((c) => c.id),
  props: PROPS.map((c) => c.id),
  backgrounds: BACKGROUNDS.map((b) => b.id),
};

const NO_CHOICE: ColorChoice = {};

/**
 * How long the playback of a background loops, in seconds. The rain and the
 * snow start again from the top at each loop, so it is long.
 */
const SKY_LOOP = 60;

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
  const [start] = useState(() => readLocation(window.location.search, KNOWN));
  const [characterId, setCharacterId] = useState(start.rig);
  const [backgroundId, setBackgroundId] = useState(start.background);
  const [clipId, setClipId] = useState<ClipId>('walk');
  // The time of day and the weather that the background shows. Each scene
  // has its own, so these are only a preview.
  const [hour, setHour] = useState(NOON);
  const [weather, setWeather] = useState<WeatherState>(FAIR_WEATHER);
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
  // The color presets that the views show, by character. Only a preview, so
  // the rig doesn't change.
  const [colorChoices, setColorChoices] = useState<Record<string, ColorChoice>>(
    {},
  );

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
  // Another kind of character may not have the clip, and then it rests.
  const clip = clipOf(rig.kind, clipId);
  const playback = usePlayback({
    duration: background ? SKY_LOOP : clip.duration,
    fps: FPS,
    loop,
    speed,
  });
  const frame = clip.frameAt(playback.t);
  const colorChoice = colorChoices[characterId] ?? NO_CHOICE;
  const roleColors = useMemo(
    () => presetColors(rig, colorChoice),
    [rig, colorChoice],
  );
  const rolePatterns = useMemo(
    () => presetPatterns(rig, colorChoice),
    [rig, colorChoice],
  );
  const drawing = drawRig(colorRig(rig, roleColors), frame, {
    facing: view.facing,
  });

  const pickClip = (id: ClipId) => {
    setClipId(id);
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
  // rigs, if it has one, and loops it in the time of the background.
  let guest: Guest | null = null;
  const guestAsset = RIGS.find((c) => c.id === guestId);
  const guestRig = guestId === null ? undefined : rigOf(guestId);
  const guestChoice = (guestId && colorChoices[guestId]) || NO_CHOICE;
  const guestColors = useMemo(
    () => (guestRig ? presetColors(guestRig, guestChoice) : {}),
    [guestRig, guestChoice],
  );
  const guestPatterns = useMemo(
    () => (guestRig ? presetPatterns(guestRig, guestChoice) : {}),
    [guestRig, guestChoice],
  );
  if (background && guestAsset && guestRig) {
    const gClips = clipsFor(guestRig.kind);
    const gClip = gClips.find((c) => c.id === clipId) ?? gClips[0]!;
    const clipFrame = gClip.frameAt(playback.t % gClip.duration);
    const gFrame =
      clipFrame.kind === 'prop' ? inWind(clipFrame, weather.wind) : clipFrame;
    guest = {
      actor: {
        id: guestAsset.id,
        node: drawRig(colorRig(guestRig, guestColors), gFrame, {
          facing: view.facing,
        }).node,
        ...(guestAt ?? background.background.ground.start),
      },
      parts: guestAsset.parts,
      colors: guestColors,
      patterns: guestPatterns,
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
        at: drawing.rigOutline.pivots.find((j) => j.name === a.joint)!.at,
        label: names.joint(a.joint),
      }))}
      selected={selected?.type === 'attachment' ? selected.joint : null}
      px={px}
      box={box}
      onSelect={(joint) => setTarget({ type: 'attachment', joint })}
      onDragStart={startAttachmentDrag}
    />
  );

  // Keep the selection in the URL, so that a reload shows it again.
  useEffect(() => {
    const search = locationSearch(
      { rig: characterId, background: backgroundId },
      KNOWN,
    );
    if (search !== window.location.search) {
      window.history.replaceState(null, '', search + window.location.hash);
    }
  }, [characterId, backgroundId]);

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
      ? partBounds(
          drawRig(rig, restClip(rig.kind).frameAt(0), { facing: 1 }).node,
        )
      : null;
  const clipBar = (
    <ClipBar
      clips={clips}
      clip={clip}
      {...(background && { duration: SKY_LOOP })}
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
    const sky = {
      ...restingSky(background.background),
      hour,
      weather,
      drift: weather.wind * playback.t,
      t: playback.t,
    };
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
              sky={sky}
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
          <BackgroundInspector
            asset={background}
            camera={cam}
            hour={hour}
            onHour={setHour}
            weather={weather}
            onWeather={setWeather}
          />
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
              colors={roleColors}
              patterns={rolePatterns}
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
              colors={roleColors}
              patterns={rolePatterns}
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
          colorChoice={colorChoice}
          onColorChoice={(c) =>
            setColorChoices((all) => ({ ...all, [characterId]: c }))
          }
          dirty={dirty}
          status={status}
          onSave={() => void save()}
          onRevert={revert}
        />
      </div>
    </div>
  );
}
