import React from 'react';
import Svg, {
  G, Path, Circle, Ellipse, Rect, Line, Text as SvgText,
} from 'react-native-svg';
import type {HairStyle} from '../types/models';

export interface AvatarColors {
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  eyeColor: string;
  jerseyColor: string;
  jerseyNumber: number;
  shortsColor: string;
  shoesColor: string;
}

interface Props {
  colors: AvatarColors;
  size?: number;
}

// Derived shading helpers
const shade = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
};

// ── Hair style renderers ──────────────────────────────────────────────────────

interface HairProps {
  hairColor: string;
  hairDark: string;
}

const HairShort = ({hairColor, hairDark}: HairProps) => (
  <G>
    {/* Back layer */}
    <Ellipse cx="110" cy="46" rx="26" ry="14" fill={hairColor} />
    {/* Top cap */}
    <Path d="M84 58 Q86 36 110 34 Q134 36 136 58 Q124 46 110 45 Q96 46 84 58 Z"
      fill={hairColor} />
    {/* Fade sides */}
    <Path d="M84 58 Q82 65 84 72 Q88 50 96 48" fill={hairDark} opacity="0.4" />
    <Path d="M136 58 Q138 65 136 72 Q132 50 124 48" fill={hairDark} opacity="0.4" />
    {/* Texture */}
    <Path d="M96 40 Q110 37 124 40" stroke={hairDark} strokeWidth="1" fill="none" opacity="0.5" />
    <Path d="M90 50 Q110 44 130 50" stroke={hairDark} strokeWidth="0.8" fill="none" opacity="0.4" />
  </G>
);

const HairFade = ({hairColor, hairDark}: HairProps) => (
  <G>
    {/* Clean top panel */}
    <Path d="M88 56 Q90 38 110 36 Q130 38 132 56 Q122 47 110 46 Q98 47 88 56 Z"
      fill={hairColor} />
    {/* Very thin fade sides */}
    <Path d="M84 60 Q83 65 85 70" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.35" />
    <Path d="M136 60 Q137 65 135 70" stroke={hairColor} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.35" />
    {/* Hard part line */}
    <Path d="M96 43 Q110 40 124 43" stroke={hairDark} strokeWidth="1.2" fill="none" opacity="0.5" />
    {/* Side fade gradient effect */}
    <Path d="M84 60 Q84 66 86 70 Q88 55 94 50" fill={hairDark} opacity="0.2" />
    <Path d="M136 60 Q136 66 134 70 Q132 55 126 50" fill={hairDark} opacity="0.2" />
  </G>
);

const HairCurly = ({hairColor, hairDark}: HairProps) => (
  <G>
    {/* Base layer */}
    <Ellipse cx="110" cy="43" rx="27" ry="17" fill={hairColor} />
    <Path d="M83 58 Q86 34 110 32 Q134 34 137 58 Q125 43 110 42 Q95 43 83 58 Z"
      fill={hairColor} />
    {/* Curl bumps top row */}
    <Circle cx="94"  cy="38" r="6"   fill={hairColor} />
    <Circle cx="105" cy="34" r="7"   fill={hairColor} />
    <Circle cx="116" cy="34" r="7"   fill={hairColor} />
    <Circle cx="127" cy="38" r="6"   fill={hairColor} />
    {/* Curl bumps second row */}
    <Circle cx="88"  cy="47" r="5.5" fill={hairColor} />
    <Circle cx="99"  cy="40" r="5.5" fill={hairColor} />
    <Circle cx="110" cy="38" r="5"   fill={hairColor} />
    <Circle cx="121" cy="40" r="5.5" fill={hairColor} />
    <Circle cx="132" cy="47" r="5.5" fill={hairColor} />
    {/* Curl shading */}
    <Circle cx="94"  cy="38" r="4"   fill={hairDark}  opacity="0.25" />
    <Circle cx="105" cy="34" r="5"   fill={hairDark}  opacity="0.25" />
    <Circle cx="116" cy="34" r="5"   fill={hairDark}  opacity="0.25" />
    <Circle cx="127" cy="38" r="4"   fill={hairDark}  opacity="0.25" />
    <Circle cx="110" cy="38" r="3.5" fill={hairDark}  opacity="0.2" />
    {/* Side fade */}
    <Path d="M84 58 Q82 65 84 72 Q87 52 94 49" fill={hairDark} opacity="0.3" />
    <Path d="M136 58 Q138 65 136 72 Q133 52 126 49" fill={hairDark} opacity="0.3" />
  </G>
);

