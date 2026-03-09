/**
 * Fish appearance and size modifier data for VRChat Fish!
 *
 * Classification: experimental — derived from community observation and reverse-engineering.
 * Source: Snerx community spreadsheet (license unclear; only numeric facts are extracted).
 * Individual modifier names are NOT reproduced to avoid reproducing expressive content from
 * an unclear-license source.
 *
 * Probability values labelled "community observation" are sourced from the Snerx sheet and
 * treated as experimental approximations.
 * Values labelled "independent approximation" are NOT sourced from any external data:
 * they are assumptions made by this calculator to fill in unknown information.
 */

/** Sell-price multiplier for the Huge size modifier (community observation). */
export const HUGE_MODIFIER_MULTIPLIER = 1.5;

/** Sell-price multiplier for the Tiny size modifier (community observation, no bonus). */
export const TINY_MODIFIER_MULTIPLIER = 1.0;

/**
 * Number of distinct appearance modifier kinds in the game.
 * Source: community observation (experimental).
 */
export const APPEARANCE_MODIFIER_COUNT = 23;

/**
 * Mean sell-price multiplier across all appearance modifiers, assuming equal probability for
 * each of the 23 kinds.  The equal-probability assumption is independent (not sourced).
 * Source value: community reverse-engineering (experimental).
 */
export const MEAN_APPEARANCE_MULTIPLIER_BASE = 2.404;

/**
 * Adjusted mean when applying the Cursed→Blessed conversion policy (conversion cost and travel
 * time modeled as zero by this site).  Replaces Cursed's contribution with Blessed's in the mean.
 * Source: independent derivation from community modifier list.
 */
export const MEAN_APPEARANCE_MULTIPLIER_WITH_CONVERSION = 2.487;

/**
 * Probability that a caught fish has at least one modifier.
 * Source: Snerx community spreadsheet — stated as 22.5% total base mutation chance.
 * (community observation, experimental; treat as approximate).
 */
export const P_ANY_MODIFIER = 0.225;

/**
 * Probability that a caught fish has BOTH a size modifier AND an appearance modifier.
 * Source: Snerx community spreadsheet — stated as 5% base chance.
 * (community observation, experimental; treat as approximate).
 */
export const P_BOTH_MODIFIERS = 0.05;

/**
 * Probability that a caught fish has an appearance modifier ONLY (no size modifier).
 * Source: Snerx community spreadsheet — stated as 7.5% base chance of spawning alone.
 * (community observation, experimental; treat as approximate).
 */
export const P_APPEARANCE_ONLY = 0.075;

/**
 * Probability that a caught fish has a size modifier ONLY (no appearance modifier).
 * Source: Snerx community spreadsheet — stated as 10% base chance of spawning alone.
 * (community observation, experimental; treat as approximate).
 */
export const P_SIZE_ONLY = 0.1;

/**
 * Expected size modifier multiplier, assuming equal probability of Huge vs Tiny.
 * The actual Huge/Tiny selection probability is unknown.
 * This is an INDEPENDENT APPROXIMATION.
 */
export const MEAN_SIZE_MULTIPLIER = 0.5 * HUGE_MODIFIER_MULTIPLIER + 0.5 * TINY_MODIFIER_MULTIPLIER;

/**
 * Compute the expected-value multiplier from the appearance/size modifier probability model.
 *
 * This factor represents E[sell price with modifiers] / E[sell price without modifiers].
 * Multiply base expected sell price by this factor to get the modifier-adjusted expected price.
 *
 * Formula:
 *   factor = P(none)·1 + P(app-only)·E[app] + P(size-only)·E[size] + P(both)·E[app]·E[size]
 *
 * Probabilities sourced from the Snerx community spreadsheet (fact-only, experimental):
 *   P(appearance-only) = 7.5%, P(size-only) = 10%, P(both) = 5%, P(any) = 22.5%.
 *
 * @param assumeCursedToBlessed If true, uses the higher mean appearance multiplier,
 *   treating Cursed as equivalent to Blessed via the free church conversion.
 */
export function computeModifierEvFactor(assumeCursedToBlessed: boolean): number {
  const meanApp = assumeCursedToBlessed
    ? MEAN_APPEARANCE_MULTIPLIER_WITH_CONVERSION
    : MEAN_APPEARANCE_MULTIPLIER_BASE;

  const pBoth = P_BOTH_MODIFIERS;
  const pNone = 1 - P_ANY_MODIFIER;

  return (
    pNone * 1.0 +
    P_APPEARANCE_ONLY * meanApp +
    P_SIZE_ONLY * MEAN_SIZE_MULTIPLIER +
    pBoth * meanApp * MEAN_SIZE_MULTIPLIER
  );
}
