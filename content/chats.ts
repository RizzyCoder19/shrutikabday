export interface QuotedReplyPreview {
  label: string;
  preview: string;
  quoteFrom: "shruti" | "me";
}

export interface AuthenticChatMessage {
  id: string;
  sender: "shruti" | "me";
  text: string;
  messageType?: "text" | "emoji";
  reaction?: string;
  replyContext?: string;
  quotedReply?: QuotedReplyPreview;
  dateBefore?: string;
  overnightGapBefore?: boolean;
  storyBeatDivider?: string;
  statusBarTimeOverride?: string;
  batteryPctOverride?: number;
  delayAfterPrevSec: number;
}

export interface AuthenticScreenshotRef {
  id: string;
  src: string;
  width: number;
  height: number;
  label: string;
}

export interface ChatConversation {
  id: string;
  part: 1 | 2;
  editorialLines: string[];
  editorialSubtitle: string;
  statusBarTime: string;
  batteryPct: number;
  showProfileIntro: boolean;
  showSeenReceipt: boolean;
  readingPauseSec: number;
  messages: AuthenticChatMessage[];
  sourceScreenshots: AuthenticScreenshotRef[];
}

export const SHRUTI_CHAT_PROFILE = {
  displayName: "shruti.....",
  handle: "shruti_chaubey77",
  joined: "Joined Aug 2021",
  avatar: "/images/chats/pfp.jpg",
};

/**
 * PART ONE — Authentic first conversation reconstructed verbatim
 * from chats/1000019990.jpg, chats/1000019992.jpg, and chats/1000019989.jpg.
 */
export const PART_ONE_CONVERSATION: ChatConversation = {
  id: "part1-first-reply",
  part: 1,
  editorialLines: ["The first birthday reply."],
  editorialSubtitle: "25 NOV 2024",
  statusBarTime: "3:52",
  batteryPct: 25,
  showProfileIntro: true,
  showSeenReceipt: true,
  readingPauseSec: 3.0,
  messages: [
    {
      id: "fc-1",
      sender: "me",
      text: "is it your birthday dear???",
      dateBefore: "25 NOV 2024",
      replyContext: "You replied to their story",
      delayAfterPrevSec: 0.9,
    },
    { id: "fc-2", sender: "shruti", text: "Yeah", delayAfterPrevSec: 1.0 },
    {
      id: "fc-3",
      sender: "shruti",
      text: "But sorry i can't recognize u may I know your name??",
      delayAfterPrevSec: 1.3,
    },
    { id: "fc-4", sender: "me", text: "you wouldn't dear", delayAfterPrevSec: 1.1 },
    {
      id: "fc-5",
      sender: "me",
      text: "i'm just a random stranger who just felt attracted towards you",
      delayAfterPrevSec: 1.4,
    },
    {
      id: "fc-6",
      sender: "me",
      text: "And as it's your birthday today...happy birthday! 🎉🎂 Wishing you a fantastic year ahead filled with happiness and success!",
      reaction: "❤️",
      delayAfterPrevSec: 1.9,
    },
    {
      id: "fc-7",
      sender: "me",
      text: "You know..they say the stars shine brighter on special days but tonight they have some serious competition—you!",
      reaction: "❤️",
      delayAfterPrevSec: 2.1,
    },
    {
      id: "fc-8",
      sender: "me",
      text: "If your day was even half as incredible as you are, I'm sure it was unforgettable. 😉 Wishing you a year ahead full of smiles, surprises, and maybe someone who won't miss wishing you on time next year",
      reaction: "❤️",
      delayAfterPrevSec: 2.3,
    },
    {
      id: "fc-9",
      sender: "shruti",
      text: "Thanku so much...",
      dateBefore: "26 NOV 2024",
      overnightGapBefore: true,
      replyContext: "Mentioned you in their story",
      delayAfterPrevSec: 1.6,
    },
    { id: "fc-10", sender: "shruti", text: "Your name??", delayAfterPrevSec: 1.1 },
  ],
  sourceScreenshots: [
    {
      id: "first-1",
      src: "/images/chats/1000019990.jpg",
      width: 1080,
      height: 2340,
      label: "25 NOV 2024 — Opening",
    },
    {
      id: "first-2",
      src: "/images/chats/1000019992.jpg",
      width: 1080,
      height: 2340,
      label: "25 NOV 2024 — Birthday Wishes",
    },
    {
      id: "first-3",
      src: "/images/chats/1000019989.jpg",
      width: 1080,
      height: 1479,
      label: "26 NOV 2024 — Story Mention",
    },
  ],
};

