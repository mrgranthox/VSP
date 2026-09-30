import 'package:flutter_test/flutter_test.dart';
import 'package:vsp_mobile/data/models/user_model.dart';
import 'package:vsp_mobile/data/models/worker_profile_model.dart';
import 'package:vsp_mobile/data/models/trade_category_model.dart';
import 'package:vsp_mobile/data/models/service_request_model.dart';
import 'package:vsp_mobile/data/models/booking_model.dart';
import 'package:vsp_mobile/data/models/notification_model.dart';
import 'package:vsp_mobile/data/models/chat_model.dart';

void main() {
  group('VSP Data Models Serialization & Deserialization', () {
    test('User model parses and copyWith works correctly', () {
      final json = {
        'id': 'usr-123',
        'email': 'kofi@example.com',
        'phone': '+233201112233',
        'status': 'ACTIVE',
        'emailVerified': true,
        'phoneVerified': true,
        'roles': ['CUSTOMER', 'WORKER'],
        'profile': {
          'firstName': 'Kofi',
          'lastName': 'Mensah',
          'displayName': 'Kofi Mensah',
          'avatarUrl': 'https://example.com/avatar.jpg',
          'bio': 'Master Electrician',
        },
      };

      final user = User.fromJson(json);
      expect(user.id, 'usr-123');
      expect(user.email, 'kofi@example.com');
      expect(user.isWorker, isTrue);
      expect(user.profile?.fullName, 'Kofi Mensah');

      final updated = user.copyWith(email: 'kofi.new@example.com');
      expect(updated.email, 'kofi.new@example.com');
      expect(updated.id, 'usr-123');
    });

    test('TradeCategory and WorkerProfile models parse correctly', () {
      final catJson = {
        'id': 'cat-1',
        'name': 'Electrical Works',
        'slug': 'electrical-works',
        'icon': 'bolt',
        'description': 'Certified residential and industrial wiring',
        'workerCount': 42,
      };

      final category = TradeCategory.fromJson(catJson);
      expect(category.id, 'cat-1');
      expect(category.name, 'Electrical Works');
      expect(category.workerCount, 42);

      final workerJson = {
        'id': 'wkr-1',
        'userId': 'usr-1',
        'headline': 'Master Electrician & Solar Installer',
        'bio': 'Over 10 years experience in Accra & Kumasi',
        'experienceYears': 10,
        'hourlyRateMinor': 15000,
        'avgRating': 4.9,
        'totalReviews': 38,
        'jobsCompleted': 120,
        'isVerified': true,
        'user': {
          'id': 'usr-1',
          'status': 'ACTIVE',
          'emailVerified': true,
          'phoneVerified': true,
          'roles': ['WORKER'],
          'profile': {
            'firstName': 'Kwame',
            'lastName': 'Mensah',
            'displayName': 'Kwame Mensah',
          }
        },
      };

      final worker = WorkerProfile.fromJson(workerJson);
      expect(worker.id, 'wkr-1');
      expect(worker.displayName, 'Kwame Mensah');
      expect(worker.avgRating, 4.9);
      expect(worker.isVerified, isTrue);
      expect(worker.hourlyRate, 150.0);
    });

    test('ServiceRequest and Booking models parse correctly', () {
      final reqJson = {
        'id': 'req-1',
        'customerUserId': 'usr-123',
        'tradeCategoryId': 'cat-1',
        'title': 'Fix circuit breaker trip',
        'description': 'Main tripping every time AC turns on.',
        'status': 'MATCHED',
        'urgency': 'HIGH',
        'locationAddress': 'East Legon, Accra',
        'budgetMinor': 25000,
        'createdAt': '2026-09-30T00:00:00.000Z',
      };

      final req = ServiceRequest.fromJson(reqJson);
      expect(req.id, 'req-1');
      expect(req.status, 'MATCHED');
      expect(req.urgency, 'HIGH');
      expect(req.budgetFormatted, 'GH₵ 250');

      final bookingJson = {
        'id': 'bkg-1',
        'customerUserId': 'usr-cust',
        'workerProfileId': 'wkr-1',
        'customerName': 'Kwame Client',
        'workerName': 'Ama Addae',
        'tradeName': 'Plumbing Specialist',
        'status': 'CONFIRMED',
        'scheduledStartTime': '2026-10-01T10:00:00.000Z',
        'locationAddress': 'Cantonments, Accra',
        'totalAmountMinor': 30000,
        'createdAt': '2026-09-30T00:00:00.000Z',
      };

      final booking = Booking.fromJson(bookingJson);
      expect(booking.id, 'bkg-1');
      expect(booking.status, 'CONFIRMED');
      expect(booking.workerName, 'Ama Addae');
      expect(booking.priceFormatted, 'GH₵ 300');
    });

    test('VspNotification parses and supports copyWith', () {
      final notifJson = {
        'id': 'ntf-1',
        'notificationType': 'BOOKING_CONFIRMED',
        'channel': 'IN_APP',
        'isRead': false,
        'createdAt': '2026-09-30T00:00:00.000Z',
        'payloadJson': {
          'title': 'Booking Confirmed!',
          'body': 'Your appointment with Kwame is confirmed.',
        },
      };

      final notif = VspNotification.fromJson(notifJson);
      expect(notif.id, 'ntf-1');
      expect(notif.title, 'Booking Confirmed!');
      expect(notif.isRead, isFalse);

      final readNotif = notif.copyWith(isRead: true);
      expect(readNotif.isRead, isTrue);
      expect(readNotif.title, 'Booking Confirmed!');
    });

    test('ChatMessage parses correctly and distinguishes sender', () {
      final msgJson = {
        'id': 'msg-1',
        'conversationId': 'cnv-1',
        'senderId': 'usr-current',
        'senderName': 'You',
        'content': 'Hello, I will arrive in 15 minutes.',
        'status': 'DELIVERED',
        'createdAt': '2026-09-30T01:00:00.000Z',
      };

      final msg = ChatMessage.fromJson(msgJson, 'usr-current');
      expect(msg.id, 'msg-1');
      expect(msg.isMine, isTrue);
      expect(msg.content, 'Hello, I will arrive in 15 minutes.');
    });
  });
}
