export interface LetterSection {
  type: "greeting" | "paragraph" | "highlight" | "closing" | "signoff";
  text: string;
}

export const BIRTHDAY_LETTER: {
  title: string;
  date: string;
  sections: LetterSection[];
} = {
  title: "For Shruti",
  date: "25 November 2026",
  sections: [
    {
      type: "greeting",
      text: "Shruti,",
    },
    {
      type: "paragraph",
      text: "Two years ago, it started with one simple birthday reply — and you asking right away who I was.",
    },
    {
      type: "highlight",
      text: "Looking back, what stayed with me were the little things: you wondering how I noticed details you never mentioned, offering ₹100 just to find out my name, and those unmistakable nakhre you pretend aren't there.",
    },
    {
      type: "paragraph",
      text: "Since I couldn't hand you flowers today, I wanted to leave you something quiet you can come back to whenever you like.",
    },
    {
      type: "closing",
      text: "Stay just as unapologetically Gheli as you are. Nothing expected in return — just wishing you a genuinely good year ahead.",
    },
    {
      type: "signoff",
      text: "Happy Birthday, Shruti.",
    },
  ],
};
