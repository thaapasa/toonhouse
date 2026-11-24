# Specs

Requirements for the app, one file per area. Agents use these files for feature
planning and implementation.

Each file has a heading, a short description of the area and a list of
requirements:

- `- [ ]` means planned.
- `- [x]` means implemented.

Keep requirements at the level of what a user or caller can do. Leave
implementation details to the code. Use the terms in
[GLOSSARY.md](../GLOSSARY.md). When a requirement depends on another area, link
to that area's file.

A file can have a "Technical notes" section for plans about the code that a
later feature needs, such as a refactoring to do when that feature starts. The
notes go after the requirements and before the open questions.

A file can have two sections that tell agents where not to spend effort. They go
after the requirements and before the technical notes:

- "Not required" lists what the app skips on purpose: features it doesn't have,
  failures it doesn't guard against and attacks it doesn't defend against.
  Agents don't build these, and reviews don't raise them. Each item gives the
  reason, and the change that would make it matter, if one is known.
- "Free choices" lists details that agents decide on their own. The current code
  is not a promise, so an agent can change it when there's a reason. An agent
  can suggest a change to the user instead of making it.

A behavior that no requirement names is a free choice too. Keep it unless a
change has a reason. [General](general.md) has the items that apply to the whole
app.

A file can end with an "Open questions" section for decisions that are not made
yet.

After editing a spec, format it with Prettier: `pnpm format`.

## Areas

- [General](general.md): the users, the devices, the languages, new versions,
  and what the whole app doesn't need.
- [Users and login](users.md): users, login and groups.
- [Home page](home.md): the list of cartoons and their preview images.
- [Profile](profile.md): the user's own name and password.
- [Sharing](sharing.md): who can watch and edit a cartoon.
- [Library](library.md): the asset packs and their art styles.
- [Characters](characters.md): characters, props and their clips.
- [Scenes](scenes.md): backgrounds, placing actors and saving scenes.
- [Sky and weather](sky.md): the sky, the time of day and the weather of a
  scene.
- [Timeline](timeline.md): giving actors actions over time.
- [Speech bubbles](bubbles.md): texts that show on the stage for a time.
- [Properties pane](properties.md): seeing and changing all the data of the
  selection.
- [Camera](camera.md): zooming and panning across the background.
- [Cartoon](cartoon.md): putting scenes together into a cartoon.
- [Cast](cast.md): the characters and props of one cartoon, and their settings.
- [Playback and export](playback-export.md): watching the cartoon and saving it
  as a video.
- [Character studio](studio.md): the development tool for characters and clips.
- [Deployment](deployment.md): what running the app on the server needs.
