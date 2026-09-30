import 'package:flutter/material.dart';
import '../../data/models/article_model.dart';
import '../../data/models/company_model.dart';
import '../../data/models/event_model.dart';
import '../../data/models/group_model.dart';
import '../../data/models/job_alert_model.dart';
import '../../data/models/profile_sections_model.dart';
import '../../data/models/recommendation_model.dart';
import '../../data/models/skill_model.dart';
import '../../data/repositories/linkedin_repository.dart';

class LinkedInProvider extends ChangeNotifier {
  final LinkedInRepository repo;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  // Profile Sections & Views
  List<ProfileExperience> _experiences = [];
  List<ProfileEducation> _educations = [];
  List<ProfileAccomplishment> _accomplishments = [];
  List<ProfileFeaturedItem> _featured = [];
  List<ProfileViewEntry> _profileViews = [];
  bool _isOpenToWork = true;
  bool _isOpenToHire = false;

  List<ProfileExperience> get experiences => _experiences;
  List<ProfileEducation> get educations => _educations;
  List<ProfileAccomplishment> get accomplishments => _accomplishments;
  List<ProfileFeaturedItem> get featured => _featured;
  List<ProfileViewEntry> get profileViews => _profileViews;
  bool get isOpenToWork => _isOpenToWork;
  bool get isOpenToHire => _isOpenToHire;

  // Skills
  List<UserSkillItem> _userSkills = [];
  List<SkillTaxonomyItem> _taxonomy = [];
  List<UserSkillItem> get userSkills => _userSkills;
  List<SkillTaxonomyItem> get taxonomy => _taxonomy;

  // Recommendations
  List<RecommendationItem> _recommendations = [];
  List<RecommendationItem> get recommendations => _recommendations;

  // Articles
  List<ArticleItem> _articles = [];
  ArticleItem? _currentArticle;
  final List<ArticleCommentItem> _articleComments = [];
  List<ArticleItem> get articles => _articles;
  ArticleItem? get currentArticle => _currentArticle;
  List<ArticleCommentItem> get articleComments => _articleComments;

  // Events
  List<EventItem> _events = [];
  EventItem? _currentEvent;
  List<EventItem> get events => _events;
  EventItem? get currentEvent => _currentEvent;

  // Groups
  List<GroupItem> _groups = [];
  GroupItem? _currentGroup;
  List<GroupItem> get groups => _groups;
  GroupItem? get currentGroup => _currentGroup;

  // Companies
  List<CompanyPageItem> _companies = [];
  CompanyPageItem? _currentCompany;
  List<CompanyPageItem> get companies => _companies;
  CompanyPageItem? get currentCompany => _currentCompany;

  // Job Alerts
  List<JobAlertItem> _jobAlerts = [];
  List<JobAlertItem> get jobAlerts => _jobAlerts;

  LinkedInProvider({required this.repo}) {
    loadInitialData();
  }

