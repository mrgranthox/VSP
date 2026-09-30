class PollOption {
  final String id;
  final String label;
  final int voteCount;
  final double percentage;

  const PollOption({
    required this.id,
    required this.label,
    this.voteCount = 0,
    this.percentage = 0.0,
  });

  factory PollOption.fromJson(Map<String, dynamic> json) {
    return PollOption(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? '',
      voteCount: json['voteCount'] as int? ?? json['_count']?['votes'] as int? ?? 0,
      percentage: (json['percentage'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'label': label,
    'voteCount': voteCount,
    'percentage': percentage,
  };

  PollOption copyWith({
    int? voteCount,
    double? percentage,
  }) {
    return PollOption(
      id: id,
      label: label,
      voteCount: voteCount ?? this.voteCount,
      percentage: percentage ?? this.percentage,
    );
  }
}

class Poll {
  final String id;
  final String postId;
  final String question;
  final List<PollOption> options;
  final int totalVotes;
  final String? myVotedOptionId;
  final DateTime? endsAt;
  final bool isClosed;

  const Poll({
    required this.id,
    required this.postId,
    required this.question,
    required this.options,
    this.totalVotes = 0,
    this.myVotedOptionId,
    this.endsAt,
    this.isClosed = false,
  });

  factory Poll.fromJson(Map<String, dynamic> json, {String? currentUserId}) {
    final rawOptions = (json['options'] as List<dynamic>?) ?? [];
    final votes = (json['votes'] as List<dynamic>?) ?? [];
    
    String? myVote;
    if (currentUserId != null) {
      final found = votes.firstWhere(
        (v) => v['userId'] == currentUserId,
        orElse: () => null,
      );
      if (found != null) {
        myVote = found['pollOptionId'] as String?;
      }
    }

    final parsedOptions = rawOptions
        .map((o) => PollOption.fromJson(o as Map<String, dynamic>))
        .toList();

    final int total = parsedOptions.fold(0, (sum, o) => sum + o.voteCount);

    final ends = json['endsAt'] != null
        ? DateTime.tryParse(json['endsAt'] as String)
        : null;

    final closed = json['isClosed'] as bool? ??
        (ends != null && ends.isBefore(DateTime.now()));

    return Poll(
      id: json['id'] as String? ?? '',
      postId: json['postId'] as String? ?? '',
      question: json['question'] as String? ?? '',
      options: parsedOptions.map((o) {
        final pct = total > 0 ? (o.voteCount / total * 100.0) : 0.0;
        return o.copyWith(percentage: pct);
      }).toList(),
      totalVotes: total,
      myVotedOptionId: myVote,
      endsAt: ends,
      isClosed: closed,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'postId': postId,
    'question': question,
    'options': options.map((o) => o.toJson()).toList(),
    'totalVotes': totalVotes,
    'myVotedOptionId': myVotedOptionId,
    'endsAt': endsAt?.toIso8601String(),
    'isClosed': isClosed,
  };

  Poll copyWith({
    List<PollOption>? options,
    int? totalVotes,
    String? myVotedOptionId,
    bool? isClosed,
  }) {
    return Poll(
      id: id,
      postId: postId,
      question: question,
      options: options ?? this.options,
      totalVotes: totalVotes ?? this.totalVotes,
      myVotedOptionId: myVotedOptionId ?? this.myVotedOptionId,
      endsAt: endsAt,
      isClosed: isClosed ?? this.isClosed,
    );
  }
}
