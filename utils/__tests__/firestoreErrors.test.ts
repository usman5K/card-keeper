import {
  friendlyFirestoreMessage,
  isIndexBuildingError,
} from '@/utils/firestoreErrors';

describe('firestoreErrors', () => {
  it('detects index building failures', () => {
    expect(
      isIndexBuildingError(
        new Error(
          'The query requires an index. That index is currently building: https://console.firebase.google.com/...',
        ),
      ),
    ).toBe(true);
    expect(isIndexBuildingError({ code: 'failed-precondition', message: 'x' })).toBe(true);
    expect(isIndexBuildingError(new Error('permission-denied'))).toBe(false);
  });

  it('maps index errors to human copy without URLs', () => {
    const message = friendlyFirestoreMessage(
      new Error('The query requires an index. https://console.firebase.google.com/x'),
      'fallback',
    );
    expect(message).toMatch(/Balances are still updating/i);
    expect(message).not.toMatch(/https?:\/\//i);
  });
});
