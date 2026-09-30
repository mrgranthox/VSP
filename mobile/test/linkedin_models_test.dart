import 'package:flutter_test/flutter_test.dart';
import 'package:vsp_mobile/data/models/profile_sections_model.dart';
import 'package:vsp_mobile/data/models/skill_model.dart';
import 'package:vsp_mobile/data/models/recommendation_model.dart';
import 'package:vsp_mobile/data/models/article_model.dart';
import 'package:vsp_mobile/data/models/event_model.dart';
import 'package:vsp_mobile/data/models/group_model.dart';
import 'package:vsp_mobile/data/models/company_model.dart';
import 'package:vsp_mobile/data/models/job_alert_model.dart';

void main() {
  group('LinkedIn Parity Models Serialization & Deserialization', () {
    test('ProfileExperience and ProfileEducation parse correctly', () {
      final expJson = {
        'id': 'exp-1',
        'title': 'Lead Solar Technician',
        'company': 'Accra Solar Systems',
        'location': 'Accra, Greater Accra',
        'startDate': '2021-03-01T00:00:00.000Z',
        'endDate': null,
        'isCurrent': true,
        'description': 'Designing and commissioning 50kW+ rooftop solar arrays.',
      };
      final exp = ProfileExperience.fromJson(expJson);
      expect(exp.id, 'exp-1');
      expect(exp.title, 'Lead Solar Technician');
      expect(exp.company, 'Accra Solar Systems');
      expect(exp.isCurrent, isTrue);

      final eduJson = {
        'id': 'edu-1',
        'school': 'Accra Technical University',
        'degree': 'HND',
        'fieldOfStudy': 'Electrical Engineering',
        'startDate': '2016-09-01T00:00:00.000Z',
        'endDate': '2019-06-30T00:00:00.000Z',
      };
      final edu = ProfileEducation.fromJson(eduJson);
      expect(edu.id, 'edu-1');
      expect(edu.school, 'Accra Technical University');
      expect(edu.degree, 'HND');

      final featJson = {
        'id': 'feat-1',
        'type': 'DOCUMENT',
        'title': 'Industrial 3-Phase Commissioning Blueprint',
        'description': 'Standard operating procedures for distribution switchboards.',
      };
      final feat = ProfileFeaturedItem.fromJson(featJson);
      expect(feat.id, 'feat-1');
      expect(feat.type, 'DOCUMENT');
      expect(feat.title, contains('Commissioning Blueprint'));
    });

    test('SkillTaxonomyItem and UserSkillItem parse correctly with endorsements', () {
      final taxonomyJson = {
        'id': 'sk-1',
        'name': 'Solar PV Installation',
        'category': 'ELECTRICAL',
        'isVerified': true,
        '_count': {'userSkills': 24},
      };
      final taxonomy = SkillTaxonomyItem.fromJson(taxonomyJson);
      expect(taxonomy.id, 'sk-1');
      expect(taxonomy.name, 'Solar PV Installation');
      expect(taxonomy.category, 'ELECTRICAL');
      expect(taxonomy.count, 24);

      final userSkillJson = {
        'id': 'usk-1',
        'skillId': 'sk-1',
        'name': 'Solar PV Installation',
        'category': 'ELECTRICAL',
        'yearsOfExperience': 6,
        'endorsements': [
          {'endorserUserId': 'usr-kwame'},
          {'endorserUserId': 'usr-ama'},
        ],
        '_count': {'endorsements': 14},
      };
      final userSkill = UserSkillItem.fromJson(userSkillJson, currentUserId: 'usr-kofi');
      expect(userSkill.id, 'usk-1');
      expect(userSkill.endorsementsCount, 14);
      expect(userSkill.isEndorsedByMe, isFalse);
      expect(userSkill.yearsOfExperience, 6);

      final endorsed = userSkill.copyWith(
        endorsementsCount: userSkill.endorsementsCount + 1,
        isEndorsedByMe: true,
      );
      expect(endorsed.endorsementsCount, 15);
      expect(endorsed.isEndorsedByMe, isTrue);
    });

    test('RecommendationItem parses and displays status', () {
      final recJson = {
        'id': 'rec-1',
        'authorUserId': 'usr-kwame',
        'recipientUserId': 'usr-kofi',
        'relationship': 'COLLEAGUE',
        'text': 'Outstanding electrical contractor. Always adheres to safety standards.',
        'status': 'ACCEPTED',
        'createdAt': '2026-09-29T10:00:00.000Z',
        'authorUser': {
          'email': 'kwame@apex.com',
          'profile': {'displayName': 'Kwame Mensah'},
          'workerProfile': {'headline': 'Lead Contractor @ Apex Builds'},
        },
      };
      final rec = RecommendationItem.fromJson(recJson);
      expect(rec.id, 'rec-1');
      expect(rec.authorName, 'Kwame Mensah');
      expect(rec.authorHeadline, 'Lead Contractor @ Apex Builds');
      expect(rec.relationship, 'COLLEAGUE');
      expect(rec.text, contains('adheres to safety standards'));
      expect(rec.status, 'ACCEPTED');
    });

    test('ArticleItem and ArticleCommentItem parse with reactions', () {
      final articleJson = {
        'id': 'art-1',
        'slug': 'guide-to-ghana-earthing-regulations',
        'title': 'The Definitive Guide to Domestic Earthing & Grounding in Ghana',
        'subtitle': 'Step-by-step compliance with Energy Commission standards.',
        'content': 'Comprehensive breakdown of soil resistivity tests, TT earthing systems...',
        'authorUserId': 'usr-1',
        'authorUser': {
          'profile': {'displayName': 'Kofi Mensah', 'avatarUrl': 'https://example.com/kofi.jpg'},
          'workerProfile': {'headline': 'Master Electrician'},
        },
        'coverImageUrl': 'https://images.unsplash.com/photo-grounding.jpg',
        'readingTimeMinutes': 5,
        'reactions': [],
        'reactionsCount': 42,
        'commentsCount': 7,
        'createdAt': '2026-09-28T09:00:00.000Z',
      };

      final article = ArticleItem.fromJson(articleJson);
      expect(article.id, 'art-1');
      expect(article.slug, 'guide-to-ghana-earthing-regulations');
      expect(article.title, contains('Domestic Earthing'));
      expect(article.readingTimeMinutes, 5);
      expect(article.reactionsCount, 0);

      final liked = article.copyWith(reactionsCount: 43, isReacted: true);
      expect(liked.reactionsCount, 43);
      expect(liked.isReacted, isTrue);

      final commentJson = {
        'id': 'cmt-1',
        'articleId': 'art-1',
        'authorUserId': 'usr-ama',
        'authorUser': {
          'profile': {'displayName': 'Ama Addae'},
        },
        'content': 'Great points regarding clay vs sandy soil earthing pits!',
        'createdAt': '2026-09-28T12:00:00.000Z',
      };
      final comment = ArticleCommentItem.fromJson(commentJson);
      expect(comment.id, 'cmt-1');
      expect(comment.authorName, 'Ama Addae');
      expect(comment.content, contains('Great points'));
    });

    test('EventItem parses and tracks RSVP', () {
      final eventJson = {
        'id': 'evt-1',
        'organizerUserId': 'usr-hvac',
        'title': 'Ghana HVAC & Cold Storage Expo 2026',
        'description': 'Annual gathering of commercial refrigeration and HVAC engineers.',
        'eventType': 'IN_PERSON',
        'location': 'Accra International Conference Centre (AICC)',
        'startAt': '2026-10-15T09:00:00.000Z',
        'endAt': '2026-10-15T17:00:00.000Z',
        'organizerUser': {
          'profile': {'displayName': 'Ghana Air Conditioning & Refrigeration Association'},
        },
        'coverImageUrl': 'https://images.unsplash.com/photo-hvac.jpg',
        'attendees': [],
        'createdAt': '2026-09-20T00:00:00.000Z',
      };

      final event = EventItem.fromJson(eventJson);
      expect(event.id, 'evt-1');
      expect(event.title, 'Ghana HVAC & Cold Storage Expo 2026');
      expect(event.eventType, 'IN_PERSON');
      expect(event.attendeeCount, 0);

      final rsvpd = event.copyWith(attendeeCount: 1, myRsvpStatus: 'GOING');
      expect(rsvpd.attendeeCount, 1);
      expect(rsvpd.myRsvpStatus, 'GOING');
    });

    test('GroupItem parses with member and privacy metadata', () {
      final groupJson = {
        'id': 'grp-1',
        'name': 'Greater Accra Professional Electricians',
        'slug': 'greater-accra-electricians',
        'description': 'Knowledge sharing, apprenticeship mentoring, and safety protocols.',
        'coverImageUrl': 'https://images.unsplash.com/photo-electricians.jpg',
        'memberCount': 382,
        'privacy': 'OPEN',
        'members': [],
        'createdAt': '2026-09-01T00:00:00.000Z',
      };

      final group = GroupItem.fromJson(groupJson);
      expect(group.id, 'grp-1');
      expect(group.name, 'Greater Accra Professional Electricians');
      expect(group.memberCount, 382);
      expect(group.isMember, isFalse);
      expect(group.privacy, 'OPEN');
    });

    test('CompanyPageItem and JobAlertItem parse correctly', () {
      final compJson = {
        'id': 'cmp-1',
        'name': 'Apex Mechanical & Electrical Services Ltd.',
        'slug': 'apex-mep-services',
        'industry': 'Commercial MEP Contracting',
        'logoUrl': 'https://example.com/logo.png',
        'coverImageUrl': 'https://example.com/banner.png',
        'tagline': 'Turnkey mechanical, electrical, and plumbing infrastructure.',
        'description': 'Founded in 2012, Apex M&E delivers engineering excellence across Ghana.',
        'website': 'https://apexme-gh.com',
        'location': 'Airport Residential Area, Accra',
        'companySize': '51-200',
        'employeeCount': 86,
        'verificationStatus': 'APPROVED',
        'followers': [],
        'createdAt': '2026-01-15T00:00:00.000Z',
      };

      final comp = CompanyPageItem.fromJson(compJson);
      expect(comp.id, 'cmp-1');
      expect(comp.name, 'Apex Mechanical & Electrical Services Ltd.');
      expect(comp.industry, 'Commercial MEP Contracting');
      expect(comp.verificationStatus, 'APPROVED');

      final alertJson = {
        'id': 'alt-1',
        'title': 'High Voltage Electrician in Accra',
        'query': 'high voltage, 33kv, substation',
        'city': 'Accra',
        'tradeCategory': 'ELECTRICAL',
        'frequency': 'DAILY',
        'isActive': true,
        'createdAt': '2026-09-25T08:00:00.000Z',
      };

      final alert = JobAlertItem.fromJson(alertJson);
      expect(alert.id, 'alt-1');
      expect(alert.title, 'High Voltage Electrician in Accra');
      expect(alert.frequency, 'DAILY');
      expect(alert.isActive, isTrue);
    });
  });
}
