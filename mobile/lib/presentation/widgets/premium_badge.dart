import 'package:flutter/material.dart';

class PremiumBadge extends StatelessWidget {
  final Widget child;
  final bool isPremium;
  final bool showBadgeLabel;

  const PremiumBadge({
    super.key,
    required this.child,
    this.isPremium = true,
    this.showBadgeLabel = false,
  });

  @override
  Widget build(BuildContext context) {
    if (!isPremium) return child;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: const Color(0xFFF59E0B),
              width: 2.2,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                blurRadius: 6,
                spreadRadius: 1,
              ),
            ],
          ),
          child: child,
        ),
        if (showBadgeLabel)
          Positioned(
            bottom: -4,
            right: -4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: Colors.white, width: 1),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.workspace_premium, size: 10, color: Colors.white),
                  SizedBox(width: 2),
                  Text(
                    'PRO',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 8,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.4,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
