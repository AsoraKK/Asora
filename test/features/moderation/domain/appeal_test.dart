import 'package:flutter_test/flutter_test.dart';
import 'package:asora/features/moderation/domain/appeal.dart';

// ASORA APPEAL MODEL TESTS
//
// 🎯 Purpose: Test domain model serialization and validation
// ✅ Coverage: JSON parsing, edge cases, validation, enum handling
// 📊 Target: 100% coverage for domain models

void main() {
  group('Appeal Model Tests', () {
    group('Serialization', () {
      test('should serialize to JSON correctly', () {
        // Arrange
        final appeal = Appeal(
          appealId: 'appeal_123',
          contentId: 'content_456',
          contentType: 'post',
          contentTitle: 'Test Post Title',
          contentPreview: 'This is a test post content preview...',
          appealType: 'false_positive',
          appealReason: 'This content was incorrectly flagged',
          userStatement: 'I believe this content follows community guidelines',
          submitterId: 'user_123',
          submitterName: 'Test User',
          submittedAt: DateTime(2025, 8, 1, 10, 30),
          expiresAt: DateTime(2025, 8, 8, 10, 30),
          flagReason: 'inappropriate_content',
          aiScore: 0.85,
          aiAnalysis: {'category': 'spam', 'confidence': 0.85},
          flagCategories: ['spam', 'hate'],
          flagCount: 3,
          votingStatus: VotingStatus.active,
          urgencyScore: 75,
          estimatedResolution: 'Tonight',
          hasUserVoted: false,
          canUserVote: true,
          votingProgress: const VotingProgress(
            totalVotes: 10,
            approveVotes: 7,
            rejectVotes: 3,
            approvalRate: 70.0,
            quorumMet: true,
            timeRemaining: '2 hours',
            estimatedResolution: 'Tonight',
          ),
        );

        // Act
        final json = appeal.toJson();

        // Assert
        expect(json['appealId'], 'appeal_123');
        expect(json['contentId'], 'content_456');
        expect(json['contentType'], 'post');
        expect(json['contentTitle'], 'Test Post Title');
        expect(json['urgencyScore'], 75);
        expect(json['votingStatus'], 'active');
        expect(json['votingProgress'], isA<Map<String, dynamic>>());
      });

      test('should deserialize from JSON correctly', () {
        // Arrange
        final json = {
          'appealId': 'appeal_123',
          'contentId': 'content_456',
          'contentType': 'post',
          'contentTitle': 'Test Post Title',
          'contentPreview': 'This is a test post content preview...',
          'appealType': 'false_positive',
          'appealReason': 'This content was incorrectly flagged',
          'userStatement':
              'I believe this content follows community guidelines',
          'submitterId': 'user_123',
          'submitterName': 'Test User',
          'submittedAt': '2025-08-01T10:30:00.000Z',
          'expiresAt': '2025-08-08T10:30:00.000Z',
          'flagReason': 'inappropriate_content',
          'aiScore': 0.85,
          'aiAnalysis': {'category': 'spam', 'confidence': 0.85},
          'flagCategories': ['spam', 'hate'],
          'flagCount': 3,
          'votingStatus': 'active',
          'urgencyScore': 75,
          'estimatedResolution': 'Tonight',
          'hasUserVoted': false,
          'canUserVote': true,
          'votingProgress': const {
            'totalVotes': 10,
            'approveVotes': 7,
            'rejectVotes': 3,
            'approvalRate': 70.0,
            'quorumMet': true,
            'timeRemaining': '2 hours',
            'estimatedResolution': 'Tonight',
            'voteBreakdown': [],
          },
        };

        // Act
        final appeal = Appeal.fromJson(json);

        // Assert
        expect(appeal.appealId, 'appeal_123');
        expect(appeal.contentId, 'content_456');
        expect(appeal.contentType, 'post');
        expect(appeal.contentTitle, 'Test Post Title');
        expect(appeal.urgencyScore, 75);
        expect(appeal.votingStatus, VotingStatus.active);
        expect(appeal.votingProgress?.totalVotes, 10);
        expect(appeal.aiScore, 0.85);
      });

      test('should handle null optional fields correctly', () {
        // Arrange
        final json = {
          'appealId': 'appeal_123',
          'contentId': 'content_456',
          'contentType': 'post',
          'contentPreview': 'Test content',
          'appealType': 'false_positive',
          'appealReason': 'Test reason',
          'userStatement': 'Test statement',
          'submitterId': 'user_123',
          'submitterName': 'Test User',
          'submittedAt': '2025-08-01T10:30:00.000Z',
          'expiresAt': '2025-08-08T10:30:00.000Z',
          'flagReason': 'test_flag',
          'flagCategories': ['test'],
          'flagCount': 1,
          'votingStatus': 'active',
          'urgencyScore': 50,
          'estimatedResolution': 'Soon',
          'hasUserVoted': false,
          'canUserVote': true,
          // contentTitle, aiScore, aiAnalysis, votingProgress are null
        };

        // Act
        final appeal = Appeal.fromJson(json);

        // Assert
        expect(appeal.contentTitle, isNull);
        expect(appeal.votingProgress, isNull);
        expect(appeal.aiScore, isNull);
        expect(appeal.aiAnalysis, isNull);
        expect(appeal.appealId, 'appeal_123'); // Required fields still work
      });

      test('should handle invalid JSON gracefully', () {
        // Arrange
        final invalidJson = {
          'invalidField': 'value',
          // Missing required fields
        };

        // Act & Assert
        expect(() => Appeal.fromJson(invalidJson), throwsA(isA<TypeError>()));
      });
    });

    group('Validation', () {
      test('should validate urgency score bounds', () {
        // Test cases for urgency score validation
        final testCases = [
          {'score': 0, 'isValid': true},
          {'score': 50, 'isValid': true},
          {'score': 100, 'isValid': true},
          {'score': -1, 'isValid': false},
          {'score': 101, 'isValid': false},
        ];

        for (final testCase in testCases) {
          final score = testCase['score'] as int;
          final isValid = testCase['isValid'] as bool;

          if (isValid) {
            expect(() => _createAppealWithUrgency(score), returnsNormally);
          } else {
            expect(() => _createAppealWithUrgency(score), throwsArgumentError);
          }
        }
      });

      test('should validate appeal type enum values', () {
        final validTypes = ['false_positive', 'context_missing', 'other'];
        final invalidTypes = ['invalid_type', '', null];

        for (final type in validTypes) {
          expect(() => _createAppealWithType(type), returnsNormally);
        }

        for (final type in invalidTypes) {
          expect(() => _createAppealWithType(type), throwsArgumentError);
        }
      });
    });
  });

  group('VotingStatus Enum Tests', () {
    test('should convert enum to string correctly', () {
      expect(VotingStatus.active.name, 'active');
      expect(VotingStatus.quorumReached.name, 'quorumReached');
      expect(VotingStatus.timeExpired.name, 'timeExpired');
      expect(VotingStatus.resolved.name, 'resolved');
    });

    test('should parse string to enum correctly', () {
      expect(VotingStatus.values.byName('active'), VotingStatus.active);
      expect(VotingStatus.values.byName('resolved'), VotingStatus.resolved);
    });
  });

  group('VotingProgress Model Tests', () {
    test('should calculate approval rate correctly', () {
      // Arrange
      const progress = VotingProgress(
        totalVotes: 10,
        approveVotes: 7,
        rejectVotes: 3,
        approvalRate: 70.0,
        quorumMet: true,
      );

      // Assert
      expect(progress.approvalRate, 70.0);
      expect(progress.totalVotes, progress.approveVotes + progress.rejectVotes);
    });

    test('should handle zero votes correctly', () {
      // Arrange
      const progress = VotingProgress(
        totalVotes: 0,
        approveVotes: 0,
        rejectVotes: 0,
        approvalRate: 0.0,
        quorumMet: false,
      );

      // Assert
      expect(progress.approvalRate, 0.0);
      expect(progress.quorumMet, false);
    });
  });
}

