import { SCENE } from '../common/path.ts';
import { createPlayer } from '../common/player.ts';

const stage = document.getElementById('stage')!;
createPlayer(document.getElementById('controls')!, {
  duration: SCENE.duration,
  fps: SCENE.fps,
  render(t) {
    stage.textContent = `t = ${t.toFixed(2)}`;
  },
});
