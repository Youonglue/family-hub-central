// src/components/avatar/AvatarBackdrops.tsx
import React from "react";

export function AvatarGradientsDef() {
  return (
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

      <linearGradient id="fairyGardenGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#fef08a" />
      </linearGradient>
    </defs>
  );
}

export function AvatarBackdropLayer({ bg }: { bg: string }) {
  return (
    <>
      {/* Solid Colors */}
      {bg === "amber" && <rect width="100" height="100" fill="#f59e0b" />}
      {bg === "pink" && <rect width="100" height="100" fill="#ec4899" />}
      {bg === "emerald" && <rect width="100" height="100" fill="#10b981" />}
      {bg === "sky" && <rect width="100" height="100" fill="#0ea5e9" />}
      {bg === "rose" && <rect width="100" height="100" fill="#f43f5e" />}
      {bg === "violet" && <rect width="100" height="100" fill="#8b5cf6" />}

      {/* Marvel Themed Backdrops */}
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

      {/* Bluey Themed Backdrops */}
      {bg === "heelerBackyard" && (
        <g>
          <rect width="100" height="100" fill="url(#heelerBackyardGrad)" />
          <circle cx="15" cy="25" r="14" fill="#c084fc" opacity="0.8" />
          <circle cx="28" cy="18" r="10" fill="#a855f7" opacity="0.7" />
          <circle cx="88" cy="22" r="12" fill="#c084fc" opacity="0.75" />
          <rect x="5" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
          <rect x="15" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
          <rect x="80" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
          <rect x="90" y="48" width="4" height="12" fill="#ffffff" rx="1" opacity="0.9" />
        </g>
      )}

      {bg === "keepyUppy" && (
        <g>
          <rect width="100" height="100" fill="url(#keepyUppyGrad)" />
          <g transform="translate(68, 12)">
            <ellipse cx="12" cy="14" rx="10" ry="12" fill="#ef4444" />
            <ellipse cx="9" cy="10" rx="3" ry="5" fill="#fca5a5" opacity="0.6" />
            <polygon points="12,26 10,29 14,29" fill="#dc2626" />
            <path d="M12 29 Q10 34 13 38" stroke="#ffffff" strokeWidth="1" fill="none" opacity="0.8" />
          </g>
          <circle cx="20" cy="25" r="10" fill="#ffffff" opacity="0.7" />
          <circle cx="30" cy="22" r="12" fill="#ffffff" opacity="0.7" />
          <circle cx="38" cy="26" r="8" fill="#ffffff" opacity="0.7" />
        </g>
      )}

      {bg === "danceMode" && (
        <g>
          <rect width="100" height="100" fill="url(#danceModeGrad)" />
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
    </>
  );
}
