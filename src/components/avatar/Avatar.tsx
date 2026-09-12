// src/components/avatar/Avatar.tsx
import React from "react";
import { AvatarGradientsDef, AvatarBackdropLayer } from "./AvatarBackdrops";
import { AvatarSuitLayer } from "./AvatarSuits";
import { AvatarFaceLayer, AvatarHairLayer, AvatarAccessoryLayer } from "./AvatarFeatures";

export type BackdropTheme = 
  | "amber" | "pink" | "emerald" | "sky" | "rose" | "violet"
  | "spiderVerse" | "starkTech" | "bifrost" | "wakandaSunset" | "cosmicSpace"
  | "heelerBackyard" | "keepyUppy" | "danceMode" | "magicAsparagus" | "fairyGarden"
  | "chuuPeach";

export type HeroSuit = "classic" | "spiderSuit" | "ironArmor" | "blueyPup" | "bingoPup" | "chuuIdol";
export type FaceExpression = "happy" | "determined" | "cool" | "starEyes" | "playful" | "superhero" | "chuuWink";
export type HairStyle = "none" | "spiky" | "wizard" | "braids" | "curls" | "cap" | "blueyEars" | "bingoEars" | "heroCowl" | "chuuPigtails";
export type AccessoryType = "none" | "crown" | "glasses" | "headphones" | "sword" | "webShooter" | "magicWand" | "lightning" | "chuuHeart";

export interface AvatarConfig {
  bg: BackdropTheme;
  suit?: HeroSuit;
  face: FaceExpression;
  hair: HairStyle;
  accessory: AccessoryType;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  bg: "amber",
  suit: "classic",
  face: "happy",
  hair: "none",
  accessory: "none",
};

export function parseAvatarConfig(configStr?: string): AvatarConfig {
  if (!configStr) return DEFAULT_AVATAR;
  try {
    const parsed = JSON.parse(configStr);
    return { ...DEFAULT_AVATAR, ...parsed };
  } catch {
    return DEFAULT_AVATAR;
  }
}

export function Avatar({ 
  config, 
  className = "size-20" 
}: { 
  config: AvatarConfig; 
  className?: string 
}) {
  const currentConfig = { ...DEFAULT_AVATAR, ...config };
  const { bg, suit = "classic", face, hair, accessory } = currentConfig;
  const isSpider = suit === "spiderSuit";

  return (
    <div 
      className={`rounded-[1.75rem] sm:rounded-[2.25rem] overflow-hidden shadow-inner flex items-center justify-center shrink-0 relative select-none ${className}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full select-none pointer-events-none">
        <AvatarGradientsDef />
        <AvatarBackdropLayer bg={bg} />
        <AvatarSuitLayer suit={suit} />
        <AvatarFaceLayer face={face} isSpider={isSpider} />
        <AvatarHairLayer hair={hair} />
        <AvatarAccessoryLayer accessory={accessory} />
      </svg>
    </div>
  );
}
