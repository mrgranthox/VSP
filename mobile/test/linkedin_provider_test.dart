import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vsp_mobile/core/network/api_client.dart';
import 'package:vsp_mobile/core/storage/storage_service.dart';
import 'package:vsp_mobile/data/models/job_alert_model.dart';
import 'package:vsp_mobile/data/models/profile_sections_model.dart';
import 'package:vsp_mobile/data/repositories/linkedin_repository.dart';
import 'package:vsp_mobile/presentation/providers/linkedin_provider.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('LinkedInProvider & LinkedInRepository Tests', () {
    late StorageService storage;
    late ApiClient apiClient;
    late LinkedInRepository repo;
    late LinkedInProvider provider;

    setUp(() async {
      storage = await StorageService.init();
      apiClient = ApiClient(storage: storage);
      repo = LinkedInRepository(apiClient: apiClient);
      provider = LinkedInProvider(repo: repo);
    });

    test('Loads initial data and hydrates default states', () async {
      await provider.loadInitialData();

      expect(provider.isLoading, isFalse);
      expect(provider.isOpenToWork, isTrue);
      expect(provider.experiences.isNotEmpty, isTrue);
      expect(provider.educations.isNotEmpty, isTrue);
      expect(provider.userSkills.isNotEmpty, isTrue);
      expect(provider.recommendations.isNotEmpty, isTrue);
      expect(provider.articles.isNotEmpty, isTrue);
      expect(provider.events.isNotEmpty, isTrue);
      expect(provider.groups.isNotEmpty, isTrue);
      expect(provider.companies.isNotEmpty, isTrue);
      expect(provider.jobAlerts.isNotEmpty, isTrue);
    });

    test('Toggles skill endorsement optimistically', () async {
      await provider.loadUserSkills('me');
      expect(provider.userSkills.isNotEmpty, isTrue);

      final firstSkill = provider.userSkills.first;
      final initialCount = firstSkill.endorsementsCount;
      final initialEndorsed = firstSkill.isEndorsedByMe;

      await provider.toggleSkillEndorsement(firstSkill.id);

      final updatedSkill = provider.userSkills.firstWhere((s) => s.id == firstSkill.id);
      expect(updatedSkill.isEndorsedByMe, !initialEndorsed);
      expect(updatedSkill.endorsementsCount, initialEndorsed ? initialCount - 1 : initialCount + 1);
    });

    test('Toggles article reaction count optimistically', () async {
      await provider.loadArticles();
      expect(provider.articles.isNotEmpty, isTrue);

      final article = provider.articles.first;
      final initialReacted = article.isReacted;
      final initialReactions = article.reactionsCount;

      provider.toggleArticleReaction(article.id);

      final updated = provider.articles.firstWhere((a) => a.id == article.id);
      expect(updated.isReacted, !initialReacted);
      expect(updated.reactionsCount, initialReacted ? initialReactions - 1 : initialReactions + 1);
    });

    test('Adds article comment and increments counter', () async {
      await provider.loadArticles();
      final article = provider.articles.first;
      final initialCount = article.commentsCount;

      await provider.addArticleComment(article.id, 'Great insights on compliance!');

      final updated = provider.articles.firstWhere((a) => a.id == article.id);
      expect(updated.commentsCount, initialCount + 1);
      expect(provider.articleComments.isNotEmpty, isTrue);
      expect(provider.articleComments.first.content, 'Great insights on compliance!');
    });

    test('Toggles event RSVP status and attendee count', () async {
      await provider.loadEvents();
      expect(provider.events.isNotEmpty, isTrue);

      final event = provider.events.first;
      final initialGoing = event.myRsvpStatus == 'GOING';
      final initialCount = event.attendeeCount;

      final newStatus = initialGoing ? 'NOT_GOING' : 'GOING';
      await provider.toggleRsvp(event.id, newStatus);

      final updated = provider.events.firstWhere((e) => e.id == event.id);
      expect(updated.myRsvpStatus, newStatus);
      expect(updated.attendeeCount, initialGoing ? initialCount - 1 : initialCount + 1);
    });

    test('Toggles group membership', () async {
      await provider.loadGroups();
      expect(provider.groups.isNotEmpty, isTrue);

      final group = provider.groups.first;
      final initialMember = group.isMember;
      final initialCount = group.memberCount;

      await provider.toggleGroupMembership(group.id);

      final updated = provider.groups.firstWhere((g) => g.id == group.id);
      expect(updated.isMember, !initialMember);
      expect(updated.memberCount, initialMember ? initialCount - 1 : initialCount + 1);
    });

    test('Toggles company follow status', () async {
      await provider.loadCompanies();
      expect(provider.companies.isNotEmpty, isTrue);

      final comp = provider.companies.first;
      final initialFollow = comp.isFollowed;
      final initialFollowers = comp.followerCount;

      await provider.toggleFollowCompany(comp.id);

      final updated = provider.companies.firstWhere((c) => c.id == comp.id);
      expect(updated.isFollowed, !initialFollow);
      expect(updated.followerCount, initialFollow ? initialFollowers - 1 : initialFollowers + 1);
    });

    test('Creates and deletes job alert', () async {
      await provider.loadJobAlerts();
      final initialAlertsCount = provider.jobAlerts.length;

      final newAlert = JobAlertItem(
        id: 'new-alt-99',
        title: 'Generator Maintenance Lead',
        query: 'diesel generator, cummins, perkins',
        city: 'Tema',
        tradeCategory: 'ELECTRICAL',
        frequency: 'WEEKLY',
        isActive: true,
        createdAt: DateTime.now(),
      );

      await provider.createJobAlert(newAlert);
      expect(provider.jobAlerts.length, initialAlertsCount + 1);

      await provider.deleteJobAlert('new-alt-99');
      expect(provider.jobAlerts.length, initialAlertsCount);
    });

    test('Adds experience item into profile', () async {
      await provider.loadProfileSections('me');
      final initialExpCount = provider.experiences.length;

      final newExp = ProfileExperience(
        id: 'exp-test',
        title: 'Senior Solar Field Technician',
        company: 'Volta Energy Hub',
        location: 'Ho, Volta Region',
        startDate: DateTime.parse('2023-01-01'),
        isCurrent: true,
        description: 'Microgrid deployment for off-grid communities.',
      );

      await provider.addExperience(newExp);
      expect(provider.experiences.length, initialExpCount + 1);
      expect(provider.experiences.first.title, 'Senior Solar Field Technician');
    });

    test('Toggles OpenToWork and OpenToHire', () {
      provider.toggleOpenToWork(false);
      expect(provider.isOpenToWork, isFalse);

      provider.toggleOpenToHire(true);
      expect(provider.isOpenToHire, isTrue);
    });
  });
}
