import type { Rig } from '@toonhouse/model';
import { type DrawEntry, drawOrder } from '@toonhouse/renderer';
import { useState } from 'react';

import { useI18n } from '../i18n/index.tsx';
import { withDefaultDrawOrder, withEntryMoved } from '../rigEdit.ts';
import { useRigNames } from '../rigNames.ts';
import { ArrowIcon } from './icons.tsx';

interface Props {
  rig: Rig;
  onRig(rig: Rig): void;
}

/**
 * The draw order of the rig, with the front at the top as in the layer lists
 * of drawing apps. Each entry has buttons to move it forward or back by one.
 */
export function DrawOrderPanel({ rig, onRig }: Props) {
  const { tr } = useI18n();
  const names = useRigNames();
  // The last entry moved, so that it stays easy to find in the list.
  const [moved, setMoved] = useState<string | null>(null);
  const rows = drawOrder(rig).reverse();
  const kind = (e: DrawEntry) =>
    tr(
      e.parts.length === 0
        ? 'drawnLimb'
        : e.layer === undefined
          ? 'mainLayer'
          : 'layer',
    );
  const move = (e: DrawEntry, by: number) => {
    setMoved(e.id);
    onRig(withEntryMoved(rig, e.id, by));
  };

  return (
    <section className="inspector-section">
      <div className="hint">{tr('drawOrderHint')}</div>
      <div className="order-end">{tr('orderFront')}</div>
      <ol className="draw-order">
        {rows.map((e, i) => {
          const label = names.entry(e);
          return (
            <li
              key={e.id}
              className="order-row"
              aria-current={e.id === moved ? 'true' : undefined}
            >
              <div className="order-name">
                <span>{label}</span>
                <span className="order-kind">{kind(e)}</span>
              </div>
              <button
                type="button"
                className="order-button"
                aria-label={tr('moveForward', { entry: label })}
                title={tr('moveForward', { entry: label })}
                disabled={i === 0}
                onClick={() => move(e, 1)}
              >
                <ArrowIcon dir="up" />
              </button>
              <button
                type="button"
                className="order-button"
                aria-label={tr('moveBackward', { entry: label })}
                title={tr('moveBackward', { entry: label })}
                disabled={i === rows.length - 1}
                onClick={() => move(e, -1)}
              >
                <ArrowIcon dir="down" />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="order-end">{tr('orderBack')}</div>
      <div className="hint">
        {tr(rig.drawOrder ? 'ownOrderInUse' : 'defaultOrderInUse')}
      </div>
      <button
        type="button"
        className="button order-reset"
        disabled={!rig.drawOrder}
        onClick={() => {
          setMoved(null);
          onRig(withDefaultDrawOrder(rig));
        }}
      >
        {tr('defaultOrder')}
      </button>
    </section>
  );
}
