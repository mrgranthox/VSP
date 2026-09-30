import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// A pure-Flutter shimmering container that coordinates a smooth sweep gradient
/// across all descendant skeleton elements.
class ShimmerLoading extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Color? baseColor;
  final Color? highlightColor;

  const ShimmerLoading({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 1500),
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<ShimmerLoading> createState() => _ShimmerLoadingState();
}

class _ShimmerLoadingState extends State<ShimmerLoading>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = widget.baseColor ??
        (isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0));
    final highlight = widget.highlightColor ??
        (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9));

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) {
            final double progress = _controller.value;

            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                base,
                highlight,
                base,
              ],
              stops: const [0.1, 0.5, 0.9],
              transform: _SlidingGradientTransform(
                slidePercent: progress,
              ),
            ).createShader(bounds);
          },
          child: child,
        );
      },
      child: widget.child,
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double slidePercent;

  const _SlidingGradientTransform({required this.slidePercent});

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(
      bounds.width * (slidePercent * 2.0 - 1.0),
      0.0,
      0.0,
    );
  }
}

/// Simple rounded rectangle placeholder for skeleton states.
class SkeletonBox extends StatelessWidget {
  final double? width;
  final double? height;
  final double borderRadius;
  final Color? color;

  const SkeletonBox({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8.0,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color ?? (isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0)),
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// Skeleton representation of [WorkerCard] during loading states.
class WorkerCardSkeleton extends StatelessWidget {
  const WorkerCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Colors.white,
        borderRadius: BorderRadius.circular(AppTheme.radiusLg),
        border: Border.all(
          color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar placeholder
              const SkeletonBox(
                width: 52,
                height: 52,
                borderRadius: 26,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SkeletonBox(width: 140, height: 16, borderRadius: 4),
                    const SizedBox(height: 6),
                    const SkeletonBox(width: 90, height: 12, borderRadius: 4),
                    const SizedBox(height: 6),
                    Row(
                      children: const [
                        SkeletonBox(width: 48, height: 12, borderRadius: 4),
                        SizedBox(width: 8),
                        SkeletonBox(width: 60, height: 12, borderRadius: 4),
                      ],
                    ),
                  ],
                ),
              ),
              const SkeletonBox(width: 50, height: 20, borderRadius: 10),
            ],
          ),
          const SizedBox(height: 12),
          const SkeletonBox(width: double.infinity, height: 12, borderRadius: 4),
          const SizedBox(height: 6),
          const SkeletonBox(width: 200, height: 12, borderRadius: 4),
          const SizedBox(height: 12),
          Row(
            children: const [
              Expanded(child: SkeletonBox(height: 36, borderRadius: AppTheme.radius)),
              SizedBox(width: 8),
              Expanded(child: SkeletonBox(height: 36, borderRadius: AppTheme.radius)),
            ],
          ),
        ],
      ),
    );
  }
}
