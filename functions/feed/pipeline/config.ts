import { FeatureFlags } from './featureFlags';

export const Defaults = {
  Weights: {
    discovery: { freshness: 0.35, rep: 0.35, engagement: 0.2, consistency: 0.1 },
    personalized: { freshness: 0.3, rep: 0.4, engagement: 0.2, consistency: 0.1 },
  },
  Moderation: { aiBlockThreshold: 0.15 },
  Fairness: {
    floors: new Map<number, number>([
      [5, 0],
      [4, 3],
      [3, 2],
      [2, 1],
      [1, 1],
    ]),
    caps: new Map<number, number>([
      [5, 10],
      [4, 6],
      [3, 4],
      [2, 3],
      [1, 2],
    ]),
    perAuthorPageCap: 2,
    exploreRatio: 0.15,
  },
  Freshness: { lambdaPerHour: 0.08 },
};

export type WeightsType = typeof Defaults.Weights;
export type ModerationType = typeof Defaults.Moderation;
export type FairnessType = typeof Defaults.Fairness;
export type FreshnessType = typeof Defaults.Freshness;

export let Weights = Defaults.Weights;
export let Moderation = Defaults.Moderation;
export let Fairness = Defaults.Fairness;
export let Freshness = Defaults.Freshness;

export async function loadDynamicConfig(flags = new FeatureFlags()): Promise<void> {
  const weights = await flags.getJSON<WeightsType>('FEED_WEIGHTS_JSON', Defaults.Weights);
  const moderation = await flags.getJSON<ModerationType>(
    'FEED_MODERATION_JSON',
    Defaults.Moderation
  );
  const fairnessRaw = await flags.getJSON<{
    floors: Array<[number, number]>;
    caps: Array<[number, number]>;
    perAuthorPageCap: number;
    exploreRatio: number;
  }>('FEED_FAIRNESS_JSON', {
    floors: Array.from(Defaults.Fairness.floors.entries()),
    caps: Array.from(Defaults.Fairness.caps.entries()),
    perAuthorPageCap: Defaults.Fairness.perAuthorPageCap,
    exploreRatio: Defaults.Fairness.exploreRatio,
  });
  const freshnessLambda = await flags.getNumber(
    'FEED_FRESHNESS_LAMBDA',
    Defaults.Freshness.lambdaPerHour
  );

  Weights = weights;
  Moderation = moderation;
  Fairness = {
    floors: new Map<number, number>(
      fairnessRaw.floors.map(([level, floor]: [number, number]) => [level, floor])
    ),
    caps: new Map<number, number>(
      fairnessRaw.caps.map(([level, cap]: [number, number]) => [level, cap])
    ),
    perAuthorPageCap: fairnessRaw.perAuthorPageCap,
    exploreRatio: fairnessRaw.exploreRatio,
  };
  Freshness = { lambdaPerHour: freshnessLambda };
}
