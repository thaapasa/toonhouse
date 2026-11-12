# Specs

Requirements for the app, one file per area. Agents use these files for feature
planning and implementation.

Each file has a heading, a short description of the area and a list of
requirements:

- `- [ ]` means planned.
- `- [x]` means implemented.

Keep requirements at the level of what a user or caller can do. Leave
implementation details to the code. When a requirement depends on another area,
link to that area's file.

A file can end with an "Open questions" section for decisions that are not made
yet.

After editing a spec, format it with Prettier: `pnpm format`.

## Areas

- [General](general.md): the users, the devices and the languages.
- [Characters](characters.md): characters, props and their animations.
- [Scenes](scenes.md): backgrounds, placing actors and saving scenes.
- [Timeline](timeline.md): giving actors actions over time.
- [Playback and export](playback-export.md): watching the cartoon and saving it
  as a video.
