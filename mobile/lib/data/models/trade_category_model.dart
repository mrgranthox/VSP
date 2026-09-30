class TradeCategory {
  final String id;
  final String name;
  final String slug;
  final String icon;
  final String? description;
  final int workerCount;

  TradeCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.icon,
    this.description,
    this.workerCount = 0,
  });

  factory TradeCategory.fromJson(Map<String, dynamic> json) {
    return TradeCategory(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      icon: json['icon'] as String? ?? '',
      description: json['description'] as String?,
      workerCount: json['workerCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'icon': icon,
      'description': description,
      'workerCount': workerCount,
    };
  }
}

class CityConfig {
  final String id;
  final String name;
  final String slug;
  final double lat;
  final double lng;
  final double radiusKm;

  CityConfig({
    required this.id,
    required this.name,
    required this.slug,
    required this.lat,
    required this.lng,
    required this.radiusKm,
  });

  factory CityConfig.fromJson(Map<String, dynamic> json) {
    return CityConfig(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      lat: (json['lat'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0.0,
      radiusKm: (json['radiusKm'] as num?)?.toDouble() ?? 25.0,
    );
  }
}
