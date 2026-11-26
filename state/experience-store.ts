import { create } from "zustand";
import { canTransitionScene, EXPERIENCE_SCENES, type ExperienceScene } from "@/experience/scenes";

interface ExperienceState {
  scene: ExperienceScene;
  soundEnabled: boolean;
  hasInteracted: boolean;

  transitionTo: (target: ExperienceScene) => boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  recordInteraction: () => void;
  reset: () => void;
  developmentOverride: (scene: ExperienceScene) => boolean;
}

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  scene: "BLACK_INTRO",
  soundEnabled: true,
  hasInteracted: false,

  transitionTo: (targetScene) => {
    const current = get().scene;
    if (!canTransitionScene(current, targetScene)) {
      console.warn(`[SceneGraph] Invalid transition from ${current} to ${targetScene}`);
      return false;
    }
    set({ scene: targetScene });
    return true;
  },

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  recordInteraction: () => set({ hasInteracted: true }),

  reset: () => set({ scene: "BLACK_INTRO" }),

  developmentOverride: (scene) => {
    if (EXPERIENCE_SCENES.includes(scene)) {
      set({ scene });
      return true;
    }
    return false;
  },
}));
