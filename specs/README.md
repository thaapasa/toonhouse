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

A file can end with an "Open questions" section for decisions that are not made
yet.

After editing a spec, format it with Prettier: `pnpm format`.

## Areas

- [General](general.md): the users, the devices, the languages and new versions.
- [Users and login](users.md): users, login and groups.
- [Home page](home.md): the list of cartoons and their preview images.
- [Profile](profile.md): the user's own name and password.
- [Sharing](sharing.md): who can watch and edit a cartoon.
- [Library](library.md): the asset packs and their art styles.
- [Characters](characters.md): characters, props and their clips.
- [Scenes](scenes.md): backgrounds, placing actors and saving scenes.
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
