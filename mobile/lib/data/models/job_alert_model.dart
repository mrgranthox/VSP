class JobAlertItem {
  final String id;
  final String title;
  final String? query;
  final String? tradeCategory;
  final String? city;
  final double? minRate;
  final double? maxRate;
  final String frequency; // DAILY, WEEKLY, INSTANT
  final bool isActive;
  final DateTime createdAt;

  JobAlertItem({
    required this.id,
    required this.title,
    this.query,
    this.tradeCategory,
    this.city,
    this.minRate,
    this.maxRate,
    this.frequency = 'DAILY',
    this.isActive = true,
    required this.createdAt,
  });

  factory JobAlertItem.fromJson(Map<String, dynamic> json) {
    return JobAlertItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Job Alert',
      query: json['query'] as String?,
      tradeCategory: json['tradeCategory'] as String?,
      city: json['city'] as String?,
      minRate: json['minRate'] != null
          ? (json['minRate'] as num).toDouble()
          : null,
      maxRate: json['maxRate'] != null
          ? (json['maxRate'] as num).toDouble()
          : null,
      frequency: json['frequency'] as String? ?? 'DAILY',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  JobAlertItem copyWith({
    bool? isActive,
    String? frequency,
  }) {
    return JobAlertItem(
      id: id,
      title: title,
      query: query,
      tradeCategory: tradeCategory,
      city: city,
      minRate: minRate,
      maxRate: maxRate,
      frequency: frequency ?? this.frequency,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'query': query,
    'tradeCategory': tradeCategory,
    'city': city,
    'minRate': minRate,
    'maxRate': maxRate,
    'frequency': frequency,
    'isActive': isActive,
    'createdAt': createdAt.toIso8601String(),
  };
}
