// src/components/avatar/Avatar.tsx
import React from "react";

export type BackdropTheme = 
  | "amber" | "pink" | "emerald" | "sky" | "rose" | "violet"
  // Marvel Themes
  | "spiderVerse" | "starkTech" | "bifrost" | "wakandaSunset" | "cosmicSpace"
  // Bluey Themes
  | "heelerBackyard" | "keepyUppy" | "danceMode" | "magicAsparagus" | "fairyGarden";

export type HeroSuit = 
  | "classic" 
  | "spiderSuit" 
  | "ironArmor" 
  | "thorArmor" 
  | "captainShield" 
  | "greenTitan"
  | "blueyPup" 
  | "bingoPup" 
  | "magicFairy" 
  | "explorerPup";

export type FaceExpression = "happy" | "determined" | "cool" | "starEyes" | "playful" | "superhero";

export type HairStyle = "none" | "spiky" | "wizard" | "braids" | "curls" | "cap" | "blueyEars" | "bingoEars" | "heroCowl";

export type AccessoryType = "none" | "crown" | "glasses" | "headphones" | "sword" | "webShooter" | "magicWand" | "lightning";

export interface AvatarConfig {
  bg: BackdropTheme;
  suit?: HeroSuit;
  face: FaceExpression;
  hair: HairStyle;
  accessory: AccessoryType;
  aura?: "none" | "flame" | "lightning" | "rainbow" | "sparkles";
}

