// The color settings of a rig. The paths of the SVG layers have the class of
// their color role, so the app recolors them when it draws the parts. The
// colors that the renderer draws itself, such as the rubber-hose limbs, come
// from the rig, and `colorRig` sets them from the roles.
import type {
  ColorPreset,
  Rig,
  RoleColors,
  RolePatterns,
} from '@toonhouse/model';

/** The preset that the user picked for each color setting, by setting id. */
export type ColorChoice = Record<string, string>;

/**
 * The preset of each color setting in `choice`. A setting that `choice` leaves
 * out, or names a preset that the rig doesn't have, uses its first preset.
 */
function pickedPresets(rig: Rig, choice: ColorChoice): ColorPreset[] {
  return (rig.colorSettings ?? []).flatMap((setting) => {
    const preset =
      setting.presets.find((p) => p.id === choice[setting.id]) ??
      setting.presets[0];
    return preset ? [preset] : [];
  });
}

/** The colors of the presets in `choice`, by role. */
export function presetColors(rig: Rig, choice: ColorChoice): RoleColors {
  return Object.assign(
    {},
    ...pickedPresets(rig, choice).map((p) => p.colors),
  ) as RoleColors;
}

/** The patterns of the presets in `choice`, by role. */
export function presetPatterns(rig: Rig, choice: ColorChoice): RolePatterns {
  return Object.assign(
    {},
    ...pickedPresets(rig, choice).map((p) => p.patterns ?? {}),
  ) as RolePatterns;
}

/**
 * The rig with the colors that the renderer draws taken from `roles`. Each
 * drawn color follows the role that `colorRoles` names for it, or else the
 * role of the same name.
 */
export function colorRig<R extends Rig>(rig: R, roles: RoleColors): R {
  const roleOf = (key: string) => roles[rig.colorRoles?.[key] ?? key];
  if (rig.kind === 'prop') return rig;
  const colors = { ...rig.colors };
  for (const key of Object.keys(colors) as (keyof typeof colors)[]) {
    const c = roleOf(key);
    if (c) colors[key] = c;
  }
  if (rig.kind !== 'cutout') return { ...rig, colors };
  const limbs = { ...rig.limbs };
  const sleeve = roleOf('sleeve');
  if (limbs.sleeve && sleeve) limbs.sleeve = { ...limbs.sleeve, color: sleeve };
  const leg = roleOf('leg');
  if (leg) limbs.legColor = leg;
  return { ...rig, colors, limbs };
}