const HairAfro = ({hairColor, hairDark}: HairProps) => (
  <G>
    {/* Big puff base */}
    <Circle cx="110" cy="44" r="33" fill={hairColor} />
    {/* Subtle shading */}
    <Circle cx="110" cy="44" r="33" fill={hairDark} opacity="0.08" />
    {/* Bumpy texture around edges */}
    <Circle cx="82"  cy="46" r="6"  fill={hairColor} />
    <Circle cx="80"  cy="54" r="5"  fill={hairColor} />
    <Circle cx="138" cy="46" r="6"  fill={hairColor} />
    <Circle cx="140" cy="54" r="5"  fill={hairColor} />
    <Circle cx="84"  cy="37" r="6"  fill={hairColor} />
    <Circle cx="136" cy="37" r="6"  fill={hairColor} />
    <Circle cx="92"  cy="30" r="7"  fill={hairColor} />
    <Circle cx="110" cy="26" r="8"  fill={hairColor} />
    <Circle cx="128" cy="30" r="7"  fill={hairColor} />
    {/* Texture dots */}
    <Circle cx="96"  cy="36" r="3.5" fill={hairDark} opacity="0.18" />
    <Circle cx="108" cy="31" r="4"   fill={hairDark} opacity="0.18" />
    <Circle cx="120" cy="35" r="3.5" fill={hairDark} opacity="0.18" />
    <Circle cx="90"  cy="46" r="3"   fill={hairDark} opacity="0.15" />
    <Circle cx="130" cy="46" r="3"   fill={hairDark} opacity="0.15" />
    <Circle cx="113" cy="40" r="3"   fill={hairDark} opacity="0.12" />
    {/* Connect to head at sides */}
    <Path d="M84 58 Q82 66 84 73 Q86 54 94 50" fill={hairColor} />
    <Path d="M136 58 Q138 66 136 73 Q134 54 126 50" fill={hairColor} />
  </G>
);

const HairBuzz = ({hairColor, hairDark}: HairProps) => (
  <G>
    {/* Very thin close crop */}
    <Ellipse cx="110" cy="47" rx="26" ry="11" fill={hairColor} opacity="0.95" />
    <Path d="M84 58 Q85 42 110 40 Q135 42 136 58 Q126 50 110 49 Q94 50 84 58 Z"
      fill={hairColor} />
    {/* Buzz texture dots - first row */}
    <Circle cx="94"  cy="45" r="1.5" fill={hairDark} opacity="0.45" />
    <Circle cx="100" cy="43" r="1.5" fill={hairDark} opacity="0.45" />
    <Circle cx="106" cy="41" r="1.5" fill={hairDark} opacity="0.45" />
    <Circle cx="112" cy="41" r="1.5" fill={hairDark} opacity="0.45" />
    <Circle cx="118" cy="42" r="1.5" fill={hairDark} opacity="0.45" />
    <Circle cx="124" cy="44" r="1.5" fill={hairDark} opacity="0.45" />
    {/* Buzz texture dots - second row */}
    <Circle cx="97"  cy="49" r="1.5" fill={hairDark} opacity="0.35" />
    <Circle cx="103" cy="47" r="1.5" fill={hairDark} opacity="0.35" />
    <Circle cx="109" cy="46" r="1.5" fill={hairDark} opacity="0.35" />
    <Circle cx="115" cy="46" r="1.5" fill={hairDark} opacity="0.35" />
    <Circle cx="121" cy="47" r="1.5" fill={hairDark} opacity="0.35" />
    {/* Thin side coverage */}
    <Path d="M84 58 Q83 63 85 69 Q87 54 93 51" fill={hairDark} opacity="0.25" />
    <Path d="M136 58 Q137 63 135 69 Q133 54 127 51" fill={hairDark} opacity="0.25" />
  </G>
);