/**
 * PART TWO — Three cohesive storytelling arcs reconstructed verbatim
 * from all 5 verified screenshots in public/images/chats/moments/.
 */
export const LITTLE_MOMENT_CONVERSATIONS: ChatConversation[] = [
  {
    id: "story-vrat-mystery-reveal",
    part: 2,
    editorialLines: [
      "Remember how we used to talk before?",
      "You don't? Never mind. I'll show you.",
    ],
    editorialSubtitle: "Moment 1 of 3 • The Vrat Question",
    statusBarTime: "4:19",
    batteryPct: 18,
    showProfileIntro: false,
    showSeenReceipt: false,
    readingPauseSec: 3.2,
    sourceScreenshots: [
      {
        id: "vrat-1",
        src: "/images/chats/moments/1000019986.jpg",
        width: 1080,
        height: 2340,
        label: "The Vrat Question (1/3)",
      },
      {
        id: "vrat-2",
        src: "/images/chats/moments/1000019985.jpg",
        width: 1080,
        height: 2340,
        label: "The Mystery Build-up (2/3)",
      },
      {
        id: "vrat-3",
        src: "/images/chats/moments/1000019988.jpg",
        width: 1080,
        height: 2340,
        label: "The Reveal (3/3)",
      },
    ],
    messages: [
      // Act 1 — 1000019986.jpg (4:19, 18%)
      { id: "v1-1", sender: "me", text: "aur btw", delayAfterPrevSec: 0.8 },
      { id: "v1-2", sender: "me", text: "tera vrat haina", delayAfterPrevSec: 0.9 },
      {
        id: "v1-3",
        sender: "me",
        text: "kiske liye rakhi hai madam",
        delayAfterPrevSec: 1.05,
      },
      {
        id: "v1-4",
        sender: "me",
        text: "tere liye ek cheez hai mere paas",
        delayAfterPrevSec: 1.15,
      },
      {
        id: "v1-5",
        sender: "shruti",
        text: "Kya",
        quotedReply: {
          label: "Replied to you",
          preview: "tere liye ek cheez hai mere paas",
          quoteFrom: "me",
        },
        delayAfterPrevSec: 1.4,
      },
      {
        id: "v1-6",
        sender: "shruti",
        text: "Abhi filhaal no one...🙃 No one deserves me..itni achi.ldki sabke naseeb me nhi hoti.kya.pta kiske naseeb me hu mai",
        quotedReply: {
          label: "Replied to you",
          preview: "kiske liye rakhi hai madam",
          quoteFrom: "me",
        },
        delayAfterPrevSec: 2.0,
      },

      // Act 2 — 1000019985.jpg (4:19, 18% — continues immediately from Shruti quoting "tera vrat haina")
      {
        id: "v2-1",
        sender: "shruti",
        text: "Kaise pta?",
        quotedReply: {
          label: "Replied to you",
          preview: "tera vrat haina",
          quoteFrom: "me",
        },
        delayAfterPrevSec: 1.5,
      },
      {
        id: "v2-2",
        sender: "me",
        text: "naaahh dude",
        quotedReply: {
          label: "You replied",
          preview:
            "Abhi filhaal no one...🙃 No one deserves me..itni achi.ldki sabke naseeb me nhi hoti.ky...see more",
          quoteFrom: "shruti",
        },
        delayAfterPrevSec: 1.45,
      },
      { id: "v2-3", sender: "me", text: "you've got someone", delayAfterPrevSec: 0.95 },
      {
        id: "v2-4",
        sender: "me",
        text: "but you just aren't realising it",
        delayAfterPrevSec: 1.15,
      },
      {
        id: "v2-5",
        sender: "me",
        text: "ruk",
        quotedReply: {
          label: "You replied",
          preview: "Kya",
          quoteFrom: "shruti",
        },
        delayAfterPrevSec: 1.15,
      },
      {
        id: "v2-6",
        sender: "shruti",
        text: "🙃itna sure kaise ho??",
        quotedReply: {
          label: "Replied to you",
          preview: "you've got someone",
          quoteFrom: "me",
        },
        delayAfterPrevSec: 1.75,
      },

      // Act 3 — 1000019988.jpg (3:59, 24% — delivers the reveal behind how much detail someone knew)
      {
        id: "v3-1",
        sender: "shruti",
        text: "Nhi confuse kr rhe bohot",
        storyBeatDivider: "• • •",
        overnightGapBefore: true,
        statusBarTimeOverride: "3:59",
        batteryPctOverride: 24,
        delayAfterPrevSec: 1.3,
      },
      {
        id: "v3-2",
        sender: "shruti",
        text: "Jis se dimag kaam nhi kr rha",
        delayAfterPrevSec: 0.95,
      },
      {
        id: "v3-3",
        sender: "shruti",
        text: "How can someone know everything abt me🙃woh bhi itna detailed",
        delayAfterPrevSec: 1.65,
      },
      {
        id: "v3-4",
        sender: "me",
        text: "guess you're lucky then",
        delayAfterPrevSec: 1.45,
      },
      { id: "v3-5", sender: "me", text: "to have someone", delayAfterPrevSec: 0.95 },
      {
        id: "v3-6",
        sender: "shruti",
        text: "😭😭",
        messageType: "emoji",
        delayAfterPrevSec: 1.25,
      },
      {
        id: "v3-7",
        sender: "shruti",
        text: "Pr yeh toh btao kaise pata tumhe sab",
        delayAfterPrevSec: 1.2,
      },
      {
        id: "v3-8",
        sender: "shruti",
        text: "Kon ho bhai tum 😭😭",
        delayAfterPrevSec: 1.35,
      },
      {
        id: "v3-9",
        sender: "me",
        text: "😈",
        messageType: "emoji",
        quotedReply: {
          label: "You replied",
          preview: "Kon ho bhai tum 😭😭",
          quoteFrom: "shruti",
        },
        delayAfterPrevSec: 1.5,
      },
      {
        id: "v3-10",
        sender: "me",
        text: "jo dil me to aae par dimaag me nahi",
        delayAfterPrevSec: 1.5,
      },
    ],
  },
  {
    id: "story-joyful-witty",
    part: 2,
    editorialLines: ["Remember how effortlessly joyful and witty you used to be?"],
    editorialSubtitle: "Moment 2 of 3 • Playful Wit",
    statusBarTime: "4:00",
    batteryPct: 23,
    showProfileIntro: false,
    showSeenReceipt: false,
    readingPauseSec: 3.0,
    sourceScreenshots: [
      {
        id: "src-19987",
        src: "/images/chats/moments/1000019987.jpg",
        width: 1080,
        height: 2340,
        label: "A ₹100 Deal (Original Screenshot)",
      },
    ],
    messages: [
      {
        id: "m4-1",
        sender: "me",
        text: "achha ji",
        quotedReply: {
          label: "You replied",
          preview: "Shak shuru se h mujhe tum p",
          quoteFrom: "shruti",
        },
        delayAfterPrevSec: 0.9,
      },
      { id: "m4-2", sender: "shruti", text: "Haaa😭😭😭", delayAfterPrevSec: 1.2 },
      {
        id: "m4-3",
        sender: "me",
        text: "hum to hai hi isi se linked",
        delayAfterPrevSec: 1.25,
      },
      {
        id: "m4-4",
        sender: "me",
        text: "bas ab aap ko ghar se uthana baaki hai",
        delayAfterPrevSec: 1.25,
      },
      { id: "m4-5", sender: "shruti", text: "Kahi tum💀", delayAfterPrevSec: 1.55 },
      {
        id: "m4-6",
        sender: "me",
        text: "hmm....",
        quotedReply: {
          label: "You replied",
          preview: "Kahi tum💀",
          quoteFrom: "shruti",
        },
        delayAfterPrevSec: 1.3,
      },
      {
        id: "m4-7",
        sender: "shruti",
        text: "Bhai 100 rupaye dugi bta do kon ho",
        delayAfterPrevSec: 1.6,
      },
      { id: "m4-8", sender: "shruti", text: "Or picha chor do", delayAfterPrevSec: 0.9 },
      {
        id: "m4-9",
        sender: "shruti",
        text: "😭😂",
        messageType: "emoji",
        delayAfterPrevSec: 1.1,
      },
    ],
  },
  {
    id: "story-final-nakhre",
    part: 2,
    editorialLines: [
      "And then... ek nazar tumhare un nakhron par bhi, jin par main fida tha.",
    ],
    editorialSubtitle: "Final Moment • The Nakhre",
    statusBarTime: "3:51",
    batteryPct: 25,
    showProfileIntro: false,
    showSeenReceipt: false,
    readingPauseSec: 3.2,
    sourceScreenshots: [
      {
        id: "src-19991",
        src: "/images/chats/moments/1000019991.jpg",
        width: 1080,
        height: 2340,
        label: "The Nakhre (Original Screenshot)",
      },
    ],
    messages: [
      { id: "m5-1", sender: "me", text: "soja", delayAfterPrevSec: 0.8 },
      {
        id: "m5-2",
        sender: "shruti",
        text: "Woh meri marzi h",
        delayAfterPrevSec: 1.2,
      },
      {
        id: "m5-3",
        sender: "shruti",
        text: "Tumhe soona h jao soo..",
        delayAfterPrevSec: 1.05,
      },
      { id: "m5-4", sender: "shruti", text: "Huh", delayAfterPrevSec: 0.85 },
      {
        id: "m5-5",
        sender: "me",
        text: "baat baat pe mu phula leti hai",
        delayAfterPrevSec: 1.4,
      },
      {
        id: "m5-6",
        sender: "me",
        text: "kitni nakchadi hai💕",
        delayAfterPrevSec: 1.15,
      },
      { id: "m5-7", sender: "shruti", text: "Ik", delayAfterPrevSec: 1.2 },
      { id: "m5-8", sender: "shruti", text: "Toh??", delayAfterPrevSec: 0.85 },
      {
        id: "m5-9",
        sender: "shruti",
        text: "Kya kr loge tum",
        delayAfterPrevSec: 1.05,
      },
      {
        id: "m5-10",
        sender: "me",
        text: "Bas tumhara saath mil jaye, phir dekhna, kya kya kar leta hoon!",
        delayAfterPrevSec: 1.7,
      },
      {
        id: "m5-11",
        sender: "shruti",
        text: "🙂",
        messageType: "emoji",
        delayAfterPrevSec: 1.5,
      },
    ],
  },
];

// Exported flat collections for MemoryGalaxyScene compatibility
export const FIRST_CHAT_SCREENSHOTS = PART_ONE_CONVERSATION.sourceScreenshots;
export const MOMENTS_CHAT_SCREENSHOTS = LITTLE_MOMENT_CONVERSATIONS.flatMap(
  (c) => c.sourceScreenshots
);
