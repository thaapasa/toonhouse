# Harbor: work log

A wooden pier in front of a row of colorful stilt houses, with two tall ships
behind them and small islands with palm trees and a lighthouse far out at sea,
under a warm evening sky. It is the first background of the
[adventure pack](../../). Work files are in `assets/work/harbor/`.

## Frame and layers

The frame is 2048×1152 (16:9). Every layer is an SVG with
`viewBox="0 0 2048 1152"`.

| Layer        | Depth | What it is                                                 |
| ------------ | ----- | ---------------------------------------------------------- |
| `sky.svg`    | 0     | flat warm evening color `#f3c98b`, opaque                  |
| `far.svg`    | 0.1   | the sea from the horizon at y ≈ 560 down, with two islands |
| `middle.svg` | 0.45  | the stilt houses and the ships, roofs at y ≈ 450           |
| `ground.svg` | 1     | the pier deck from y ≈ 900, with posts and cargo behind it |

The order in the table is the draw order, from far to near. The actors stand on
the deck, between y ≈ 920 and the bottom of the frame. A good standing line is y
= 1010.

## How the layers were made

Each strip was generated at 2048×768 with the transparent background sentence
and the style prompt of the adventure pack, placed in the frame with
`assets/work/harbor/place.ts` (scale, x and y offset, the alpha rounded) and
traced with the default settings. The far and middle layers repeat the row 2 px
above the bottom of the strip down to the bottom of the frame, so that the sea
fills the frame under them. The far layer is mixed 35 % with the sky color.

## Prompts and seeds

- **Far** (`far.prompt.json`, seed 31): a calm dark teal sea with a few small
  islands with palm trees and a lighthouse. The image model drew a walking man
  left of the islands. `assets/work/harbor/clean-far.ts` erased him and copied
  the sea from further left over his feet. Placed at scale 1, y −72. Seed 32 had
  a man too, over the middle of the sea.
- **Middle** (`middle.prompt.json`, seed 31): the waterfront of a small port
  town, crooked wooden houses on stilts, a tavern sign with no letters, lit
  windows and the masts of two old ships. Placed at scale 1, y 230. Seed 32 had
  smaller houses and only one ship.
- **Ground** (`ground.prompt.json`, seed 41): the flat, empty deck of a wooden
  pier seen from slightly above, with mooring posts, a barrel and crates along
  the back edge. A purple speck in the transparent area was erased. Placed at
  scale 1.1, x −102, y 302. Seed 42 had a deck that filled more than half of the
  frame.

## What failed

- The first ground prompt asked for a dock "where characters can walk". Both
  seeds drew a person walking on it, and the dock was a thin strip seen from the
  side, with no depth for the actors to stand on. The second prompt asks for an
  empty deck seen from slightly above, and ends with "Empty scene, no figures,
  no humans, no animals". The far prompt, with only "no people", still got a
  person. The style prompt names a kind of game, which seems to make the image
  model add a hero.
- The middle layer is 242 KB, 84 KB with gzip. The houses are painted with
  texture, and tracing with fewer colors or a coarser speckle filter merged the
  red, yellow and purple houses into brown. A palette picked with k-means went
  mostly to the sea and lost the house colors too.

## What could be better

- The middle layer is twice the size of the largest earlier layer.
- There are no clips: the sea doesn't move and the sky has no sun.
