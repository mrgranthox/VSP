class ServiceRequest {
  final String id;
  final String customerUserId;
  final String tradeCategoryId;
  final String? tradeName;
  final String title;
  final String description;
  final String urgency; // 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
  final String status;  // 'DRAFT' | 'SUBMITTED' | 'MATCHED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  final String locationAddress;
  final double? lat;
  final double? lng;
  final int? budgetMinor;
  final List<String> mediaUrls;
  final DateTime createdAt;
  final List<ServiceRequestAssignment> assignments;

  ServiceRequest({
    required this.id,
    required this.customerUserId,
    required this.tradeCategoryId,
    this.tradeName,
    required this.title,
    required this.description,
    this.urgency = 'MEDIUM',
    this.status = 'SUBMITTED',
    required this.locationAddress,
    this.lat,
    this.lng,
    this.budgetMinor,
    this.mediaUrls = const [],
    required this.createdAt,
    this.assignments = const [],
  });

  double? get budget => budgetMinor != null ? budgetMinor! / 100.0 : null;
  String get budgetFormatted =>
      budgetMinor != null ? 'GH₵ ${(budgetMinor! / 100).toStringAsFixed(0)}' : 'Flexible';
  String get formattedDate =>
      '${createdAt.day}/${createdAt.month}/${createdAt.year}';

  factory ServiceRequest.fromJson(Map<String, dynamic> json) {
    return ServiceRequest(
      id: json['id'] as String? ?? '',
      customerUserId: json['customerUserId'] as String? ?? '',
      tradeCategoryId: json['tradeCategoryId'] as String? ?? '',
      tradeName: json['tradeCategory']?['name'] as String? ?? json['tradeName'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      urgency: json['urgency'] as String? ?? 'MEDIUM',
      status: json['status'] as String? ?? 'SUBMITTED',
      locationAddress: json['locationAddress'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      budgetMinor: json['budgetMinor'] as int?,
      mediaUrls: (json['mediaUrls'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      assignments: (json['assignments'] as List<dynamic>?)
              ?.map((e) => ServiceRequestAssignment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class ServiceRequestAssignment {
  final String id;
  final String serviceRequestId;
  final String workerProfileId;
  final String? workerName;
  final String status; // 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  final int? quotedPriceMinor;
  final String? workerNote;
  final DateTime? createdAt;

  ServiceRequestAssignment({
    required this.id,
    required this.serviceRequestId,
    required this.workerProfileId,
    this.workerName,
    required this.status,
    this.quotedPriceMinor,
    this.workerNote,
    this.createdAt,
  });

  double? get quotedPrice => quotedPriceMinor != null ? quotedPriceMinor! / 100.0 : null;

  factory ServiceRequestAssignment.fromJson(Map<String, dynamic> json) {
    return ServiceRequestAssignment(
      id: json['id'] as String? ?? '',
      serviceRequestId: json['serviceRequestId'] as String? ?? '',
      workerProfileId: json['workerProfileId'] as String? ?? '',
      workerName: json['workerProfile']?['userProfile']?['fullName'] as String? ??
          json['workerProfile']?['headline'] as String?,
      status: json['status'] as String? ?? 'PENDING',
      quotedPriceMinor: json['quotedPriceMinor'] as int?,
      workerNote: json['workerNote'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }
}
