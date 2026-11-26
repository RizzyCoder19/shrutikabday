export const EXPERIENCE_SCENES = [
  "BLACK_INTRO",
  "SPIDERMAN",
  "GIRL_BEHIND_NAME",
  "TWO_YEARS_AGO",
  "INSTAGRAM_ARCHIVE",
  "FLOWER_GARDEN",
  "MEMORY_CONSTELLATION",
  "HEART_TREE",
  "BIRTHDAY_CAKE",
  "LETTER",
  "WRAP_UP",
  "MEMORY_GALAXY",
] as const;

export type ExperienceScene = (typeof EXPERIENCE_SCENES)[number];

export const SCENE_METADATA: Record<
  ExperienceScene,
  { number: string; title: string }
> = {
  BLACK_INTRO: { number: "01", title: "Hey, Gheli" },
  SPIDERMAN: { number: "02", title: "Spider-Man" },
  GIRL_BEHIND_NAME: { number: "03", title: "But That's Gheli" },
  TWO_YEARS_AGO: { number: "04", title: "Two Years Ago" },
  INSTAGRAM_ARCHIVE: { number: "05", title: "Where It Began" },
  FLOWER_GARDEN: { number: "06", title: "Little Garden" },
  MEMORY_CONSTELLATION: { number: "07", title: "Moments" },
  HEART_TREE: { number: "08", title: "One Little Moment" },
  BIRTHDAY_CAKE: { number: "09", title: "This Moment" },
  LETTER: { number: "10", title: "A Little Note" },
  WRAP_UP: { number: "11", title: "Let's Wrap This Up" },
  MEMORY_GALAXY: { number: "12", title: "Memory Galaxy" },
};

export const SCENE_TRANSITIONS: Readonly<
  Record<ExperienceScene, readonly ExperienceScene[]>
> = {
  BLACK_INTRO: ["SPIDERMAN"],
  SPIDERMAN: ["GIRL_BEHIND_NAME"],
  GIRL_BEHIND_NAME: ["TWO_YEARS_AGO"],
  TWO_YEARS_AGO: ["INSTAGRAM_ARCHIVE"],
  INSTAGRAM_ARCHIVE: ["FLOWER_GARDEN"],
  FLOWER_GARDEN: ["MEMORY_CONSTELLATION"],
  MEMORY_CONSTELLATION: ["HEART_TREE"],
  HEART_TREE: ["BIRTHDAY_CAKE"],
  BIRTHDAY_CAKE: ["LETTER"],
  LETTER: ["WRAP_UP"],
  WRAP_UP: ["MEMORY_GALAXY"],
  MEMORY_GALAXY: ["BLACK_INTRO"],
};

export function canTransitionScene(
  from: ExperienceScene,
  to: ExperienceScene
): boolean {
  return SCENE_TRANSITIONS[from]?.includes(to) ?? false;
}
