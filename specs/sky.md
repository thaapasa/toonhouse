# Sky and weather

Each [scene](scenes.md) has a sky and a weather of its own, apart from its
background. So the user can put any sky over any background: a blue sky, the
peach sky of the harbor or space. The time of day moves the sun, the moon and
the stars, and it makes the scene darker at night. The weather adds clouds,
rain, snow and mist. Both can change on the [timeline](timeline.md).

- [ ] The sky is drawn behind all layers of the background. A background has no
      sky of its own.
- [ ] The sun, the moon and the clouds move with the time of day and the
      weather. A background has no clips.
- [ ] An indoor background has see-through windows, and the sky and the weather
      show through them.
- [ ] Each scene looks a little different, even with the same settings. For
      example, two scenes with many clouds have their clouds in different
      places. The look comes from a random number that the scene saves, so the
      scene looks the same each time it plays and in the exported video.
- [ ] User can try a different look for the clouds, the rain, the snow, the mist
      and the stars of a scene with one button.
- [ ] A new scene starts with the sky, the time of day and the weather that the
      scene before it has at its end. The first scene starts with the default
      sky of its background, at noon, with fair weather.

## The sky

- [ ] User can pick the sky of a scene: a preset sky, a color or a gradient of
      two colors that the user picks, or space.
- [ ] The preset skies include the peach sky of the harbor.
- [ ] A background gives a default sky, which a new scene on it gets.
- [ ] The space sky has stars, and it doesn't change with the time of day.

## Time of day

- [ ] User can turn the sun on and off for a scene. When the sun is off, the
      scene has no sun, no moon and no stars, and it doesn't get darker at
      night.
- [ ] User sets the time of day at the start of the scene. The time stays there
      unless the timeline changes it.
- [ ] User can change the time of day on the timeline. A change goes from the
      time where the scene is to a new time over a length that the user picks,
      so that the sun moves slowly or quickly.
- [ ] A change of the time of day can go past midnight to the next day, and
      through several days.
- [ ] The sun rises, goes across the sky and sets behind the background. The
      background sets the path of the sun.
- [ ] At night the moon goes across the sky, and the stars fade in.
- [ ] The colors of the sky change with the time of day, through dusk to night.
- [ ] At night the scene gets darker and bluer, except for the speech bubbles,
      which stay as they are. Indoors the scene gets less dark, as the room has
      lights.

## Weather

- [ ] User sets the weather at the start of the scene: how many clouds, how dark
      they are, the wind, the rain, the snow and the mist.
- [ ] User can change the weather on the timeline. A change goes from the
      weather where the scene is to the new weather over a length that the user
      picks. It changes only the settings that the user sets in it, so a change
      to rain keeps the clouds as they are.
- [ ] When the clouds grow, new clouds come in from the sides of the frame. When
      they get fewer, clouds go out the same way. The clouds don't appear or
      disappear in place.
- [ ] The clouds drift with the wind.
- [ ] User can set rain, snow and mist each on its own, and how heavy each one
      is. When the rain or the snow gets heavier, more drops or flakes fall. The
      ones that fall already keep falling.
- [ ] The wind slants the rain and makes the snow drift.
- [ ] The wind sets how strongly the props rustle.
- [ ] Outdoors, the rain and the snow fall both behind the actors and in front
      of them. Indoors, they fall only outside the windows.
- [ ] The mist lies between the layers of the background, so the far layers get
      hazier than the near ones.

## Future work

These are ideas for later. They are not planned yet.

- [ ] User can add leaves that blow in the wind to any scene, as an effect of
      the weather.
- [ ] Each asset pack can have its own drawings for the clouds, the rain and the
      snow. For now, every pack uses the same ones.
- [ ] User can put a lightning at a point on the timeline. A lightning has
      drawings of its own, it lights up the scene for a moment, and characters
      can react to it.
