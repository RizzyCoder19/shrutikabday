export interface BirthdayProfile {
  name: string;
  nickname: string;
  birthDate: string; // "2026-11-25"
  displayDate: string; // "25 November 2026"
  title: string;
  subtitle: string;
  theme: {
    primaryPalette: {
      deepPlum: string;
      mutedLavender: string;
      dustyRose: string;
      warmPeach: string;
      softIvory: string;
      champagneGold: string;
    };
  };
}

export const BIRTHDAY_DATA: BirthdayProfile = {
  name: "Shruti",
  nickname: "Gheli",
  birthDate: "2026-11-25",
  displayDate: "25 November 2026",
  title: "GHELI",
  subtitle: "The Art of Being You",
  theme: {
    primaryPalette: {
      deepPlum: "#17172C",
      mutedLavender: "#7770A8",
      dustyRose: "#D9A6B7",
      warmPeach: "#F3D9C9",
      softIvory: "#FFF2E4",
      champagneGold: "#E9C77D",
    },
  },
};
