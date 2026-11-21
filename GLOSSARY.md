# Glossary

The terms that the docs, the specs and the code use. Use these words and no
others for the same things. If a word is listed under "Not", it is either taken
for something else or too vague.

## The cartoon

- **Cartoon**: the whole film that a user makes. It is made of shots. Not:
  animation, movie, project.
- **Shot**: one entry in a cartoon. It plays a part of one scene, at some speed,
  and the shots play one after another. Several shots can use the same scene.
  Not: clip, cut, segment.
- **Preview image**: the picture of a cartoon in the lists of the home page. The
  user sets it from a frame in the editor. Not: thumbnail, snapshot, cover.
- **Scene**: a background with actors on it and a timeline for them. The user
  edits each scene on its own. Each scene belongs to one cartoon.
- **Background**: the actor behind the other actors in a scene. It has one or
  more layers at different depths, and it can have clips, such as the sun moving
  across the sky. The user picks it from the library. A background is not a rig.
- **Depth**: how far a layer of the background is from the camera, from 0 for a
  layer infinitely far away, such as the sky, to 1 for the ground layer. When
  the camera moves, the far layers move less than the near ones.
- **Parallax**: the far layers of a background moving less than the near ones
  when the camera moves.
- **Ground layer**: the layer of the background that the other actors stand on.
  Each actor has its own place on it.
- **Start point**: the place on the ground layer where an actor goes when the
  user adds it without picking a place.
- **Perspective**: a setting of a background that makes the actors smaller as
  they go up the ground layer, toward the horizon. A background without it has
  actors of the same size everywhere.
- **Horizon**: the height on the ground layer where an actor would have no size
  at all, in a background with a perspective.
- **Camera**: the view of the scene that the cartoon shows. By default it shows
  the whole background, and it can zoom and pan inside it. It is the view of the
  ground layer.
- **Camera view**: where the camera looks: its middle point and its zoom. Not:
  shot, which is an entry in a cartoon.
- **Start view**: the camera view at the start of a scene. By default, the whole
  background.
- **Camera move**: a zoom or a pan of the camera on the timeline. It goes from
  the view where the camera is to a new view over a time, with an easing. Not:
  camera action, transition.
- **Camera jump**: a change of the camera to a new view at once, at a point on
  the timeline. Not: cut, which sounds like a shot.
- **Camera entry**: a camera move or a camera jump. A scene saves them in one
  list, and the code uses the term for what holds for both.
- **Easing**: how a camera move speeds up and slows down: linear, ease in, ease
  out, or ease in and out.
- **Camera box**: the box on the stage of the editor that shows the camera view
  at the playhead. The user drags it to pan the camera and drags its corners to
  zoom.
- **Actor**: a character, a prop or a background that the user has placed in a
  scene. An actor uses either a cast member or a library character or prop.
- **Locked actor**: an actor that the user can't select or move on the stage.
  The user unlocks it from outside the stage, such as from the timeline.
- **Cast**: the characters and props of one cartoon, which the user makes from
  the library and names. Not: cartoon library, presets.
- **Cast member**: one entry in the cast, such as "Grandma", made from a library
  character. Every actor that uses it changes when the user edits it.
- **Setting**: something about a character or a prop that the user can change,
  such as a color or the size. A setting gets its value from the library, then
  the cast member, then the actor. Not: option, config.
- **Color setting**: a setting for one color of a character or a prop, such as
  the hair, the shirt or the outline. It has its own color presets, and the user
  picks one of them.
- **Color preset**: a named choice of colors in a color setting, such as dark
  brown hair or a blue shirt with white stripes. A preset gives a color to one
  or more color roles.
- **Color role**: one color of a character or a prop that a color preset can
  change, such as the skin, the shirt or the logo on the shirt. The role is the
  same in every part, so `skin` colors the head, the hands and the drawn limbs.
  Each role belongs to one character or prop, and isn't shared with others. Not:
  palette, color slot.
- **Override**: a setting that an actor sets for one scene, instead of taking it
  from its cast member.
- **Timeline**: the time axis of one scene. The cartoon has no timeline of its
  own, only shots in a row.
- **Ruler**: the strip of times at the top of the timeline. A tap or a drag on
  it moves the playhead.
- **Playhead**: the line across the timeline at the current time, with a knob on
  the ruler. The stage shows the scene at this time, and a new action starts
  here. Not: cursor.
- **Time mark**: a dot on a row of the timeline where an action starts or ends,
  where its clip starts a new loop or where a walk gets to its last point. A tap
  moves the playhead there, and a dragged end snaps to the marks of loops and
  walks. Not: keyframe, which belongs to keyframe clips.
- **Action**: something that an actor does on the timeline, from a point in time
  until its next action, such as walking to a point or waving. An action plays
  one or more clips.
- **Speech bubble**: a text that shows on the stage for a time. Short form:
  bubble.
- **Attached bubble**: a speech bubble that follows an actor, at an offset from
  its ground point.
- **Free bubble**: a speech bubble that stays at its place in the scene and
  belongs to no actor.
- **Tail**: the point of a speech bubble that shows who says it.
- **Bubble lane**: the part of the row of an actor on the timeline that shows
  its speech bubbles.
- **Sound**: a sound effect at a point on the timeline of a scene. A shot plays
  the sounds of its scene.