export const DEFAULT_AVATAR: AvatarConfig = {
  bg: "amber",
  suit: "classic",
  face: "happy",
  hair: "none",
  accessory: "none",
  aura: "none"
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
  const { bg, suit = "classic", face, hair, accessory, aura = "none" } = currentConfig;

  return (
    <div 
      className={`rounded-[1.75rem] sm:rounded-[2.25rem] overflow-hidden shadow-inner flex items-center justify-center shrink-0 relative select-none ${className}`}
    >
      {/* SVG Character & Themed Backdrop */}
      <svg viewBox="0 0 100 100" className="w-full h-full select-none pointer-events-none">
        <defs>
          {/* MARVEL GRADIENTS */}
          <linearGradient id="spiderVerseGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#831843" />
            <stop offset="50%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="starkTechGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="60%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          <linearGradient id="bifrostGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="25%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          <linearGradient id="wakandaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="50%" stopColor="#701a75" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          <linearGradient id="cosmicSpaceGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#090d16" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#312e81" />
          </linearGradient>

          {/* BLUEY GRADIENTS */}
          <linearGradient id="heelerBackyardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#bae6fd" />
            <stop offset="56%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          <linearGradient id="keepyUppyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>

          <linearGradient id="danceModeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="33%" stopColor="#8b5cf6" />
            <stop offset="66%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>

          <linearGradient id="magicAsparagusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>

          <linearGradient id="fairyGardenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
        </defs>

        {/* --- LAYER 0: THEMED BACKDROP --- */}
        {/* Basic Colors */}
        {bg === "amber" && <rect width="100" height="100" fill="#f59e0b" />}
        {bg === "pink" && <rect width="100" height="100" fill="#ec4899" />}
        {bg === "emerald" && <rect width="100" height="100" fill="#10b981" />}
        {bg === "sky" && <rect width="100" height="100" fill="#0ea5e9" />}
        {bg === "rose" && <rect width="100" height="100" fill="#f43f5e" />}
        {bg === "violet" && <rect width="100" height="100" fill="#8b5cf6" />}

        {/* Marvel Backdrops */}
        {bg === "spiderVerse" && (
          <g>
            <rect width="100" height="100" fill="url(#spiderVerseGrad)" />
            <path d="M0 70 L20 60 L35 75 L55 55 L75 70 L100 50 L100 100 L0 100 Z" fill="#090514" opacity="0.6" />
            <path d="M10 20 L90 80 M90 20 L10 80 M50 10 L50 90 M10 50 L90 50" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
          </g>
        )}

        {bg === "starkTech" && (
          <g>
            <rect width="100" height="100" fill="url(#starkTechGrad)" />
            <circle cx="50" cy="50" r="40" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4,4" fill="none" opacity="0.4" />
            <circle cx="50" cy="50" r="28" stroke="#38bdf8" strokeWidth="0.5" fill="none" opacity="0.3" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#38bdf8" strokeWidth="0.5" opacity="0.3" />
          </g>
        )}

        {bg === "bifrost" && (
          <g>
            <rect width="100" height="100" fill="url(#bifrostGrad)" />
            <circle cx="20" cy="20" r="1.5" fill="#ffffff" opacity="0.8" />
            <circle cx="80" cy="25" r="1.2" fill="#ffffff" opacity="0.7" />
            <circle cx="30" cy="75" r="1.8" fill="#ffffff" opacity="0.9" />
            <circle cx="75" cy="80" r="1.5" fill="#ffffff" opacity="0.8" />
          </g>
        )}

        {bg === "wakandaSunset" && (
          <g>
            <rect width="100" height="100" fill="url(#wakandaGrad)" />
            <circle cx="50" cy="65" r="28" fill="#fbbf24" opacity="0.35" />
            <polygon points="50,15 55,25 45,25" fill="#fbbf24" opacity="0.4" />
          </g>
        )}

        {bg === "cosmicSpace" && (
          <g>
            <rect width="100" height="100" fill="url(#cosmicSpaceGrad)" />
            <circle cx="15" cy="18" r="1" fill="#fff" />
            <circle cx="85" cy="15" r="1.5" fill="#fff" />
            <circle cx="78" cy="75" r="1" fill="#fff" />
            <circle cx="25" cy="80" r="1.2" fill="#fff" />
            <path d="M70 30 Q75 25 80 30 Q75 35 70 30" fill="#f43f5e" opacity="0.6" />
          </g>
        )}

        {/* Bluey Backdrops */}
        {bg === "heelerBackyard" && (
          <g>
            <rect width="100" height="100" fill="url(#heelerBackyardGrad)" />
            {/* Jacaranda Tree Blooms */}
            <circle cx="15" cy="25" r="14" fill="#c084fc" opacity="0.8" />
            <circle cx="28" cy="18" r="10" fill="#a855f7" opacity="0.7" />
            <circle cx="88" cy="22" r="12" fill="#c084fc" opacity="0.75" />
            {/* White fence posts */}
            <rect x="5" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
            <rect x="15" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
            <rect x="80" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
            <rect x="90" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
          </g>
        )}

        {bg === "keepyUppy" && (
          <g>
            <rect width="100" height="100" fill="url(#keepyUppyGrad)" />
            {/* Red Keepy Uppy Balloon */}
            <g transform="translate(68, 12)">
              <ellipse cx="12" cy="14" rx="10" ry="12" fill="#ef4444" />
              <ellipse cx="9" cy="10" rx="3" ry="5" fill="#fca5a5" opacity="0.6" />
              <polygon points="12,26 10,29 14,29" fill="#dc2626" />
              <path d="M12 29 Q10 34 13 38" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.8" />
            </g>
            {/* Fluffy clouds */}
            <circle cx="20" cy="25" r="10" fill="#ffffff" opacity="0.7" />
            <circle cx="30" cy="22" r="12" fill="#ffffff" opacity="0.7" />
            <circle cx="38" cy="26" r="8" fill="#ffffff" opacity="0.7" />
          </g>
        )}

        {bg === "danceMode" && (
          <g>
            <rect width="100" height="100" fill="url(#danceModeGrad)" />
            {/* Confetti & Sparkles */}
            <rect x="15" y="20" width="3" height="7" rx="1" fill="#ffffff" transform="rotate(25 15 20)" />
            <rect x="80" y="25" width="3" height="7" rx="1" fill="#fef08a" transform="rotate(-35 80 25)" />
            <rect x="25" y="75" width="4" height="8" rx="1" fill="#67e8f9" transform="rotate(45 25 75)" />
            <rect x="75" y="70" width="3" height="7" rx="1" fill="#f472b6" transform="rotate(-20 75 70)" />
            <circle cx="50" cy="15" r="3" fill="#ffffff" />
          </g>
        )}

        {bg === "magicAsparagus" && (
          <g>
            <rect width="100" height="100" fill="url(#magicAsparagusGrad)" />
            {/* Magic Wand Sparkles */}
            <polygon points="20,20 22,25 27,25 23,28 25,33 20,30 15,33 17,28 13,25 18,25" fill="#fef08a" opacity="0.8" />
            <polygon points="80,30 82,34 86,34 83,36 84,40 80,38 76,40 77,36 74,34 78,34" fill="#fef08a" opacity="0.7" />
          </g>
        )}

        {bg === "fairyGarden" && (
          <g>
            <rect width="100" height="100" fill="url(#fairyGardenGrad)" />
            <circle cx="20" cy="20" r="3" fill="#ffffff" opacity="0.8" />
            <circle cx="80" cy="30" r="4" fill="#ffffff" opacity="0.7" />
            <circle cx="30" cy="80" r="3" fill="#ffffff" opacity="0.8" />
          </g>
        )}

        {/* --- LAYER 1: SUIT / HERO BODY BASE --- */}
        {suit === "spiderSuit" ? (
          <g>
            {/* Spider Suit Red & Blue Torso */}
            <path d="M20 85 C20 66, 30 58, 50 58 C70 58, 80 66, 80 85 Z" fill="#dc2626" />
            <path d="M20 75 C25 68, 32 68, 36 85 Z" fill="#2563eb" />
            <path d="M80 75 C75 68, 68 68, 64 85 Z" fill="#2563eb" />
            {/* Spider Chest Emblem */}
            <circle cx="50" cy="72" r="3" fill="#0f172a" />
            <line x1="50" y1="68" x2="44" y2="64" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="50" y1="68" x2="56" y2="64" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="50" y1="76" x2="43" y2="80" stroke="#0f172a" strokeWidth="1.2" />
            <line x1="50" y1="76" x2="57" y2="80" stroke="#0f172a" strokeWidth="1.2" />
            {/* Head Base (Red Mask or Skin) */}
            <circle cx="50" cy="42" r="19" fill="#dc2626" />
            {/* Web lines on Mask */}
            <circle cx="50" cy="42" r="13" stroke="#991b1b" strokeWidth="0.8" fill="none" opacity="0.6" />
            <circle cx="50" cy="42" r="7" stroke="#991b1b" strokeWidth="0.8" fill="none" opacity="0.6" />
            <line x1="50" y1="23" x2="50" y2="61" stroke="#991b1b" strokeWidth="0.8" opacity="0.6" />
            <line x1="31" y1="42" x2="69" y2="42" stroke="#991b1b" strokeWidth="0.8" opacity="0.6" />
          </g>
        ) : suit === "ironArmor" ? (
          <g>
            {/* Iron Armor Red & Gold */}
            <path d="M20 85 C20 66, 30 58, 50 58 C70 58, 80 66, 80 85 Z" fill="#991b1b" />
            <path d="M36 65 L64 65 L60 85 L40 85 Z" fill="#eab308" />
            {/* Arc Reactor Glow */}
            <circle cx="50" cy="72" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
            <circle cx="50" cy="42" r="19" fill="#fdedd3" />
          </g>
        ) : suit === "blueyPup" ? (
          <g>
            {/* Bluey Heeler Body */}
            <path d="M22 85 C22 66, 30 58, 50 58 C70 58, 78 66, 78 85 Z" fill="#60a5fa" />
            <path d="M38 85 C38 70, 42 66, 50 66 C58 66, 62 70, 62 85 Z" fill="#93c5fd" />
            {/* Bluey Pup Head */}
            <circle cx="50" cy="42" r="20" fill="#60a5fa" />
            {/* Bluey Dark Blue Eyepatch/Spot */}
            <path d="M50 24 C58 24, 69 32, 68 44 C67 52, 58 52, 50 50 Z" fill="#1e3a8a" opacity="0.85" />
            {/* Bluey Tan Snout Muzzle */}
            <ellipse cx="50" cy="47" rx="11" ry="8" fill="#fed7aa" />
            <ellipse cx="50" cy="43" rx="3.5" ry="2.5" fill="#1e293b" />
          </g>
        ) : suit === "bingoPup" ? (
          <g>
            {/* Bingo Heeler Body */}
            <path d="M22 85 C22 66, 30 58, 50 58 C70 58, 78 66, 78 85 Z" fill="#fb923c" />
            <path d="M38 85 C38 70, 42 66, 50 66 C58 66, 62 70, 62 85 Z" fill="#fed7aa" />
            {/* Bingo Head */}
            <circle cx="50" cy="42" r="20" fill="#fb923c" />
            {/* Dark Orange Spot */}
            <path d="M50 24 C58 24, 69 32, 68 44 C67 52, 58 52, 50 50 Z" fill="#c2410c" opacity="0.85" />
            {/* Tan Muzzle */}
            <ellipse cx="50" cy="47" rx="11" ry="8" fill="#fef08a" />
            <ellipse cx="50" cy="43" rx="3.5" ry="2.5" fill="#1e293b" />
          </g>
        ) : (
          /* Classic Hero Standard Suit */
          <g>
            <path d="M22 85 C22 68, 30 60, 50 60 C70 60, 78 68, 78 85 Z" fill="#334155" />
            <path d="M35 85 C35 72, 40 68, 50 68 C60 68, 65 72, 65 85 Z" fill="#f1f5f9" />
            <circle cx="50" cy="55" r="5" fill="#fbcfe8" />
            <circle cx="50" cy="42" r="19" fill="#fdedd3" />
          </g>
        )}

        {/* --- LAYER 2: EXPRESSIONS & EYES --- */}
        {suit === "spiderSuit" ? (
          <g>
            {/* Spider Mask Angled Eyes */}
            <polygon points="36,36 46,41 44,46 34,42" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
            <polygon points="64,36 54,41 56,46 66,42" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          </g>
        ) : (
          <>
            {face === "happy" && (
              <g>
                <ellipse cx="42" cy="41" rx="2.5" ry="4" fill="#1e293b" />
                <circle cx="41.2" cy="39.5" r="0.8" fill="#ffffff" />
                <ellipse cx="58" cy="41" rx="2.5" ry="4" fill="#1e293b" />
                <circle cx="57.2" cy="39.5" r="0.8" fill="#ffffff" />
                <circle cx="37" cy="46" r="3" fill="#fca5a5" opacity="0.5" />
                <circle cx="63" cy="46" r="3" fill="#fca5a5" opacity="0.5" />
                <path d="M45 49 Q50 54 55 49" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            )}

            {face === "playful" && (
              <g>
                {/* Winking Playful Face */}
                <ellipse cx="42" cy="41" rx="2.5" ry="4" fill="#1e293b" />
                <circle cx="41.2" cy="39.5" r="0.8" fill="#ffffff" />
                <path d="M54 41 Q58 37 62 41" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="37" cy="46" r="3" fill="#fca5a5" opacity="0.5" />
                <circle cx="63" cy="46" r="3" fill="#fca5a5" opacity="0.5" />
                <path d="M44 49 Q50 56 56 49 Z" fill="#ef4444" stroke="#1e293b" strokeWidth="1.5" />
              </g>
            )}

            {face === "determined" && (
              <g>
                <path d="M37 36 L46 34" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M63 36 L54 34" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                <ellipse cx="42" cy="41" rx="2.5" ry="3" fill="#1e293b" />
                <circle cx="41.2" cy="40" r="0.7" fill="#ffffff" />
                <ellipse cx="58" cy="41" rx="2.5" ry="3" fill="#1e293b" />
                <circle cx="57.2" cy="40" r="0.7" fill="#ffffff" />
                <path d="M46 51 L54 51" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {face === "cool" && (
              <g stroke="#1e293b" strokeWidth="3" fill="#1e293b">
                <rect x="33" y="38" width="15" height="10" rx="3.5" />
                <rect x="52" y="38" width="15" height="10" rx="3.5" />
                <line x1="47" y1="41" x2="53" y2="41" strokeWidth="3" />
                <line x1="36" y1="41" x2="40" y2="45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="55" y1="41" x2="59" y2="45" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M46 51 Q50 54 54 51" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            )}

            {face === "starEyes" && (
              <g>
                <path d="M42 34 L44 39 L49 39 L45 42 L47 47 L42 44 L37 47 L39 42 L35 39 L40 39 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <path d="M58 34 L60 39 L65 39 L61 42 L63 47 L58 44 L53 47 L55 42 L51 39 L56 39 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
                <path d="M43 50 Q50 56 57 50" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </g>
            )}

            {face === "superhero" && (
              <g>
                {/* Superhero Mask with Glowing White Eyes */}
                <path d="M30 38 Q50 44 70 38 L68 47 Q50 52 32 47 Z" fill="#0f172a" />
                <ellipse cx="42" cy="42" rx="3.5" ry="2.5" fill="#38bdf8" />
                <ellipse cx="58" cy="42" rx="3.5" ry="2.5" fill="#38bdf8" />
                <path d="M46 52 Q50 55 54 52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
              </g>
            )}
          </>
        )}

        {/* --- LAYER 3: HAIR & PUP EARS --- */}
        {hair === "blueyEars" && (
          <g fill="#1e3a8a">
            {/* Left Heeler Ear */}
            <polygon points="32,30 20,8 38,18" stroke="#1e40af" strokeWidth="1" />
            <polygon points="30,26 23,12 36,19" fill="#fbcfe8" />
            {/* Right Heeler Ear */}
            <polygon points="68,30 80,8 62,18" stroke="#1e40af" strokeWidth="1" />
            <polygon points="70,26 77,12 64,19" fill="#fbcfe8" />
          </g>
        )}

        {hair === "bingoEars" && (
          <g fill="#c2410c">
            <polygon points="32,30 20,8 38,18" stroke="#9a3412" strokeWidth="1" />
            <polygon points="30,26 23,12 36,19" fill="#fed7aa" />
            <polygon points="68,30 80,8 62,18" stroke="#9a3412" strokeWidth="1" />
            <polygon points="70,26 77,12 64,19" fill="#fed7aa" />
          </g>
        )}

        {hair === "spiky" && (
          <path d="M28 35 Q25 24, 34 23 T42 20 T52 18 T62 21 T68 25 T72 35 Q50 24 28 35 Z" fill="#1e293b" />
        )}

        {hair === "wizard" && (
          <g>
            <path d="M26 34 L50 4 L74 34 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="1" />
            <path d="M42 20 L50 25 L58 20 L50 15 Z" fill="#eab308" />
            <ellipse cx="50" cy="34" rx="27" ry="5.5" fill="#3730a3" />
          </g>
        )}

        {hair === "braids" && (
          <g fill="#d97706">
            <path d="M31 34 Q50 25 69 34 L66 40 Q50 32 34 40 Z" />
            <circle cx="28" cy="38" r="4.5" />
            <circle cx="27" cy="45" r="4.5" />
            <circle cx="28" cy="52" r="4.5" />
            <circle cx="72" cy="38" r="4.5" />
            <circle cx="73" cy="45" r="4.5" />
            <circle cx="72" cy="52" r="4.5" />
          </g>
        )}

        {hair === "curls" && (
          <g fill="#7c2d12">
            <circle cx="34" cy="30" r="7" />
            <circle cx="42" cy="25" r="7" />
            <circle cx="50" cy="23" r="7" />
            <circle cx="58" cy="25" r="7" />
            <circle cx="66" cy="30" r="7" />
            <circle cx="29" cy="37" r="7" />
            <circle cx="71" cy="37" r="7" />
          </g>
        )}

        {hair === "cap" && (
          <g>
            <path d="M30 35 Q50 18 70 35 Z" fill="#ef4444" />
            <path d="M45 32 L78 32 Q82 35 77 39 L45 36 Z" fill="#dc2626" />
            <circle cx="50" cy="23" r="2.5" fill="#ca8a04" />
          </g>
        )}

        {hair === "heroCowl" && (
          <g fill="#0f172a">
            <polygon points="35,28 30,10 40,24" />
            <polygon points="65,28 70,10 60,24" />
          </g>
        )}

        {/* --- LAYER 4: ACCESSORIES & HERO GEAR --- */}
        {accessory === "crown" && (
          <g>
            <path d="M32 20 L40 29 L50 16 L60 29 L68 20 L64 32 L36 32 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
            <circle cx="50" cy="16" r="1.5" fill="#ef4444" />
            <circle cx="32" cy="20" r="1.5" fill="#3b82f6" />
            <circle cx="68" cy="20" r="1.5" fill="#3b82f6" />
          </g>
        )}

        {accessory === "glasses" && (
          <g stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round">
            <circle cx="41" cy="44" r="7.5" />
            <circle cx="59" cy="44" r="7.5" />
            <line x1="48.5" y1="44" x2="51.5" y2="44" />
            <path d="M33.5 44 L28 42" />
            <path d="M66.5 44 L72 42" />
          </g>
        )}

        {accessory === "headphones" && (
          <g>
            <path d="M28 43 A22 22 0 0 1 72 43" stroke="#334155" strokeWidth="4.5" fill="none" />
            <rect x="23" y="36" width="9" height="17" rx="4.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
            <rect x="68" y="36" width="9" height="17" rx="4.5" fill="#3b82f6" stroke="#2563eb" strokeWidth="1" />
          </g>
        )}

        {accessory === "sword" && (
          <g transform="translate(18, 55) rotate(-25)">
            <rect x="4" y="-3" width="4" height="25" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
            <rect x="1" y="22" width="10" height="3" fill="#ca8a04" rx="1" />
            <rect x="4" y="25" width="4" height="7" fill="#78350f" rx="1" />
          </g>
        )}

        {accessory === "magicWand" && (
          <g transform="translate(70, 52) rotate(35)">
            {/* Bluey Featherwand / Magic Wand */}
            <rect x="0" y="0" width="3" height="26" fill="#ca8a04" rx="1.5" />
            <polygon points="1.5,-6 3,-1 8,-1 4,2 6,7 1.5,4 -3,7 -1,2 -5,-1 0,-1" fill="#facc15" stroke="#eab308" strokeWidth="0.8" />
          </g>
        )}

        {accessory === "webShooter" && (
          <g>
            {/* Web Splatter */}
            <path d="M78 72 Q85 65 92 68 Q88 75 95 78 Q87 80 82 85 Z" fill="#ffffff" opacity="0.9" />
          </g>
        )}

        {accessory === "lightning" && (
          <g>
            <polygon points="76,45 84,45 80,55 86,55 74,70 78,58 72,58" fill="#facc15" stroke="#eab308" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
}
