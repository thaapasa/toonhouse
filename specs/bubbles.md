# Speech bubbles

A speech bubble shows a text on the stage for a time. It is either attached to
an actor and follows it, or free and stays at its place in the scene. The user
adds bubbles in the [editor](scenes.md), and they show on the
[timeline](timeline.md) next to the actor that says them.

## Adding and placing

- [x] User can add a bubble with the bubble tool. A tap on an actor adds a
      bubble attached to that actor, and a tap on an empty place of the stage
      adds a free bubble there. The bubble starts at the playhead.
- [x] When the user adds a bubble, the text field of the bubble in the
      [properties pane](properties.md) gets the focus, so that the user can type
      the text at once. A double tap on a bubble on the stage selects it and
      puts the focus in its text field again.
- [x] An attached bubble follows its actor when the actor moves. Its place is an
      offset from the ground point of the actor, so that it doesn't wobble when
      a clip moves the head.
- [x] When an attached actor gets smaller or bigger, such as with a perspective,
      the offset grows and shrinks with it, so that the bubble stays as near to
      the head. The bubble itself keeps its size.
- [x] When an attached actor turns the other way, the bubble stays on the same
      side.
- [ ] A free bubble stays at its place in the scene. When the
      [camera](camera.md) pans, it moves with the scene.
- [ ] A bubble keeps its size on the screen when the camera zooms, so that the
      text stays readable.
- [x] A bubble stays inside the frame. If its place would take it past the edge
      of the frame, such as when its actor walks to the edge, the bubble moves
      inside the frame, and its tail still points at the actor.
- [x] If the user picks the bubble tool while adding the points of a walk, the
      editor stops adding points, so that the next tap adds a bubble.
- [x] User can drag a bubble on the stage. For an attached bubble, the drag
      changes the offset.
- [x] User can attach a free bubble to an actor, attach a bubble to another
      actor, and make an attached bubble free. The bubble stays where it is on
      the stage at the playhead, and its offset changes to match.
- [x] Bubbles are drawn in front of all actors. If bubbles overlap, the one that
      starts later is in front.
- [x] A drag of a bubble or of its tail is one step of undo, as is each change
      in the properties pane.

## Shape and tail

- [x] User can pick the shape of a bubble: a speech bubble with round edges, a
      thought bubble like a cloud, a shout bubble with spikes or a caption box
      with straight edges.
- [x] User can pick the style of the border, and set its color and its width.
      The first styles are examples to try out: a solid line, a dashed line for
      a whisper, a double line, a wobbly line that looks drawn by hand and no
      line.
- [x] User can set the fill color of a bubble.
- [x] User can turn the tail of a bubble on and off.
- [x] The tail of an attached bubble points at the head of the actor by default,
      and follows it when the actor moves. User can drag the tip of the tail to
      another point, which then moves with the actor.
- [x] A free bubble has no tail by default. If the user turns its tail on, the
      user places the tip of the tail by dragging it.
- [x] The tail of a thought bubble is a row of small circles that get smaller
      toward the speaker.
- [x] A bubble gets its size from its text. User sets the width of the bubble,
      and the text wraps to that width. The line breaks that the user types stay
      in the text.

## Text

- [x] User can pick the font of a bubble from a set of free fonts that the app
      serves itself, so that a bubble looks the same in the editor, the player
      and the exported video. The set has Comic Relief, a font like Comic Sans,
      and other fonts for comics: one for shouting, a few kinds of handwriting
      and an archaic font. Every font has the letters of Finnish.
- [x] The default font of a bubble comes from the asset pack of the actor. See
      [Library](library.md).
- [x] User can set the size and the color of the text.
- [x] User can make the text bold, italic or all caps.
- [x] The text is centered by default. User can align it to the left or the
      right.
- [x] User can change the line spacing.
- [x] The style of the text and of the bubble is set for the whole bubble.

## Time

- [x] A bubble shows from its start until the end of its length, and then it
      disappears. Its length doesn't depend on the actions of the actor.
- [x] The length of a new bubble comes from the length of its text, so that
      there is time to read it, and is at least 2 seconds. The length follows
      the text until the user changes the length.
- [x] User can change the length by dragging the end of the bubble on the
      timeline or by typing it in the properties pane. Then the length stays as
      the user set it when the text changes.
- [x] User can drag a bubble on the timeline to move it. Its start and its end
      move together.
- [x] A bubble pops in when it starts and pops out when it ends, in a short
      moment. User can turn this off for a bubble, and then it shows and
      disappears at once.
- [x] An actor can have several bubbles at the same time.
- [x] The scene lasts at least until the last bubble ends, unless the user sets
      the length of the scene. If the user sets the length, the scene can't end
      before the last bubble starts.
- [x] If the user moves an action, the bubbles stay where they are.
- [x] If the user removes an actor, its bubbles are removed too. Undo brings
      them back.

## On the timeline

- [x] An actor that has bubbles gets a bubble lane under its row on the
      timeline. Each bubble shows there as a bar from its start to its end, with
      as much of its text as fits.
- [x] If bubbles of the same actor overlap in time, the lane stacks them, so
      that each bar shows whole.
- [x] The free bubbles of a scene have a row of their own on the timeline.
- [x] A tap on a bubble on the timeline selects it, and the properties pane
      shows its text, its style, its start time and its length.
- [x] The start and the end of each bubble are time marks. A tap on one moves
      the playhead there.

## Later

- [ ] A cast member can have its own bubble style, such as its own font and
      color. Its bubbles start from that style, and the user can change each
      bubble. The style comes from the library, then the cast member, then the
      bubble. See [Cast](cast.md).
- [ ] The mouth of an actor moves while its bubble shows. Until then, the user
      starts a talk action for this.
- [ ] The text of a bubble can type out one letter at a time.
- [ ] Part of the text, such as one word, can have its own style.
- [ ] A free bubble can move during the scene, if the editor gets a way to move
      any actor over time.

## Open questions

- Which border styles to keep, after the user has seen the examples.
