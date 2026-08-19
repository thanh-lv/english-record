export const PRIZES = [
  '🎈',
  '🎁',
  '🌟',
  '🏅',
  '👑',
  '💎',
  '🎀',
  '🎯',
  '🎨',
  '🎭',
  '🎪',
  '🎡',
  '🎢',
  '🎠',
];

export function getPrizeForTopic(topicNum: number) {
  return PRIZES[(topicNum - 1) % PRIZES.length];
}
