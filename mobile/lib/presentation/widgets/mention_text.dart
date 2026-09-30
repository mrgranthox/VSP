import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_colors.dart';

class MentionText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final Function(String mention)? onMentionTap;
  final Function(String hashtag)? onHashtagTap;

  const MentionText({
    super.key,
    required this.text,
    this.style,
    this.onMentionTap,
    this.onHashtagTap,
  });

  @override
  Widget build(BuildContext context) {
    final defaultStyle = style ??
        const TextStyle(
          fontSize: 14,
          height: 1.4,
          color: AppColors.darkText,
        );

    final pattern = RegExp(r'(@[a-zA-Z0-9_\-]+)|(#[a-zA-Z0-9_\-]+)');
    final matches = pattern.allMatches(text);

    if (matches.isEmpty) {
      return Text(text, style: defaultStyle);
    }

    final spans = <InlineSpan>[];
    int lastIndex = 0;

    for (final match in matches) {
      if (match.start > lastIndex) {
        spans.add(
          TextSpan(
            text: text.substring(lastIndex, match.start),
            style: defaultStyle,
          ),
        );
      }

      final matchedString = match.group(0)!;
      final isMention = matchedString.startsWith('@');

      spans.add(
        TextSpan(
          text: matchedString,
          style: defaultStyle.copyWith(
            color: AppColors.brand,
            fontWeight: FontWeight.w700,
          ),
          recognizer: TapGestureRecognizer()
            ..onTap = () {
              if (isMention) {
                final handle = matchedString.substring(1);
                if (onMentionTap != null) {
                  onMentionTap!(handle);
                }
              } else {
                final tag = matchedString.substring(1);
                if (onHashtagTap != null) {
                  onHashtagTap!(tag);
                } else {
                  context.push('/hashtags/$tag');
                }
              }
            },
        ),
      );

      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      spans.add(
        TextSpan(
          text: text.substring(lastIndex),
          style: defaultStyle,
        ),
      );
    }

    return Text.rich(TextSpan(children: spans));
  }
}
