import test from 'node:test';
import assert from 'node:assert';
import { mapPostForRanking } from '../postMapper';

// Verify engagement score calculation
// likes + (comments * 2) + (shares * 3)
test('calculates engagement score correctly', () => {
  const post = {
    id: '1',
    authorId: 'author',
    createdAt: new Date(),
    likesCount: 5,
    commentsCount: 2,
    sharesCount: 1,
    author: { reputationScore: 80 }
  };

  const result = mapPostForRanking(post);
  assert.equal(result.engagementScore, 5 + 2 * 2 + 1 * 3);
});

// Ensure date handling works with string timestamps
test('handles string timestamps safely', () => {
  const timestamp = '2024-01-01T00:00:00.000Z';
  const post = {
    id: '2',
    authorId: 'author',
    createdAt: timestamp,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    author: { reputationScore: 10 }
  };

  const result = mapPostForRanking(post);
  assert.equal(result.createdAt, new Date(timestamp).toISOString());
});
