// The selection of the studio in the query of the URL, such as
// `?character=adventure%2Fcaptain`, so that a reload keeps it.

export interface Location {
  /** The character or the prop that the rig views show. */
  rig: string;
  background: string | null;
}

export interface Known {
  characters: readonly string[];
  props: readonly string[];
  backgrounds: readonly string[];
}

/**
 * The selection in `search`. An id that the studio doesn't have is skipped,
 * and the first character is used if there is no rig.
 */
export function readLocation(search: string, known: Known): Location {
  const q = new URLSearchParams(search);
  const pick = (key: string, ids: readonly string[]) => {
    const id = q.get(key);
    return id !== null && ids.includes(id) ? id : null;
  };
  return {
    rig:
      pick('character', known.characters) ??
      pick('prop', known.props) ??
      known.characters[0]!,
    background: pick('background', known.backgrounds),
  };
}

/** The query for a selection, with the leading `?`. */
export function locationSearch(loc: Location, known: Known): string {
  const q = new URLSearchParams();
  q.set(known.props.includes(loc.rig) ? 'prop' : 'character', loc.rig);
  if (loc.background !== null) q.set('background', loc.background);
  return `?${q.toString()}`;
}
