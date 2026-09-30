import '../../core/constants/api_constants.dart';
import '../../core/network/api_client.dart';
import '../models/article_model.dart';
import '../models/company_model.dart';
import '../models/event_model.dart';
import '../models/group_model.dart';
import '../models/job_alert_model.dart';
import '../models/profile_sections_model.dart';
import '../models/recommendation_model.dart';
import '../models/skill_model.dart';

class LinkedInRepository {
  final ApiClient apiClient;

  LinkedInRepository({required this.apiClient});

  // -------------------------------------------------------------
  // PROFILE SECTIONS
  // -------------------------------------------------------------
  Future<Map<String, dynamic>> getProfileSections(String userId) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.profileSummary(userId),
        requiresAuth: true,
      );
      if (res.data != null) return res.data!;
    } catch (_) {}

    return {
      'experiences': _fallbackExperiences,
      'educations': _fallbackEducations,
      'accomplishments': _fallbackAccomplishments,
      'featured': _fallbackFeatured,
      'isOpenToWork': true,
      'isOpenToHire': false,
    };
  }

  Future<List<ProfileViewEntry>> getWhoViewedProfile() async {
    try {
      final res = await apiClient.get<List<dynamic>>(
        ApiConstants.profileWhoViewed,
        requiresAuth: true,
      );
      if (res.data != null && res.data!.isNotEmpty) {
        return res.data!
            .map((e) => ProfileViewEntry.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackProfileViews;
  }

  Future<void> addExperience(Map<String, dynamic> data) async {
    await apiClient.post(
      ApiConstants.profileExperiences,
      body: data,
      requiresAuth: true,
    );
  }

  Future<void> addEducation(Map<String, dynamic> data) async {
    await apiClient.post(
      ApiConstants.profileEducations,
      body: data,
      requiresAuth: true,
    );
  }

  Future<void> addAccomplishment(Map<String, dynamic> data) async {
    await apiClient.post(
      ApiConstants.profileAccomplishments,
      body: data,
      requiresAuth: true,
    );
  }

  // -------------------------------------------------------------
  // SKILLS & ENDORSEMENTS
  // -------------------------------------------------------------
  Future<List<UserSkillItem>> getUserSkills(String userId) async {
    try {
      final res = await apiClient.get<List<dynamic>>(
        ApiConstants.userSkills(userId),
        requiresAuth: true,
      );
      if (res.data != null && res.data!.isNotEmpty) {
        return res.data!
            .map((e) => UserSkillItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackUserSkills;
  }

  Future<List<SkillTaxonomyItem>> getSkillsTaxonomy() async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.skillsTaxonomy,
        requiresAuth: false,
      );
      final items = res.data?['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        return items
            .map((e) => SkillTaxonomyItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackTaxonomy;
  }

  Future<void> endorseSkill(String skillId, {String? relationship}) async {
    try {
      await apiClient.post(
        ApiConstants.endorseSkill(skillId),
        body: {'relationship': ?relationship},
        requiresAuth: true,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // RECOMMENDATIONS
  // -------------------------------------------------------------
  Future<List<RecommendationItem>> getUserRecommendations(String userId) async {
    try {
      final res = await apiClient.get<List<dynamic>>(
        ApiConstants.userRecommendations(userId),
        requiresAuth: false,
      );
      if (res.data != null && res.data!.isNotEmpty) {
        return res.data!
            .map((e) => RecommendationItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackRecommendations;
  }

  Future<void> giveRecommendation({
    required String recipientUserId,
    required String text,
    String? relationship,
  }) async {
    try {
      await apiClient.post(
        ApiConstants.recommendations,
        body: {
          'recipientUserId': recipientUserId,
          'text': text,
          'relationship': ?relationship,
        },
        requiresAuth: true,
      );
    } catch (_) {}
  }

  Future<void> updateRecommendationStatus(String id, String status) async {
    try {
      await apiClient.put(
        ApiConstants.recommendationStatus(id),
        body: {'status': status},
        requiresAuth: true,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // LONG-FORM ARTICLES
  // -------------------------------------------------------------
  Future<List<ArticleItem>> getArticles({int page = 1, int limit = 10}) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.articles,
        queryParams: {'page': page, 'limit': limit},
        requiresAuth: false,
      );
      final items = res.data?['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        return items
            .map((e) => ArticleItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackArticles;
  }

  Future<ArticleItem> getArticleDetail(String slug) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.articleDetail(slug),
        requiresAuth: false,
      );
      if (res.data != null) {
        return ArticleItem.fromJson(res.data!);
      }
    } catch (_) {}

    final found = _fallbackArticles.where((a) => a.slug == slug);
    if (found.isNotEmpty) return found.first;
    return _fallbackArticles.first;
  }

  Future<ArticleItem> createArticle({
    required String title,
    required String content,
    String? subtitle,
    String? coverImageUrl,
  }) async {
    final res = await apiClient.post<Map<String, dynamic>>(
      ApiConstants.articles,
      body: {
        'title': title,
        'content': content,
        'subtitle': ?subtitle,
        'coverImageUrl': ?coverImageUrl,
      },
      requiresAuth: true,
    );
    if (res.data != null) {
      return ArticleItem.fromJson(res.data!);
    }
    return _fallbackArticles.first;
  }

  Future<void> toggleArticleReaction(String articleId, {String type = 'LIKE'}) async {
    try {
      await apiClient.post(
        ApiConstants.articleReactions(articleId),
        body: {'type': type},
        requiresAuth: true,
      );
    } catch (_) {}
  }

  Future<ArticleCommentItem> addArticleComment(String articleId, String content) async {
    try {
      final res = await apiClient.post<Map<String, dynamic>>(
        ApiConstants.articleComments(articleId),
        body: {'content': content},
        requiresAuth: true,
      );
      if (res.data != null) {
        return ArticleCommentItem.fromJson(res.data!);
      }
    } catch (_) {}
    return ArticleCommentItem(
      id: 'mock-c-${DateTime.now().millisecondsSinceEpoch}',
      articleId: articleId,
      authorId: 'u-self',
      authorName: 'You',
      content: content,
      createdAt: DateTime.now(),
    );
  }

  // -------------------------------------------------------------
  // EVENTS
  // -------------------------------------------------------------
  Future<List<EventItem>> getEvents() async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.events,
        requiresAuth: false,
      );
      final items = res.data?['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        return items
            .map((e) => EventItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackEvents;
  }

  Future<EventItem> getEventDetail(String id) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.eventDetail(id),
        requiresAuth: false,
      );
      if (res.data != null) {
        return EventItem.fromJson(res.data!);
      }
    } catch (_) {}

    final found = _fallbackEvents.where((e) => e.id == id);
    if (found.isNotEmpty) return found.first;
    return _fallbackEvents.first;
  }

  Future<void> rsvpEvent(String eventId, String status) async {
    try {
      await apiClient.post(
        ApiConstants.eventRsvp(eventId),
        body: {'status': status},
        requiresAuth: true,
      );
    } catch (_) {}
  }

  Future<EventItem> createEvent({
    required String title,
    required String description,
    required String eventType,
    required DateTime startAt,
    DateTime? endAt,
    String? location,
    String? meetingUrl,
    String? coverImageUrl,
  }) async {
    final payload = {
      'title': title,
      'description': description,
      'eventType': eventType,
      'startAt': startAt.toIso8601String(),
      if (endAt != null) 'endAt': endAt.toIso8601String(),
      'location': ?location,
      'meetingUrl': ?meetingUrl,
      'coverImageUrl': ?coverImageUrl,
    };
    try {
      final res = await apiClient.post<Map<String, dynamic>>(
        ApiConstants.events,
        body: payload,
        requiresAuth: true,
      );
      if (res.data != null) {
        return EventItem.fromJson(res.data!);
      }
    } catch (_) {}

    return EventItem(
      id: 'ev-${DateTime.now().millisecondsSinceEpoch}',
      organizerId: 'u-self',
      organizerName: 'You',
      title: title,
      description: description,
      eventType: eventType,
      location: location,
      meetingUrl: meetingUrl,
      startAt: startAt,
      endAt: endAt,
      coverImageUrl: coverImageUrl,
      attendeeCount: 1,
      myRsvpStatus: 'GOING',
      createdAt: DateTime.now(),
    );
  }

  // -------------------------------------------------------------
  // GROUPS & TRADE COMMUNITIES
  // -------------------------------------------------------------
  Future<List<GroupItem>> getGroups() async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.groups,
        requiresAuth: false,
      );
      final items = res.data?['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        return items
            .map((e) => GroupItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackGroups;
  }

  Future<GroupItem> getGroupDetail(String id) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.groupDetail(id),
        requiresAuth: false,
      );
      if (res.data != null) {
        return GroupItem.fromJson(res.data!);
      }
    } catch (_) {}

    final found = _fallbackGroups.where((g) => g.id == id);
    if (found.isNotEmpty) return found.first;
    return _fallbackGroups.first;
  }

  Future<void> joinGroup(String groupId) async {
    try {
      await apiClient.post(
        ApiConstants.groupJoin(groupId),
        requiresAuth: true,
      );
    } catch (_) {}
  }

  Future<void> leaveGroup(String groupId) async {
    try {
      await apiClient.delete(
        ApiConstants.groupLeave(groupId),
        requiresAuth: true,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // COMPANY PAGES
  // -------------------------------------------------------------
  Future<List<CompanyPageItem>> getCompanies() async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.companies,
        requiresAuth: false,
      );
      final items = res.data?['items'] as List<dynamic>?;
      if (items != null && items.isNotEmpty) {
        return items
            .map((e) => CompanyPageItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackCompanies;
  }

  Future<CompanyPageItem> getCompanyDetail(String slug) async {
    try {
      final res = await apiClient.get<Map<String, dynamic>>(
        ApiConstants.companyDetail(slug),
        requiresAuth: false,
      );
      if (res.data != null) {
        return CompanyPageItem.fromJson(res.data!);
      }
    } catch (_) {}

    final match = _fallbackCompanies.where((c) => c.slug == slug);
    if (match.isNotEmpty) return match.first;
    return _fallbackCompanies.first;
  }

  Future<void> toggleFollowCompany(String companyId) async {
    try {
      await apiClient.post(
        ApiConstants.companyFollow(companyId),
        requiresAuth: true,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // JOB ALERTS
  // -------------------------------------------------------------
  Future<List<JobAlertItem>> getJobAlerts() async {
    try {
      final res = await apiClient.get<List<dynamic>>(
        ApiConstants.jobAlerts,
        requiresAuth: true,
      );
      if (res.data != null && res.data!.isNotEmpty) {
        return res.data!
            .map((e) => JobAlertItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    return _fallbackJobAlerts;
  }

  Future<JobAlertItem> createJobAlert(Map<String, dynamic> data) async {
    try {
      final res = await apiClient.post<Map<String, dynamic>>(
        ApiConstants.jobAlerts,
        body: data,
        requiresAuth: true,
      );
      if (res.data != null) {
        return JobAlertItem.fromJson(res.data!);
      }
    } catch (_) {}
    return JobAlertItem.fromJson(data);
  }

  Future<void> deleteJobAlert(String id) async {
    try {
      await apiClient.delete(
        ApiConstants.jobAlertDetail(id),
        requiresAuth: true,
      );
    } catch (_) {}
  }

  // -------------------------------------------------------------
  // FALLBACK DATA (For offline resilience & fast testing)
  // -------------------------------------------------------------
  static final List<ProfileExperience> _fallbackExperiences = [
    ProfileExperience(
      id: 'exp-1',
      title: 'Senior Master Electrician & Foreman',
      company: 'Apex Power Solutions LLC',
      location: 'Accra, Greater Accra',
      employmentType: 'Full-time',
      startDate: DateTime(2021, 3),
      isCurrent: true,
      description: 'Supervised 12 journeymen electricians on 3-phase industrial power installations and smart grid automation.',
    ),
    ProfileExperience(
      id: 'exp-2',
      title: 'Residential Electrical Specialist',
      company: 'Volt Craft Services',
      location: 'Tema, Greater Accra',
      employmentType: 'Contract',
      startDate: DateTime(2018, 1),
      endDate: DateTime(2021, 2),
      isCurrent: false,
      description: 'Led rewiring, breaker replacements, and backup inverter setups for over 150 residential properties.',
    ),
  ];

  static final List<ProfileEducation> _fallbackEducations = [
    ProfileEducation(
      id: 'edu-1',
      school: 'Accra Technical University',
      degree: 'Higher National Diploma (HND)',
      fieldOfStudy: 'Electrical & Electronic Engineering',
      startDate: DateTime(2015, 9),
      endDate: DateTime(2018, 6),
      grade: 'Distinction',
      description: 'Specialized in Power Systems, Control Panels, and Industrial Safety Regulations.',
    ),
  ];

  static final List<ProfileAccomplishment> _fallbackAccomplishments = [
    ProfileAccomplishment(
      id: 'acc-1',
      type: 'LICENSE',
      title: 'Certified Master Electrician (Class A)',
      issuer: 'Energy Commission Ghana',
      issueDate: DateTime(2020, 4),
      credentialId: 'EC-GH-2020-0941',
    ),
    ProfileAccomplishment(
      id: 'acc-2',
      type: 'CERTIFICATION',
      title: 'OSHA 30-Hour Construction Safety',
      issuer: 'Occupational Safety & Health Administration',
      issueDate: DateTime(2022, 8),
    ),
  ];

  static final List<ProfileFeaturedItem> _fallbackFeatured = [
    ProfileFeaturedItem(
      id: 'feat-1',
      type: 'PROJECT',
      title: 'Solar Backup Power Grid Setup (20kW)',
      description: 'Zero-downtime hybrid solar inverter installation with lithium storage for a 4-story commercial office.',
      url: 'https://vsp.platform/projects/solar-grid-20kw',
    ),
  ];

  static final List<ProfileViewEntry> _fallbackProfileViews = [
    ProfileViewEntry(
      id: 'pv-1',
      viewerId: 'u-2',
      viewerName: 'Michael Donkor',
      viewerHeadline: 'Procurement Manager at Golden Gate Builders',
      viewedAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    ProfileViewEntry(
      id: 'pv-2',
      viewerId: 'u-3',
      viewerName: 'Sarah Asamoah',
      viewerHeadline: 'Facility Director • Commercial Real Estate',
      viewedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    ProfileViewEntry(
      id: 'pv-3',
      viewerId: 'u-4',
      viewerName: 'Kwesi Appiah',
      viewerHeadline: 'General Contractor • High-Rise Developments',
      viewedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
  ];

  static final List<UserSkillItem> _fallbackUserSkills = [
    UserSkillItem(
      id: 'usk-1',
      skillId: 'sk-1',
      name: 'Industrial Three-Phase Wiring',
      category: 'Electrical',
      yearsOfExperience: 7,
      endorsementsCount: 24,
      isEndorsedByMe: false,
    ),
    UserSkillItem(
      id: 'usk-2',
      skillId: 'sk-2',
      name: 'Smart Distribution Panels',
      category: 'Electrical',
      yearsOfExperience: 5,
      endorsementsCount: 18,
      isEndorsedByMe: true,
    ),
    UserSkillItem(
      id: 'usk-3',
      skillId: 'sk-3',
      name: 'Solar Inverter Synchronization',
      category: 'Renewables',
      yearsOfExperience: 4,
      endorsementsCount: 15,
      isEndorsedByMe: false,
    ),
  ];

  static final List<SkillTaxonomyItem> _fallbackTaxonomy = [
    SkillTaxonomyItem(id: 'sk-1', name: 'Three-Phase Wiring', category: 'Electrical', count: 42),
    SkillTaxonomyItem(id: 'sk-2', name: 'Distribution Panel Upgrade', category: 'Electrical', count: 35),
    SkillTaxonomyItem(id: 'sk-3', name: 'Solar PV Inverter Setup', category: 'Renewables', count: 28),
    SkillTaxonomyItem(id: 'sk-4', name: 'Pipe Threading & Welding', category: 'Plumbing', count: 19),
    SkillTaxonomyItem(id: 'sk-5', name: 'Hydronic Heating Repair', category: 'HVAC', count: 22),
  ];

  static final List<RecommendationItem> _fallbackRecommendations = [
    RecommendationItem(
      id: 'rec-1',
      authorId: 'u-client-1',
      recipientId: 'u-self',
      relationship: 'Client on Commercial Fit-Out',
      text: 'One of the most diligent and technically sound electrical contractors I have ever hired. Completed our distribution panel overhaul 2 days ahead of schedule with zero safety incidents.',
      status: 'ACCEPTED',
      authorName: 'David K. Mensah',
      authorHeadline: 'Managing Director, Apex Properties',
      recipientName: 'You',
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
    ),
  ];

  static final List<ArticleItem> _fallbackArticles = [
    ArticleItem(
      id: 'art-1',
      authorId: 'u-auth-1',
      authorName: 'Samuel Quaye',
      authorHeadline: 'Master Electrician & Electrical Safety Consultant',
      title: 'Transitioning to Solar Microgrids: The Contractor Blueprint for 2026',
      slug: 'solar-microgrids-contractor-blueprint-2026',
      subtitle: 'A step-by-step technical guide for licensed electrical trades navigating high-capacity hybrid solar systems.',
      content: '''The demand for distributed commercial microgrids has accelerated exponentially over the past 24 months. 

For vocational electrical specialists, mastering hybrid inverter synchronization, lithium iron phosphate (LiFePO4) battery management systems, and automatic transfer switch (ATS) subpanel logic is no longer an optional skill—it is the cornerstone of premium contracting margins.

### 1. Inverter Sizing & Peak Surge Current
When configuring systems with induction motor loads (water pumps, heavy air conditioning chillers), standard continuous ratings are deceptive. A 10kVA inverter may trip if motor inrush currents exceed 300% of nominal rating for more than 50 milliseconds.

### 2. Ground Fault Protection & Isolation
Always ensure dedicated neutral-ground bonding in islanded off-grid state while maintaining compliance with local trade utility interconnect standards.

### Summary
Tradespeople who master clean energy engineering will command top-tier day rates and retain enterprise commercial maintenance contracts.''',
      coverImageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
      readingTimeMinutes: 5,
      viewCount: 1420,
      reactionsCount: 89,
      commentsCount: 23,
      isReacted: false,
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    ArticleItem(
      id: 'art-2',
      authorId: 'u-auth-2',
      authorName: 'Evelyn Addo',
      authorHeadline: 'Lead HVAC Engineer • Chillers & Clean Rooms',
      title: 'Modern Hydronic Diagnostics: Troubleshooting Cavitation & Balancing',
      slug: 'modern-hydronic-diagnostics-cavitation',
      subtitle: 'Diagnostic procedures for large commercial hydronic loops and closed-circuit pumps.',
      content: '''Pump cavitation remains the silent killer of commercial closed-loop HVAC systems. Detecting the distinct gravel-sound signature early prevents impeller disintegration and tens of thousands in downtime...''',
      coverImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
      readingTimeMinutes: 4,
      viewCount: 890,
      reactionsCount: 64,
      commentsCount: 12,
      isReacted: true,
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
  ];

  static final List<EventItem> _fallbackEvents = [
    EventItem(
      id: 'ev-1',
      organizerId: 'u-org-1',
      organizerName: 'National Vocational Training Institute (NVTI)',
      title: '2026 Solar & Energy Storage Masterclass',
      description: 'Hands-on intensive masterclass covering multi-string inverter programming, battery bank safety, and commercial commissioning.',
      eventType: 'IN_PERSON',
      location: 'NVTI Technical Center, East Legon, Accra',
      startAt: DateTime.now().add(const Duration(days: 7, hours: 10)),
      endAt: DateTime.now().add(const Duration(days: 7, hours: 16)),
      attendeeCount: 148,
      myRsvpStatus: 'GOING',
      createdAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
    EventItem(
      id: 'ev-2',
      organizerId: 'u-org-2',
      organizerName: 'Ghana Association of Certified Plumbers',
      title: 'Smart Leak Detection & IoT Flow Metering Webinar',
      description: 'Learn how smart acoustic and pressure IoT sensors are reshaping municipal and residential water leak mitigation.',
      eventType: 'ONLINE',
      meetingUrl: 'https://vsp.platform/events/smart-leak-webinar',
      startAt: DateTime.now().add(const Duration(days: 12, hours: 18)),
      endAt: DateTime.now().add(const Duration(days: 12, hours: 20)),
      attendeeCount: 76,
      myRsvpStatus: null,
      createdAt: DateTime.now().subtract(const Duration(days: 6)),
    ),
  ];

  static final List<GroupItem> _fallbackGroups = [
    GroupItem(
      id: 'grp-1',
      name: 'West African Electrical Contractors Union',
      slug: 'west-african-electrical-contractors',
      description: 'A peer community for licensed electricians, electrical contractors, and solar technicians sharing code updates, project leads, and trade advice.',
      privacy: 'OPEN',
      memberCount: 1240,
      isMember: true,
      myRole: 'MEMBER',
      createdAt: DateTime(2024, 1),
    ),
    GroupItem(
      id: 'grp-2',
      name: 'Precision HVAC & Cleanroom Engineers',
      slug: 'precision-hvac-engineers',
      description: 'Specialists in hospital cleanrooms, industrial cold storage, and complex VRF system diagnostics.',
      privacy: 'OPEN',
      memberCount: 820,
      isMember: false,
      myRole: null,
      createdAt: DateTime(2024, 3),
    ),
    GroupItem(
      id: 'grp-3',
      name: 'Master Plumbers & Pipefitters Circle',
      slug: 'master-plumbers-circle',
      description: 'Commercial plumbing, high-rise pressure distribution, and hydronic systems.',
      privacy: 'CLOSED',
      memberCount: 560,
      isMember: false,
      myRole: null,
      createdAt: DateTime(2024, 5),
    ),
  ];

  static final List<CompanyPageItem> _fallbackCompanies = [
    CompanyPageItem(
      id: 'comp-1',
      name: 'Apex Electrical & Engineering Ltd',
      slug: 'apex-electrical-engineering',
      tagline: 'Leading Commercial & Industrial Electrical Contractors in West Africa',
      description: 'Apex Electrical delivers end-to-end electrical engineering, high-voltage substations, and green energy microgrids across industrial facilities and residential developments.',
      industry: 'Electrical Contracting & Engineering',
      companySize: '51-200 employees',
      website: 'https://apexelectrical.com',
      email: 'contact@apexelectrical.com',
      phone: '+233 30 223 4455',
      location: 'Airport Residential, Accra, Ghana',
      foundedYear: 2012,
      verificationStatus: 'APPROVED',
      followerCount: 3420,
      employeeCount: 68,
      isFollowed: true,
      createdAt: DateTime(2022, 6),
    ),
    CompanyPageItem(
      id: 'comp-2',
      name: 'HydraFlow Mechanical & Plumbing',
      slug: 'hydraflow-mechanical',
      tagline: 'Commercial Drainage, Water Treatment, and Fire Suppression Systems',
      description: 'Specializing in commercial plumbing infrastructure, water filtration plants, and certified fire protection sprinkler networks.',
      industry: 'Mechanical & Plumbing Services',
      companySize: '11-50 employees',
      website: 'https://hydraflow-mech.com',
      email: 'info@hydraflow.com',
      location: 'Industrial Area, Tema, Ghana',
      foundedYear: 2016,
      verificationStatus: 'APPROVED',
      followerCount: 1890,
      employeeCount: 32,
      isFollowed: false,
      createdAt: DateTime(2023, 2),
    ),
  ];

  static final List<JobAlertItem> _fallbackJobAlerts = [
    JobAlertItem(
      id: 'ja-1',
      title: 'Senior Solar Inverter Electrician (Daily)',
      query: 'Solar inverter installation',
      tradeCategory: 'Electrical',
      city: 'Accra',
      minRate: 150.0,
      frequency: 'DAILY',
      isActive: true,
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    JobAlertItem(
      id: 'ja-2',
      title: 'Commercial HVAC Technician (Weekly)',
      query: 'Chiller maintenance',
      tradeCategory: 'HVAC',
      city: 'Tema',
      minRate: 200.0,
      frequency: 'WEEKLY',
      isActive: true,
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
    ),
  ];
}