  Future<void> loadInitialData() async {
    _isLoading = true;
    notifyListeners();

    try {
      await Future.wait([
        loadProfileSections('me'),
        loadWhoViewed(),
        loadUserSkills('me'),
        loadRecommendations('me'),
        loadArticles(),
        loadEvents(),
        loadGroups(),
        loadCompanies(),
        loadJobAlerts(),
      ]);
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  // -------------------------------------------------------------
  // PROFILE SECTIONS
  // -------------------------------------------------------------
  Future<void> loadProfileSections(String userId) async {
    try {
      final data = await repo.getProfileSections(userId);
      final rawExp = data['experiences'] as List<dynamic>?;
      if (rawExp != null) {
        _experiences = rawExp.map((e) => e is ProfileExperience ? e : ProfileExperience.fromJson(e as Map<String, dynamic>)).toList();
      }
      final rawEdu = data['educations'] as List<dynamic>?;
      if (rawEdu != null) {
        _educations = rawEdu.map((e) => e is ProfileEducation ? e : ProfileEducation.fromJson(e as Map<String, dynamic>)).toList();
      }
      final rawAcc = data['accomplishments'] as List<dynamic>?;
      if (rawAcc != null) {
        _accomplishments = rawAcc.map((e) => e is ProfileAccomplishment ? e : ProfileAccomplishment.fromJson(e as Map<String, dynamic>)).toList();
      }
      final rawFeat = data['featured'] as List<dynamic>?;
      if (rawFeat != null) {
        _featured = rawFeat.map((e) => e is ProfileFeaturedItem ? e : ProfileFeaturedItem.fromJson(e as Map<String, dynamic>)).toList();
      }
      _isOpenToWork = data['isOpenToWork'] as bool? ?? true;
      _isOpenToHire = data['isOpenToHire'] as bool? ?? false;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadWhoViewed() async {
    try {
      _profileViews = await repo.getWhoViewedProfile();
      notifyListeners();
    } catch (_) {}
  }

  void toggleOpenToWork(bool value) {
    _isOpenToWork = value;
    notifyListeners();
  }

  void toggleOpenToHire(bool value) {
    _isOpenToHire = value;
    notifyListeners();
  }

  Future<void> addExperience(ProfileExperience exp) async {
    _experiences.insert(0, exp);
    notifyListeners();
    try {
      await repo.addExperience(exp.toJson());
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // SKILLS & ENDORSEMENTS
  // -------------------------------------------------------------
  Future<void> loadUserSkills(String userId) async {
    try {
      _userSkills = await repo.getUserSkills(userId);
      _taxonomy = await repo.getSkillsTaxonomy();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> toggleSkillEndorsement(String skillId) async {
    final index = _userSkills.indexWhere((s) => s.skillId == skillId || s.id == skillId);
    if (index != -1) {
      final skill = _userSkills[index];
      final newEndorsed = !skill.isEndorsedByMe;
      final newCount = newEndorsed ? skill.endorsementsCount + 1 : skill.endorsementsCount - 1;

      _userSkills[index] = skill.copyWith(
        isEndorsedByMe: newEndorsed,
        endorsementsCount: newCount,
      );
      notifyListeners();

      try {
        await repo.endorseSkill(skill.skillId);
      } catch (_) {}
    }
  }

  // -------------------------------------------------------------
  // RECOMMENDATIONS
  // -------------------------------------------------------------
  Future<void> loadRecommendations(String userId) async {
    try {
      _recommendations = await repo.getUserRecommendations(userId);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> sendRecommendation({
    required String recipientUserId,
    required String text,
    String? relationship,
  }) async {
    try {
      await repo.giveRecommendation(
        recipientUserId: recipientUserId,
        text: text,
        relationship: relationship,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // ARTICLES
  // -------------------------------------------------------------
  Future<void> loadArticles() async {
    try {
      _articles = await repo.getArticles();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> selectArticle(String slug) async {
    _isLoading = true;
    notifyListeners();
    try {
      _currentArticle = await repo.getArticleDetail(slug);
    } catch (_) {}
    _isLoading = false;
    notifyListeners();
  }

  void toggleArticleReaction(String articleId) {
    final index = _articles.indexWhere((a) => a.id == articleId);
    if (index != -1) {
      final art = _articles[index];
      final newReacted = !art.isReacted;
      final newCount = newReacted ? art.reactionsCount + 1 : art.reactionsCount - 1;

      _articles[index] = art.copyWith(
        isReacted: newReacted,
        reactionsCount: newCount,
      );
      if (_currentArticle?.id == articleId) {
        _currentArticle = _articles[index];
      }
      notifyListeners();

      repo.toggleArticleReaction(articleId);
    }
  }

  Future<void> addArticleComment(String articleId, String text) async {
    try {
      final comment = await repo.addArticleComment(articleId, text);
      _articleComments.insert(0, comment);
      final index = _articles.indexWhere((a) => a.id == articleId);
      if (index != -1) {
        _articles[index] = _articles[index].copyWith(
          commentsCount: _articles[index].commentsCount + 1,
        );
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<bool> publishArticle({
    required String title,
    required String content,
    String? subtitle,
    String? coverImageUrl,
  }) async {
    try {
      final newArticle = await repo.createArticle(
        title: title,
        content: content,
        subtitle: subtitle,
        coverImageUrl: coverImageUrl,
      );
      _articles.insert(0, newArticle);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------
  Future<void> loadEvents() async {
    try {
      _events = await repo.getEvents();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> selectEvent(String id) async {
    try {
      _currentEvent = await repo.getEventDetail(id);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> toggleRsvp(String eventId, String status) async {
    final index = _events.indexWhere((e) => e.id == eventId);
    if (index != -1) {
      final ev = _events[index];
      final wasGoing = ev.myRsvpStatus == 'GOING';
      final isNowGoing = status == 'GOING';
      int delta = 0;
      if (isNowGoing && !wasGoing) delta = 1;
      if (!isNowGoing && wasGoing) delta = -1;

      _events[index] = ev.copyWith(
        myRsvpStatus: status,
        attendeeCount: ev.attendeeCount + delta,
      );
      if (_currentEvent?.id == eventId) {
        _currentEvent = _events[index];
      }
      notifyListeners();

      repo.rsvpEvent(eventId, status);
    }
  }

  Future<bool> createEvent({
    required String title,
    required String description,
    required String eventType,
    required DateTime startAt,
    DateTime? endAt,
    String? location,
    String? meetingUrl,
    String? coverImageUrl,
  }) async {
    try {
      final newEv = await repo.createEvent(
        title: title,
        description: description,
        eventType: eventType,
        startAt: startAt,
        endAt: endAt,
        location: location,
        meetingUrl: meetingUrl,
        coverImageUrl: coverImageUrl,
      );
      _events.insert(0, newEv);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    }
  }

  // -------------------------------------------------------------
  // GROUPS
  // -------------------------------------------------------------
  Future<void> loadGroups() async {
    try {
      _groups = await repo.getGroups();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> selectGroup(String id) async {
    try {
      _currentGroup = await repo.getGroupDetail(id);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> toggleGroupMembership(String groupId) async {
    final index = _groups.indexWhere((g) => g.id == groupId);
    if (index != -1) {
      final grp = _groups[index];
      final newMember = !grp.isMember;
      final newCount = newMember ? grp.memberCount + 1 : grp.memberCount - 1;

      _groups[index] = grp.copyWith(
        isMember: newMember,
        memberCount: newCount,
        myRole: newMember ? 'MEMBER' : null,
      );
      if (_currentGroup?.id == groupId) {
        _currentGroup = _groups[index];
      }
      notifyListeners();

      if (newMember) {
        repo.joinGroup(groupId);
      } else {
        repo.leaveGroup(groupId);
      }
    }
  }

  // -------------------------------------------------------------
  // COMPANIES
  // -------------------------------------------------------------
  Future<void> loadCompanies() async {
    try {
      _companies = await repo.getCompanies();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> selectCompany(String slug) async {
    try {
      _currentCompany = await repo.getCompanyDetail(slug);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> toggleFollowCompany(String companyId) async {
    final index = _companies.indexWhere((c) => c.id == companyId);
    if (index != -1) {
      final comp = _companies[index];
      final newFollow = !comp.isFollowed;
      final newCount = newFollow ? comp.followerCount + 1 : comp.followerCount - 1;

      _companies[index] = comp.copyWith(
        isFollowed: newFollow,
        followerCount: newCount,
      );
      if (_currentCompany?.id == companyId) {
        _currentCompany = _companies[index];
      }
      notifyListeners();

      repo.toggleFollowCompany(companyId);
    }
  }

  // -------------------------------------------------------------
  // JOB ALERTS
  // -------------------------------------------------------------
  Future<void> loadJobAlerts() async {
    try {
      _jobAlerts = await repo.getJobAlerts();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> createJobAlert(JobAlertItem alert) async {
    try {
      final created = await repo.createJobAlert(alert.toJson());
      _jobAlerts.insert(0, created);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> deleteJobAlert(String id) async {
    _jobAlerts.removeWhere((a) => a.id == id);
    notifyListeners();
    try {
      await repo.deleteJobAlert(id);
    } catch (_) {}
  }
}
