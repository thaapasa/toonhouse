import type { ClipId } from '@toonhouse/model';
import { clipById, CLIPS, drawCharacter } from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import { useEffect, useState } from 'react';

import { CHARACTERS } from './characters.ts';
import { AssetList } from './components/AssetList.tsx';
import { ClipBar } from './components/ClipBar.tsx';
import { Header } from './components/Header.tsx';
import { type ViewOptions, Viewport } from './components/Viewport.tsx';

const FPS = 30;

export function App() {
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

  const character = CHARACTERS.find((c) => c.id === characterId)!;
  const clip = clipById(clipId);
  const playback = usePlayback({
    duration: clip.duration,
    fps: FPS,
    loop,
    speed,
  });
  const frame = clip.frameAt(playback.t);
  const drawing = drawCharacter(character.rig, frame, { facing: view.facing });

  const pickClip = (id: ClipId) => {
    setClipId(id);
    playback.seek(0);
    playback.setPlaying(true);
  };

  const { step, setPlaying, playing } = playback;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, setPlaying, playing]);

  return (
    <div className="studio">
      <Header file={character.file} />
      <div className="body">
        <AssetList
          characters={CHARACTERS}
          selected={characterId}
          onSelect={setCharacterId}
        />
        <main className="main">
          <Viewport
            prefix={`part-${character.id}`}
            parts={character.parts}
            drawing={drawing}
            travel={frame.travel}
            view={view}
            onView={setView}
          />
          <ClipBar
            clips={CLIPS}
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
      </div>
    </div>
  );
}
