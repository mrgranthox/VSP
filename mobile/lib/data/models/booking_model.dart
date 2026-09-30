class Booking {
  final String id;
  final String? serviceRequestId;
  final String customerUserId;
  final String? customerName;
  final String workerProfileId;
  final String? workerName;
  final String? workerHeadline;
  final String? tradeName;
  final String status; // 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  final DateTime scheduledStartTime;
  final DateTime? scheduledEndTime;
  final int totalAmountMinor;
  final String currencyCode;
  final String locationAddress;
  final double? lat;
  final double? lng;
  final DateTime createdAt;

  Booking({
    required this.id,
    this.serviceRequestId,
    required this.customerUserId,
    this.customerName,
    required this.workerProfileId,
    this.workerName,
    this.workerHeadline,
    this.tradeName,
    required this.status,
    required this.scheduledStartTime,
    this.scheduledEndTime,
    required this.totalAmountMinor,
    this.currencyCode = 'GHS',
    required this.locationAddress,
    this.lat,
    this.lng,
    required this.createdAt,
  });

  double get totalAmount => totalAmountMinor / 100.0;
  String get serviceTitle => tradeName ?? 'Vocational Service';
  String get clientName => customerName ?? 'Client';
  String get priceFormatted =>
      totalAmountMinor > 0 ? 'GH₵ ${(totalAmountMinor / 100).toStringAsFixed(0)}' : 'Flexible';
  String get formattedDate =>
      '${scheduledStartTime.day}/${scheduledStartTime.month}/${scheduledStartTime.year}';

  bool get isPending => status == 'PENDING';
  bool get isConfirmed => status == 'CONFIRMED';
  bool get isInProgress => status == 'IN_PROGRESS';
  bool get isCompleted => status == 'COMPLETED';
  bool get isCancelled => status == 'CANCELLED';

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as String? ?? '',
      serviceRequestId: json['serviceRequestId'] as String?,
      customerUserId: json['customerUserId'] as String? ?? '',
      customerName: json['customer']?['profile']?['fullName'] as String? ??
          json['customerName'] as String?,
      workerProfileId: json['workerProfileId'] as String? ?? '',
      workerName: json['workerProfile']?['user']?['profile']?['fullName'] as String? ??
          json['workerName'] as String?,
      workerHeadline: json['workerProfile']?['headline'] as String?,
      tradeName: json['tradeName'] as String? ??
          (json['workerProfile']?['tradeCategories'] != null &&
                  (json['workerProfile']['tradeCategories'] as List).isNotEmpty
              ? json['workerProfile']['tradeCategories'][0]['name'] as String?
              : 'Tradesperson'),
      status: json['status'] as String? ?? 'PENDING',
      scheduledStartTime: json['scheduledStartTime'] != null
          ? DateTime.parse(json['scheduledStartTime'] as String)
          : DateTime.now().add(const Duration(days: 1)),
      scheduledEndTime: json['scheduledEndTime'] != null
          ? DateTime.parse(json['scheduledEndTime'] as String)
          : null,
      totalAmountMinor: json['totalAmountMinor'] as int? ?? 0,
      currencyCode: json['currencyCode'] as String? ?? 'GHS',
      locationAddress: json['locationAddress'] as String? ?? 'Client Location',
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }
}
