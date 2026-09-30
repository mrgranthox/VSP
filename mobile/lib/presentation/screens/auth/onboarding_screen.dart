import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/vsp_button.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, dynamic>> _slides = [
    {
      'icon': Icons.search_rounded,
      'title': 'Find skilled trades near you',
      'desc':
          'Instant access to vetted electricians, plumbers, carpenters, and technicians with real ratings and transparent pricing.',
    },
    {
      'icon': Icons.verified_user_rounded,
      'title': 'Book with total confidence',
      'desc':
          'Track job progress in real time, communicate securely over live chat, and review verified work milestones.',
    },
    {
      'icon': Icons.handyman_rounded,
      'title': 'Are you a skilled tradesperson?',
      'desc':
          'Grow your client base, receive localized job leads, and build your digital reputation on Ghana’s premier vocational network.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_currentPage < 2)
            TextButton(
              onPressed: () {
                _pageController.animateToPage(
                  2,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeInOut,
                );
              },
              child: const Text(
                'Skip',
                style: TextStyle(
                  color: AppColors.midText,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (idx) {
                  setState(() {
                    _currentPage = idx;
                  });
                },
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            color: AppColors.screenBg,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.brandLight, width: 2),
                          ),
                          child: Center(
                            child: Icon(
                              slide['icon'] as IconData,
                              size: 52,
                              color: AppColors.brand,
                            ),
                          ),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide['title'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: AppColors.darkText,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          slide['desc'] as String,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.midText,
                            height: 1.6,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == i ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == i ? AppColors.brand : AppColors.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: _currentPage == 2
                  ? Column(
                      children: [
                        VspButton(
                          text: 'I Need Workers (Customer)',
                          width: double.infinity,
                          onPressed: () {
                            context.read<AuthProvider>().setUserMode('customer');
                            context.go('/login');
                          },
                        ),
                        const SizedBox(height: 10),
                        VspButton(
                          text: 'I Am a Tradesperson (Worker)',
                          width: double.infinity,
                          variant: VspButtonVariant.outline,
                          onPressed: () {
                            context.read<AuthProvider>().setUserMode('worker');
                            context.go('/login');
                          },
                        ),
                      ],
                    )
                  : VspButton(
                      text: 'Next',
                      width: double.infinity,
                      onPressed: () {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeInOut,
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
