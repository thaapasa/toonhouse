// The button that makes the frame on the stage the preview image of the
// cartoon. The image stays until the user sets a new one, even if the scene
// changes.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Scene } from '@toonhouse/model';
import { sceneFrame } from '@toonhouse/renderer';
import { useEffect } from 'react';

import { cartoonQuery, cartoonsQuery, uploadPreview } from '../api.ts';
import { IconButton } from '../components/IconButton.tsx';
import { PreviewIcon } from '../components/icons.tsx';
import { useI18n } from '../i18n/index.tsx';
import { type BackgroundAsset, LIBRARY, sceneFiles } from '../library/index.ts';
import { loadAllSources, loadedSources } from '../library/sources.ts';

/** How long the result shows next to the button. */
const STATUS_MS = 3000;

export function PreviewButton(props: {
  cartoonId: string;
  /** The frame on the stage, or `undefined` if the scene has no background. */
  frame: { scene: Scene; bg: BackgroundAsset; t: number } | undefined;
}) {
  const { tr } = useI18n();
  const queryClient = useQueryClient();
  const set = useMutation({
    mutationFn: async (frame: NonNullable<typeof props.frame>) => {
      const { makePreviewImage } = await import('./previewImage.tsx');
      const { scene, bg, t } = frame;
      // The image draws the scene once, so its SVG files must be there.
      const files = sceneFiles(scene);
      await loadAllSources(files);
      if (!files.every(loadedSources)) throw new Error('Missing SVG files');
      const image = await makePreviewImage(
        scene,
        // The bubbles show at their full size, as on the stage while paused.
        sceneFrame(scene, bg.background, LIBRARY, t, { pop: false }),
      );
      return uploadPreview(props.cartoonId, image);
    },
    onSuccess: async (cartoon) => {
      queryClient.setQueryData(cartoonQuery(cartoon.id).queryKey, cartoon);
      await queryClient.invalidateQueries(cartoonsQuery);
    },
  });
  const { reset, isSuccess, isError } = set;
  useEffect(() => {
    if (!isSuccess && !isError) return;
    const timer = setTimeout(reset, STATUS_MS);
    return () => clearTimeout(timer);
  }, [isSuccess, isError, reset]);

  const frame = props.frame;
  return (
    <>
      <span className={isError ? 'error small' : 'muted small'} role="status">
        {isSuccess && tr('editor.previewSet')}
        {isError && tr('editor.previewError')}
      </span>
      <IconButton
        label="editor.setPreview"
        disabled={!frame || set.isPending}
        onClick={frame && (() => set.mutate(frame))}
      >
        <PreviewIcon />
      </IconButton>
    </>
  );
}
