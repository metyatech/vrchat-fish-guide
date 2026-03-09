export type StatThemeKey =
  | 'luck'
  | 'strength'
  | 'expertise'
  | 'attractionRate'
  | 'bigCatchRate'
  | 'maxWeight';

export interface StatTheme {
  label: string;
  accent: string;
  pillText: string;
  surfaceText: string;
  cardBackground: string;
  cardBorder: string;
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createTheme(
  label: string,
  accent: string,
  pillText: string,
  surfaceText = pillText,
): StatTheme {
  return {
    label,
    accent,
    pillText,
    surfaceText,
    cardBackground: withAlpha(accent, 0.12),
    cardBorder: withAlpha(accent, 0.36),
  };
}

/**
 * Approximated from public in-game Fish! UI screenshots.
 * The colors intentionally follow the game's stat text palette so the same stat
 * reads as the same concept throughout the calculator.
 */
export const STAT_THEME: Record<StatThemeKey, StatTheme> = {
  luck: createTheme('Luck', '#FFE756', '#4D3F00'),
  strength: createTheme('Strength', '#FE6C6D', '#5B1117'),
  expertise: createTheme('Expertise', '#4BBCE0', '#0D4257'),
  attractionRate: createTheme('Attraction Rate', '#92D5BC', '#184634'),
  bigCatchRate: createTheme('Big Catch Rate', '#FFD76D', '#5E4300'),
  maxWeight: createTheme('Max Weight', '#9254BA', '#FFFFFF', '#4C2567'),
};

export const STAT_THEME_ORDER: StatThemeKey[] = [
  'luck',
  'strength',
  'expertise',
  'attractionRate',
  'bigCatchRate',
  'maxWeight',
];