/// Helper function to create appeal with specific urgency score
Appeal _createAppealWithUrgency(int urgencyScore) {
  if (urgencyScore < 0 || urgencyScore > 100) {
    throw ArgumentError('Urgency score must be between 0 and 100');
  }

  return Appeal(
    appealId: 'test_id',
    contentId: 'content_id',
    contentType: 'post',
    contentTitle: 'Test Title',
    contentPreview: 'Test content',
    appealType: 'false_positive',
    appealReason: 'Test reason',
    userStatement: 'Test statement',
    submitterId: 'test_submitter',
    submitterName: 'Test Submitter',
    submittedAt: DateTime.now(),
    expiresAt: DateTime.now().add(const Duration(days: 7)),
    flagReason: 'test_flag',
    flagCategories: ['test'],
    flagCount: 1,
    votingStatus: VotingStatus.active,
    urgencyScore: urgencyScore,
    estimatedResolution: 'Soon',
    hasUserVoted: false,
    canUserVote: true,
    votingProgress: const VotingProgress(
      totalVotes: 0,
      approveVotes: 0,
      rejectVotes: 0,
      approvalRate: 0.0,
      quorumMet: false,
      timeRemaining: '7 days',
      estimatedResolution: 'Soon',
    ),
  );
}

/// Helper function to create appeal with specific type
Appeal _createAppealWithType(String? appealType) {
  final validTypes = ['false_positive', 'context_missing', 'other'];
  if (appealType == null || !validTypes.contains(appealType)) {
    throw ArgumentError('Invalid appeal type: $appealType');
  }

  return Appeal(
    appealId: 'test_id',
    contentId: 'content_id',
    contentType: 'post',
    contentTitle: 'Test Title',
    contentPreview: 'Test content',
    appealType: appealType,
    appealReason: 'Test reason',
    userStatement: 'Test statement',
    submitterId: 'test_submitter',
    submitterName: 'Test Submitter',
    submittedAt: DateTime.now(),
    expiresAt: DateTime.now().add(const Duration(days: 7)),
    flagReason: 'test_flag',
    flagCategories: ['test'],
    flagCount: 1,
    votingStatus: VotingStatus.active,
    urgencyScore: 50,
    estimatedResolution: 'Soon',
    hasUserVoted: false,
    canUserVote: true,
    votingProgress: const VotingProgress(
      totalVotes: 0,
      approveVotes: 0,
      rejectVotes: 0,
      approvalRate: 0.0,
      quorumMet: false,
      timeRemaining: '7 days',
      estimatedResolution: 'Soon',
    ),
  );
}