const renderHair = (style: HairStyle, hairColor: string, hairDark: string) => {
  switch (style) {
    case 'fade':  return <HairFade  hairColor={hairColor} hairDark={hairDark} />;
    case 'curly': return <HairCurly hairColor={hairColor} hairDark={hairDark} />;
    case 'afro':  return <HairAfro  hairColor={hairColor} hairDark={hairDark} />;
    case 'buzz':  return <HairBuzz  hairColor={hairColor} hairDark={hairDark} />;
    default:      return <HairShort hairColor={hairColor} hairDark={hairDark} />;
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

const BasketbolcuAvatar: React.FC<Props> = ({colors, size = 220}) => {
  const scale = size / 220;

  const {skin, hairColor, hairStyle, eyeColor, jerseyColor, jerseyNumber, shortsColor, shoesColor} = colors;
  const skinDark    = shade(skin,         -30);
  const jerseyDark  = shade(jerseyColor,  -40);
  const shortsDark  = shade(shortsColor,  -30);
  const shoesDark   = shade(shoesColor,   -40);
  const hairDark    = shade(hairColor,    -30);
  const eyePupil    = shade(eyeColor,     -50);

  return (
    <Svg
      width={size}
      height={size + 16}
      viewBox="0 0 220 220"
    >
      <G scale={scale} origin="0,0">

        {/* ── Shadow ─────────────────────────────────────────── */}
        <Ellipse cx="110" cy="214" rx="46" ry="7" fill="rgba(0,0,0,0.22)" />

        {/* ── Left shoe ──────────────────────────────────────── */}
        {/* Sole shadow */}
        <Ellipse cx="80" cy="212" rx="19" ry="5" fill="rgba(0,0,0,0.20)" />
        {/* Sole */}
        <Path d="M62 207 Q80 214 100 207 L99 201 Q80 195 63 201 Z" fill={shoesDark} />
        {/* Upper body */}
        <Path d="M63 201 Q80 195 99 201 Q97 192 88 190 Q76 189 65 196 Z" fill={shoesColor} />
        {/* Toe cap */}
        <Ellipse cx="68" cy="199" rx="8" ry="5" fill={shoesDark} opacity="0.35" />
        {/* Ankle collar */}
        <Path d="M76 194 Q82 191 90 194" stroke={shoesColor} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* Lace tongue */}
        <Path d="M77 199 Q83 195 90 198" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Lace eyelets */}
        <Circle cx="79" cy="199" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="82" cy="198" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="85" cy="197" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="88" cy="197" r="1.1" fill="rgba(255,255,255,0.55)" />
        {/* Midsole stripe */}
        <Path d="M64 204 Q80 208 99 204" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" />

        {/* ── Right shoe ─────────────────────────────────────── */}
        {/* Sole shadow */}
        <Ellipse cx="140" cy="212" rx="19" ry="5" fill="rgba(0,0,0,0.20)" />
        {/* Sole */}
        <Path d="M120 207 Q140 214 158 207 L157 201 Q140 195 121 201 Z" fill={shoesDark} />
        {/* Upper body */}
        <Path d="M121 201 Q140 195 157 201 Q155 192 146 190 Q134 189 122 196 Z" fill={shoesColor} />
        {/* Toe cap */}
        <Ellipse cx="152" cy="199" rx="8" ry="5" fill={shoesDark} opacity="0.35" />
        {/* Ankle collar */}
        <Path d="M130 194 Q137 191 143 194" stroke={shoesColor} strokeWidth="5" strokeLinecap="round" fill="none" />
        {/* Lace tongue */}
        <Path d="M131 199 Q137 195 143 198" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Lace eyelets */}
        <Circle cx="133" cy="199" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="136" cy="198" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="139" cy="197" r="1.1" fill="rgba(255,255,255,0.55)" />
        <Circle cx="142" cy="197" r="1.1" fill="rgba(255,255,255,0.55)" />
        {/* Midsole stripe */}
        <Path d="M121 204 Q140 208 157 204" stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none" />

        {/* ── Legs ───────────────────────────────────────────── */}
        {/* Left leg — calf narrows toward ankle */}
        <Path d="M92 162 Q86 179 83 196" stroke={skin} strokeWidth="13" strokeLinecap="round" fill="none" />
        <Path d="M92 162 Q86 179 83 196" stroke={skinDark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.30" />
        {/* Left ankle */}
        <Circle cx="83" cy="194" r="6" fill={skin} />
        {/* Right leg */}
        <Path d="M128 162 Q134 179 137 196" stroke={skin} strokeWidth="13" strokeLinecap="round" fill="none" />
        <Path d="M128 162 Q134 179 137 196" stroke={skinDark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.30" />
        {/* Right ankle */}
        <Circle cx="137" cy="194" r="6" fill={skin} />

        {/* ── Shorts ─────────────────────────────────────────── */}
        <Path d="M82 148 Q86 168 90 162 L110 165 L130 162 Q134 168 138 148 Z"
          fill={shortsColor} />
        <Path d="M82 148 Q86 168 90 162 L110 165 L130 162 Q134 168 138 148 Z"
          fill={shortsDark} opacity="0.25" />
        {/* Shorts side stripe */}
        <Path d="M84 150 Q87 163 91 163" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />
        <Path d="M136 150 Q133 163 129 163" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" />

        {/* ── Left arm (bare — sleeveless jersey) ─────────────── */}
        <Path d="M90 106 Q72 118 66 136" stroke={skin} strokeWidth="13" strokeLinecap="round" fill="none" />
        <Path d="M90 106 Q72 118 66 136" stroke={skinDark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />

        {/* ── Right arm (bare — sleeveless jersey) ────────────── */}
        <Path d="M130 106 Q148 118 154 136" stroke={skin} strokeWidth="13" strokeLinecap="round" fill="none" />
        <Path d="M130 106 Q148 118 154 136" stroke={skinDark} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.3" />

        {/* ── Basketball (held by left hand) ──────────────────── */}
        <Circle cx="60" cy="143" r="15" fill="#e8650a" />
        <Circle cx="60" cy="143" r="15" fill="url(#ballGrad)" opacity="0.4" />
        {/* Ball lines */}
        <Path d="M46 143 Q60 136 74 143" stroke="#7a2d00" strokeWidth="1.2" fill="none" />
        <Path d="M46 143 Q60 150 74 143" stroke="#7a2d00" strokeWidth="1.2" fill="none" />
        <Line x1="60" y1="128" x2="60" y2="158" stroke="#7a2d00" strokeWidth="1.2" />
        <Circle cx="60" cy="143" r="15" fill="none" stroke="#c45208" strokeWidth="1" />

        {/* ── Jersey — forma.svg paths ─────────────────────────
             Transform maps forma's 612×612 SVG space → avatar jersey area.
             Original G: translate(0,612) scale(0.1,-0.1)
             Combined matrix to fit x:[80,140] y:[95,148]:
             matrix(0.0176, 0, 0, -0.0108, 55.36, 155.9)           ── */}
        {/* Base fill */}
        <G transform="matrix(0.0176 0 0 -0.0108 55.36 155.9)" fill={jerseyColor}>
          {/* Collar / neckline detail */}
          <Path d="M2585 5616 c-73 -31 -74 -32 -69 -74 42 -302 354 -500 679 -429 122 27 251 113 333 222 27 36 68 145 76 203 l6 43 -47 22 c-27 11 -50 21 -53 22 -3 0 -10 4 -17 8 -8 5 -26 -7 -48 -32 -58 -64 -105 -81 -260 -93 -153 -13 -357 0 -418 26 -20 8 -58 34 -84 59 l-48 43 -50 -20z m922 -48 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z" />
          {/* Main jersey body */}
          <Path d="M3703 5483 c-19 -110 -88 -233 -178 -316 -46 -43 -139 -105 -169 -113 -14 -3 -23 -10 -20 -15 3 -5 -2 -6 -10 -3 -9 3 -16 2 -16 -3 0 -5 -8 -9 -17 -10 -10 0 -51 -8 -91 -17 -150 -33 -311 -12 -457 59 -84 41 -101 53 -175 126 -69 68 -131 185 -151 283 -12 65 -14 67 -38 61 -28 -7 -281 -106 -281 -110 0 -1 7 -22 15 -46 26 -72 63 -227 81 -339 26 -151 25 -542 0 -665 -3 -11 -5 -20 -5 -20 -5 0 -53 -145 -54 -162 -1 -11 -5 -19 -8 -17 -4 2 -13 -11 -20 -29 -23 -58 -90 -152 -171 -241 -105 -116 -311 -235 -488 -282 -36 -10 -66 -18 -68 -19 -2 -2 6 -202 18 -446 43 -923 43 -1135 0 -1898 -11 -195 -18 -356 -17 -358 5 -4 172 -21 372 -38 105 -9 235 -20 290 -25 55 -5 163 -14 240 -20 77 -6 149 -12 160 -15 11 -2 236 -7 500 -10 518 -7 670 -1 1110 41 143 14 316 29 385 35 122 9 292 28 297 32 1 2 -7 162 -17 357 -44 804 -41 1189 16 2230 l7 115 -68 18 c-109 29 -311 125 -373 177 -7 6 -17 8 -22 5 -6 -4 -9 -2 -8 3 2 5 -27 38 -63 73 -152 147 -253 334 -290 539 -21 113 -18 497 4 625 22 127 56 271 72 310 26 62 29 79 11 72 -10 -4 -15 -3 -12 1 4 7 -40 29 -74 37 -3 1 -16 6 -30 12 -14 6 -59 24 -101 40 l-75 30 -11 -64z" />
          {/* Left side panel */}
          <Path d="M1958 5373 c-21 -8 -35 -19 -32 -24 3 -5 -2 -6 -10 -3 -9 3 -16 4 -16 2 0 -5 17 -60 27 -88 3 -8 7 -24 9 -35 1 -11 12 -63 23 -115 11 -52 25 -142 31 -200 12 -107 10 -401 -2 -394 -3 2 -9 -15 -13 -38 -22 -135 -97 -287 -192 -388 -59 -63 -88 -85 -159 -120 -47 -23 -125 -52 -173 -63 l-88 -21 5 -91 c2 -49 6 -91 7 -93 1 -1 33 7 71 19 204 63 403 214 520 395 50 78 95 175 97 210 1 18 5 30 8 28 4 -2 14 36 23 85 21 115 22 417 1 556 -20 134 -46 246 -56 239 -5 -3 -6 2 -3 10 5 12 -32 148 -39 145 -1 0 -19 -7 -39 -16z" />
          {/* Right side panel */}
          <Path d="M4119 5379 c-1 -5 -2 -15 -3 -21 -1 -7 -4 -15 -7 -18 -12 -11 -50 -152 -45 -166 3 -8 2 -13 -3 -10 -5 3 -17 -45 -27 -107 -15 -88 -19 -163 -19 -352 0 -219 2 -248 24 -329 27 -105 85 -225 146 -304 95 -125 251 -254 367 -305 63 -28 188 -71 192 -66 2 2 6 45 8 96 l5 92 -46 7 c-64 9 -168 48 -243 90 -58 32 -198 164 -198 186 0 5 -5 6 -11 2 -7 -4 -10 -1 -7 7 3 8 -6 31 -19 51 -12 21 -23 39 -23 42 0 2 -8 21 -17 42 -9 22 -18 44 -19 50 -1 6 -9 37 -18 68 -62 211 -47 473 48 859 13 53 13 59 -2 64 -9 3 -32 12 -49 19 -19 7 -34 9 -34 3z" />
          {/* Bottom hem band */}
          <Path d="M4655 799 c-222 -28 -331 -40 -425 -49 -58 -5 -211 -20 -340 -32 -213 -20 -292 -22 -850 -23 -677 0 -653 -1 -1497 91 -89 10 -164 16 -167 14 -2 -3 -5 -48 -7 -100 l-4 -95 115 -11 c63 -6 160 -14 215 -18 55 -3 133 -10 172 -16 62 -8 390 -36 643 -55 41 -3 237 -8 435 -12 433 -7 668 4 1225 57 52 5 176 16 275 25 99 9 209 19 245 23 l65 7 -4 95 c-3 95 -6 111 -19 109 -4 -1 -38 -5 -77 -10z m-2498 -245 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z" />
        </G>
        {/* Shading overlay */}
        <G transform="matrix(0.0176 0 0 -0.0108 55.36 155.9)" fill={jerseyDark} opacity="0.28">
          <Path d="M3703 5483 c-19 -110 -88 -233 -178 -316 -46 -43 -139 -105 -169 -113 -14 -3 -23 -10 -20 -15 3 -5 -2 -6 -10 -3 -9 3 -16 2 -16 -3 0 -5 -8 -9 -17 -10 -10 0 -51 -8 -91 -17 -150 -33 -311 -12 -457 59 -84 41 -101 53 -175 126 -69 68 -131 185 -151 283 -12 65 -14 67 -38 61 -28 -7 -281 -106 -281 -110 0 -1 7 -22 15 -46 26 -72 63 -227 81 -339 26 -151 25 -542 0 -665 -3 -11 -5 -20 -5 -20 -5 0 -53 -145 -54 -162 -1 -11 -5 -19 -8 -17 -4 2 -13 -11 -20 -29 -23 -58 -90 -152 -171 -241 -105 -116 -311 -235 -488 -282 -36 -10 -66 -18 -68 -19 -2 -2 6 -202 18 -446 43 -923 43 -1135 0 -1898 -11 -195 -18 -356 -17 -358 5 -4 172 -21 372 -38 105 -9 235 -20 290 -25 55 -5 163 -14 240 -20 77 -6 149 -12 160 -15 11 -2 236 -7 500 -10 518 -7 670 -1 1110 41 143 14 316 29 385 35 122 9 292 28 297 32 1 2 -7 162 -17 357 -44 804 -41 1189 16 2230 l7 115 -68 18 c-109 29 -311 125 -373 177 -7 6 -17 8 -22 5 -6 -4 -9 -2 -8 3 2 5 -27 38 -63 73 -152 147 -253 334 -290 539 -21 113 -18 497 4 625 22 127 56 271 72 310 26 62 29 79 11 72 -10 -4 -15 -3 -12 1 4 7 -40 29 -74 37 -3 1 -16 6 -30 12 -14 6 -59 24 -101 40 l-75 30 -11 -64z" />
        </G>
        {/* Jersey number */}
        <SvgText
          x="110"
          y="131"
          textAnchor="middle"
          fontSize={jerseyNumber >= 10 ? '12' : '14'}
          fontWeight="bold"
          fill="rgba(255,255,255,0.90)"
          letterSpacing="1"
        >
          {String(jerseyNumber)}
        </SvgText>

        {/* ── Neck ───────────────────────────────────────────── */}
        <Rect x="105" y="82" width="10" height="16" rx="4" fill={skin} />
        <Rect x="105" y="82" width="10" height="16" rx="4" fill={skinDark} opacity="0.2" />

        {/* ── Head ───────────────────────────────────────────── */}
        {/* Head base */}
        <Ellipse cx="110" cy="68" rx="26" ry="28" fill={skin} />
        {/* Head shading */}
        <Ellipse cx="118" cy="68" rx="14" ry="20" fill={skinDark} opacity="0.12" />

        {/* ── Hair ───────────────────────────────────────────── */}
        {renderHair(hairStyle, hairColor, hairDark)}

        {/* ── Face features ──────────────────────────────────── */}
        {/* Ear left */}
        <Ellipse cx="84" cy="70" rx="5" ry="7" fill={skin} />
        <Ellipse cx="84" cy="70" rx="3" ry="5" fill={skinDark} opacity="0.25" />
        {/* Ear right */}
        <Ellipse cx="136" cy="70" rx="5" ry="7" fill={skin} />
        <Ellipse cx="136" cy="70" rx="3" ry="5" fill={skinDark} opacity="0.25" />

        {/* Eyebrows */}
        <Path d="M99 60 Q104 57 108 59" stroke={hairColor} strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M112 59 Q116 57 121 60" stroke={hairColor} strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Eyes white */}
        <Ellipse cx="103" cy="65" rx="6" ry="5" fill="white" />
        <Ellipse cx="117" cy="65" rx="6" ry="5" fill="white" />
        {/* Iris */}
        <Circle cx="104" cy="66" r="3.5" fill={eyeColor} />
        <Circle cx="118" cy="66" r="3.5" fill={eyeColor} />
        {/* Pupil */}
        <Circle cx="104.5" cy="66" r="2" fill={eyePupil} />
        <Circle cx="118.5" cy="66" r="2" fill={eyePupil} />
        {/* Eye shine */}
        <Circle cx="105.5" cy="64.5" r="1" fill="white" />
        <Circle cx="119.5" cy="64.5" r="1" fill="white" />
        {/* Eyelids */}
        <Path d="M97 63 Q103 60 109 63" stroke="#00000030" strokeWidth="1" fill="none" />
        <Path d="M111 63 Q117 60 123 63" stroke="#00000030" strokeWidth="1" fill="none" />

        {/* Nose */}
        <Path d="M108 70 Q110 74 112 70" stroke={skinDark} strokeWidth="1.5" strokeLinecap="round" fill="none" />

        {/* Mouth — slight smile */}
        <Path d="M104 78 Q110 83 116 78" stroke={skinDark} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Teeth hint */}
        <Path d="M106 79 Q110 82 114 79" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />

        {/* Chin shadow */}
        <Ellipse cx="110" cy="90" rx="10" ry="4" fill={skinDark} opacity="0.15" />

      </G>
    </Svg>
  );
};

export default BasketbolcuAvatar;