- **Music**: sound that belongs to the cartoon and plays across several shots.
- **Frame**: one picture of the cartoon at a given time.

## Characters and props

- **Library**: the ready-made characters, props and backgrounds that the user
  can pick from. It is made of asset packs.
- **Asset pack**: a set of characters, props and backgrounds in one art style,
  such as Sunny. Users can mix assets from different packs. Not: style pack,
  theme.
- **Style prompt**: the part of an image prompt that describes the art style of
  an asset pack. Every image for the pack uses the same style prompt.
- **Character**: a figure that can move, such as the boy or the hen. Not:
  figure, toon.
- **Prop**: an object that an actor can use or that stands in a scene, such as a
  ball, a chair or a tree. A prop has a rig of the kind `prop`: a small tree of
  bones, each with a part, such as a trunk and the clumps of leaves of the
  crown.
- **Rig**: the structure of a character or a prop. It is a tree of bones joined
  at pivot points, with a part on each bone. Not: skeleton.
- **Rig kind**: the type of a rig: `cutout`, `bird`, `rabbit` or `prop`. A clip
  works on the rigs of one kind only.
- **Bone**: one link in the tree of a rig. It turns at its pivot point.
- **Pivot point**: the point where a bone joins its parent and turns. Not:
  joint, anchor.
- **Ground point**: the point of a character or a prop that stands on the
  ground, usually under the feet. If the size of an actor changes, its ground
  point stays in place. Not: pivot point, which belongs to a bone.
- **Part**: a drawing on a bone, such as the head or a wing. A part has one or
  more layers. A background has parts too: drawings on its layers that clips
  move, such as the sun. Not: sprite.
- **Layer**: one SVG drawing of a part or a background, such as the front hair
  of the head or the sky of a background. The layers of a part move together,
  but each has its own place in the draw order.
- **Draw order**: the order in which the layers of a rig and the drawn limbs are
  drawn, from the back to the front. Each rig has a default draw order, and a
  clip can change it while it plays. Not: z-order, z-index.
- **Slot**: a place in a rig kind that the renderer draws, such as the near hand
  or the head: either a limb that the renderer draws or a part on a bone. A prop
  has a slot for each bone.
- **Draw entry**: one item in the draw order: a drawn limb, the main layer of
  the part of a slot, or one of its other layers, with the id `slot.layer`.
- **Piece**: an image that the asset scripts cut from a generated parts sheet
  and redraw as SVG. A piece becomes a layer of a part when it goes on a rig.
  The word belongs to the asset scripts in `assets/` and `prototypes/`.
- **Rubber hose**: an arm or a leg that the renderer draws as a bending line
  between two parts, instead of a traced part.
- **Clip**: a short motion that a character, a prop or a background can play,
  such as a walk cycle, a wave or the sun moving across the sky. A clip works on
  every rig of the same kind, or on every background. Use "clip" everywhere, in
  the code, the docs and the UI. Not: animation, move.
- **Code clip**: a clip that is written as a TypeScript function from the time
  to a pose and a face, or to where the parts of a background are. All clips are
  code clips for now.
- **Keyframe clip**: a clip that is stored as JSON keyframes and edited in the
  character studio. Planned.
- **Pose**: the angles and positions of the bones of a rig at one moment.
- **Face**: the state of the eyes and the mouth at one moment.

## Apps and tools

- **Web app**: the app that users open in the browser. It will run at
  https://piirretyt.pomeranssi.fi. It has the player and the editor.
- **Player**: the part of the web app that plays a cartoon.
- **Scrubber**: the slider of the player that shows how far the cartoon has
  played. The user drags it to move to any point of the cartoon. The editor has
  a playhead instead.
- **Editor**: the part of the web app where the user edits scenes and puts the
  cartoon together from shots.
- **Server**: stores the cartoons and serves the assets and the web app. It
  doesn't render video.
- **Export client**: a program on the user's own computer that downloads a
  cartoon and saves it as a video or as images.
- **Character studio**: a development tool for making the characters, props,
  backgrounds and clips in the library. It runs only on the developer's
  computer. Short form: the studio. Not: dev studio, editor.
- **Motion prototypes**: the experiments in `prototypes/` that tried out the
  motion before the renderer existed.
- **Renderer**: the package that computes what a scene looks like at a given
  time. It has no UI.
- **Properties pane**: the pane on the right of the editor that shows all the
  data of the selection, such as the points of a walk, and where the user can
  change it. It floats over the stage, or the user attaches it to the side. The
  character studio has a properties pane too, for the rig that it shows. Not:
  inspector, panel.
- **Stage**: the area where a scene is drawn, in the web app and in the studio.
- **Band**: the area around the frame on the stage of the editor, where actors
  wait before they come in.
- **Home view**: the view of the stage that shows the whole frame with a thin
  margin. The editor opens a scene at it.

## Users

- **User**: a person who makes or watches cartoons in the web app.
- **Developer**: a person who works on the app and its library, for example in
  the character studio.
- **Owner**: the user who made a cartoon. Only the owner can edit it. Not:
  author, creator.
- **Group**: a set of users that a cartoon can be shared with, such as a family.
  Not: team.
- **Visibility**: who can watch a cartoon: public, logged-in users, a group or
  private. Not: privacy, permissions.
- **Session**: one login of a user on one device. It lasts 90 days from the last
  use.
- **Profile page**: the page where a user edits their own name and resets their
  password.
