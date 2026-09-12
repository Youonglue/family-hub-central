// src/components/avatar/AvatarFeatures.tsx
import React from "react";

export function AvatarFaceLayer({ face, isSpider }: { face: string; isSpider?: boolean }) {
  if (isSpider) {
    return (
      <g>
        <polygon points="36,36 46,41 44,46 34,42" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <polygon points="64,36 54,41 56,46 66,42" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      </g>
    );
  }

  return (
    <>
      {/* Chuu Signature Pop-Idol Wink & Coral Blush */}
      {face === "chuuWink" && (
        <g>
          {/* Big Sparkling Right Eye */}
          <ellipse cx="42" cy="41" rx="3" ry="4.5" fill="#1e293b" />
          <circle cx="41" cy="39" r="1.2" fill="#ffffff" />
          <circle cx="43" cy="43" r="0.6" fill="#ffffff" />

          {/* Expressive Left Wink Curve with Eyelash */}
          <path d="M54 42 Q58 37 63 42" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M62 40 L65 38" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />

          {/* Rosy Strawberry-Coral Blush with Catchlights */}
          <circle cx="36" cy="46" r="3.5" fill="#fb7185" opacity="0.6" />
          <circle cx="35" cy="45" r="0.8" fill="#ffffff" opacity="0.8" />
          <circle cx="64" cy="46" r="3.5" fill="#fb7185" opacity="0.6" />
          <circle cx="63" cy="45" r="0.8" fill="#ffffff" opacity="0.8" />

          {/* Open Joyful Idol Smile */}
          <path d="M44 49 Q50 56 56 49 Z" fill="#f43f5e" stroke="#1e293b" strokeWidth="1.5" />
        </g>
      )}

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
          <path d="M30 38 Q50 44 70 38 L68 47 Q50 52 32 47 Z" fill="#0f172a" />
          <ellipse cx="42" cy="42" rx="3.5" ry="2.5" fill="#38bdf8" />
          <ellipse cx="58" cy="42" rx="3.5" ry="2.5" fill="#38bdf8" />
          <path d="M46 52 Q50 55 54 52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )}
    </>
  );
}

export function AvatarHairLayer({ hair }: { hair: string }) {
  return (
    <>
      {/* Chuu Idol Straight Bangs & Twin Ribbon Pigtails */}
      {hair === "chuuPigtails" && (
        <g>
          {/* Chestnut Hair Crown & Bangs */}
          <path d="M30 36 C30 20, 70 20, 70 36 C64 36, 61 31, 56 31 C51 31, 48 35, 44 32 C40 35, 36 36, 30 36 Z" fill="#78350f" />
          <path d="M31 34 Q50 24 69 34 L67 38 Q50 29 33 38 Z" fill="#92400e" opacity="0.6" />

          {/* Left Pigtail & Pink Ribbon */}
          <ellipse cx="23" cy="45" rx="5" ry="11" fill="#78350f" transform="rotate(-15 23 45)" />
          <polygon points="26,35 20,31 22,37" fill="#fb7185" />
          <polygon points="26,35 22,41 20,35" fill="#fb7185" />
          <circle cx="24.5" cy="35.5" r="1.5" fill="#f43f5e" />

          {/* Right Pigtail & Pink Ribbon */}
          <ellipse cx="77" cy="45" rx="5" ry="11" fill="#78350f" transform="rotate(15 77 45)" />
          <polygon points="74,35 80,31 78,37" fill="#fb7185" />
          <polygon points="74,35 78,41 80,35" fill="#fb7185" />
          <circle cx="75.5" cy="35.5" r="1.5" fill="#f43f5e" />
        </g>
      )}

      {hair === "blueyEars" && (
        <g fill="#1e3a8a">
          <polygon points="32,30 20,8 38,18" stroke="#1e40af" strokeWidth="1" />
          <polygon points="30,26 23,12 36,19" fill="#fbcfe8" />
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
    </>
  );
}

export function AvatarAccessoryLayer({ accessory }: { accessory: string }) {
  return (
    <>
      {/* Iconic "Chuu Apple Heart" Pose */}
      {accessory === "chuuHeart" && (
        <g>
          {/* Floating Strawberry Heart Sparkle */}
          <path d="M74 54 C74 50, 68 50, 68 54 C68 58, 74 62, 74 62 C74 62, 80 58, 80 54 C80 50, 74 50, 74 54 Z" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
          <polygon points="74,48 75,51 77,51 75.5,52.5 76,55 74,53.5 72,55 72.5,52.5 71,51 73,51" fill="#fef08a" />

          {/* Cute Apple-Heart Hands at Chest */}
          <g transform="translate(0, 4)">
            <ellipse cx="44" cy="74" rx="4" ry="3" fill="#fdedd3" stroke="#fbcfe8" strokeWidth="0.8" transform="rotate(-20 44 74)" />
            <ellipse cx="56" cy="74" rx="4" ry="3" fill="#fdedd3" stroke="#fbcfe8" strokeWidth="0.8" transform="rotate(20 56 74)" />
            <path d="M50 72 C48 69, 44 69, 44 72 C44 76, 50 79, 50 79 C50 79, 56 76, 56 72 C56 69, 52 69, 50 72 Z" fill="#fb7185" />
          </g>
        </g>
      )}

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
          <rect x="0" y="0" width="3" height="26" fill="#ca8a04" rx="1.5" />
          <polygon points="1.5,-6 3,-1 8,-1 4,2 6,7 1.5,4 -3,7 -1,2 -5,-1 0,-1" fill="#facc15" stroke="#eab308" strokeWidth="0.8" />
        </g>
      )}

      {accessory === "webShooter" && (
        <g>
          <path d="M78 72 Q85 65 92 68 Q88 75 95 78 Q87 80 82 85 Z" fill="#ffffff" opacity="0.9" />
        </g>
      )}

      {accessory === "lightning" && (
        <g>
          <polygon points="76,45 84,45 80,55 86,55 74,70 78,58 72,58" fill="#facc15" stroke="#eab308" strokeWidth="1" />
        </g>
      )}
    </>
  );
}
