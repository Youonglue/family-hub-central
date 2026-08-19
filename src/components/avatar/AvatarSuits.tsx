// src/components/avatar/AvatarSuits.tsx
import React from "react";

export function AvatarSuitLayer({ suit = "classic" }: { suit?: string }) {
  if (suit === "spiderSuit") {
    return (
      <g>
        <path d="M20 85 C20 66, 30 58, 50 58 C70 58, 80 66, 80 85 Z" fill="#dc2626" />
        <path d="M20 75 C25 68, 32 68, 36 85 Z" fill="#2563eb" />
        <path d="M80 75 C75 68, 68 68, 64 85 Z" fill="#2563eb" />
        <circle cx="50" cy="72" r="3" fill="#0f172a" />
        <line x1="50" y1="68" x2="44" y2="64" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="50" y1="68" x2="56" y2="64" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="50" y1="76" x2="43" y2="80" stroke="#0f172a" strokeWidth="1.2" />
        <line x1="50" y1="76" x2="57" y2="80" stroke="#0f172a" strokeWidth="1.2" />
        <circle cx="50" cy="42" r="19" fill="#dc2626" />
        <circle cx="50" cy="42" r="13" stroke="#991b1b" strokeWidth="0.8" fill="none" opacity="0.6" />
        <circle cx="50" cy="42" r="7" stroke="#991b1b" strokeWidth="0.8" fill="none" opacity="0.6" />
        <line x1="50" y1="23" x2="50" y2="61" stroke="#991b1b" strokeWidth="0.8" opacity="0.6" />
        <line x1="31" y1="42" x2="69" y2="42" stroke="#991b1b" strokeWidth="0.8" opacity="0.6" />
      </g>
    );
  }

  if (suit === "ironArmor") {
    return (
      <g>
        <path d="M20 85 C20 66, 30 58, 50 58 C70 58, 80 66, 80 85 Z" fill="#991b1b" />
        <path d="M36 65 L64 65 L60 85 L40 85 Z" fill="#eab308" />
        <circle cx="50" cy="72" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
        <circle cx="50" cy="42" r="19" fill="#fdedd3" />
      </g>
    );
  }

  if (suit === "blueyPup") {
    return (
      <g>
        <path d="M22 85 C22 66, 30 58, 50 58 C70 58, 78 66, 78 85 Z" fill="#60a5fa" />
        <path d="M38 85 C38 70, 42 66, 50 66 C58 66, 62 70, 62 85 Z" fill="#93c5fd" />
        <circle cx="50" cy="42" r="20" fill="#60a5fa" />
        <path d="M50 24 C58 24, 69 32, 68 44 C67 52, 58 52, 50 50 Z" fill="#1e3a8a" opacity="0.85" />
        <ellipse cx="50" cy="47" rx="11" ry="8" fill="#fed7aa" />
        <ellipse cx="50" cy="43" rx="3.5" ry="2.5" fill="#1e293b" />
      </g>
    );
  }

  if (suit === "bingoPup") {
    return (
      <g>
        <path d="M22 85 C22 66, 30 58, 50 58 C70 58, 78 66, 78 85 Z" fill="#fb923c" />
        <path d="M38 85 C38 70, 42 66, 50 66 C58 66, 62 70, 62 85 Z" fill="#fed7aa" />
        <circle cx="50" cy="42" r="20" fill="#fb923c" />
        <path d="M50 24 C58 24, 69 32, 68 44 C67 52, 58 52, 50 50 Z" fill="#c2410c" opacity="0.85" />
        <ellipse cx="50" cy="47" rx="11" ry="8" fill="#fef08a" />
        <ellipse cx="50" cy="43" rx="3.5" ry="2.5" fill="#1e293b" />
      </g>
    );
  }

  // Classic Hero Base
  return (
    <g>
      <path d="M22 85 C22 68, 30 60, 50 60 C70 60, 78 68, 78 85 Z" fill="#334155" />
      <path d="M35 85 C35 72, 40 68, 50 68 C60 68, 65 72, 65 85 Z" fill="#f1f5f9" />
      <circle cx="50" cy="55" r="5" fill="#fbcfe8" />
      <circle cx="50" cy="42" r="19" fill="#fdedd3" />
    </g>
  );
}
