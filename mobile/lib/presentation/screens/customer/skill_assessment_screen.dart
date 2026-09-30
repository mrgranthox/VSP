import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class QuizQuestion {
  final String question;
  final List<String> options;
  final int correctIndex;
  final String explanation;

  QuizQuestion({
    required this.question,
    required this.options,
    required this.correctIndex,
    required this.explanation,
  });
}

class SkillAssessmentScreen extends StatefulWidget {
  final String skillId;

  const SkillAssessmentScreen({super.key, required this.skillId});

  @override
  State<SkillAssessmentScreen> createState() => _SkillAssessmentScreenState();
}

class _SkillAssessmentScreenState extends State<SkillAssessmentScreen> {
  int _currentIndex = 0;
  final Map<int, int> _selectedAnswers = {};
  bool _isSubmitted = false;
  int _secondsRemaining = 600; // 10 minutes total
  Timer? _timer;

  late String _skillTitle;
  late List<QuizQuestion> _questions;

  @override
  void initState() {
    super.initState();
    _skillTitle = 'National Electrical Code (NEC) & Industrial Safety';

    _questions = [
      QuizQuestion(
        question: 'Under NEC Article 210.19(A), what is the maximum recommended total voltage drop for combined branch circuit and feeder conductors?',
        options: [
          '3% maximum total drop',
          '5% maximum total drop',
          '8% maximum total drop',
          '10% maximum total drop',
        ],
        correctIndex: 1,
        explanation: 'NEC recommends that combined branch circuits and feeder conductors do not exceed 5% overall voltage drop for optimal equipment efficiency.',
      ),
      QuizQuestion(
        question: 'Which OSHA standard specifies Lockout/Tagout (LOTO) requirements for controlling hazardous electrical energy during machinery servicing?',
        options: [
          '29 CFR 1910.120',
          '29 CFR 1910.147',
          '29 CFR 1926.405',
          '29 CFR 1910.333',
        ],
        correctIndex: 1,
        explanation: 'OSHA standard 29 CFR 1910.147 covers the control of hazardous energy (lockout/tagout).',
      ),
      QuizQuestion(
        question: 'When sizing equipment grounding conductors (EGC) for raceways, which NEC table must be consulted?',
        options: [
          'Table 250.66',
          'Table 250.122',
          'Table 310.16',
          'Table 300.5',
        ],
        correctIndex: 1,
        explanation: 'Table 250.122 provides minimum sizes for Equipment Grounding Conductors based on the overcurrent device rating.',
      ),
      QuizQuestion(
        question: 'What is the required minimum clear working space depth in front of 480V switchgear under Condition 2 (exposed live parts on one side and grounded parts on the other)?',
        options: [
          '3.0 feet (914 mm)',
          '3.5 feet (1.07 m)',
          '4.0 feet (1.22 m)',
          '5.0 feet (1.52 m)',
        ],
        correctIndex: 1,
        explanation: 'Per NEC Table 110.26(A)(1), for 151V - 600V nominal under Condition 2, the minimum working depth is 3.5 feet.',
      ),
      QuizQuestion(
        question: 'In Class I, Division 1 hazardous locations where flammable gases may be present under normal operating conditions, what enclosure rating is required for arcing devices?',
        options: [
          'NEMA 3R rainproof',
          'NEMA 4X corrosion-resistant',
          'NEMA 7 explosion-proof',
          'NEMA 12 industrial dust-tight',
        ],
        correctIndex: 2,
        explanation: 'NEMA 7 enclosures are specifically certified for Class I, Division 1 hazardous explosive gas atmospheres.',
      ),
    ];

    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        _timer?.cancel();
        _submitQuiz();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _selectAnswer(int optionIndex) {
    if (_isSubmitted) return;
    setState(() {
      _selectedAnswers[_currentIndex] = optionIndex;
    });
  }

  void _submitQuiz() {
    _timer?.cancel();
    setState(() {
      _isSubmitted = true;
    });
  }

  int _calculateScore() {
    int correct = 0;
    for (int i = 0; i < _questions.length; i++) {
      if (_selectedAnswers[i] == _questions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  @override
  Widget build(BuildContext context) {
    if (_isSubmitted) {
      return _buildResultView();
    }

    final currentQ = _questions[_currentIndex];
    final selectedOption = _selectedAnswers[_currentIndex];
    final progress = (_currentIndex + 1) / _questions.length;
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    final timerString = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(_skillTitle,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        actions: [
          Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                const Icon(Icons.timer_outlined, size: 16, color: AppColors.midText),
                const SizedBox(width: 4),
                Text(
                  timerString,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: _secondsRemaining < 60 ? AppColors.error : AppColors.brand,
                  ),
                ),
              ],
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: const Color(0xFFE5E7EB),
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.brand),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Question ${_currentIndex + 1} of ${_questions.length}',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.midText),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.brandLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text('100 Pts', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.brand)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              currentQ.question,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, height: 1.35),
            ),
            const SizedBox(height: 24),

            // Options
            Expanded(
              child: ListView.separated(
                itemCount: currentQ.options.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (context, idx) {
                  final isSelected = selectedOption == idx;
                  return InkWell(
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    onTap: () => _selectAnswer(idx),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.brandLight.withValues(alpha: 0.5) : const Color(0xFFF9FAFB),
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                        border: Border.all(
                          color: isSelected ? AppColors.brand : AppColors.border,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? AppColors.brand : Colors.white,
                              border: Border.all(
                                color: isSelected ? AppColors.brand : AppColors.border,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                String.fromCharCode(65 + idx), // A, B, C, D
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                  color: isSelected ? Colors.white : AppColors.darkText,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              currentQ.options[idx],
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? AppColors.brand : AppColors.darkText,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom Navigation
            Row(
              children: [
                if (_currentIndex > 0)
                  OutlinedButton(
                    onPressed: () => setState(() => _currentIndex--),
                    child: const Text('Previous'),
                  ),
                const Spacer(),
                if (_currentIndex < _questions.length - 1)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    onPressed: selectedOption == null ? null : () => setState(() => _currentIndex++),
                    child: const Text('Next Question', style: TextStyle(fontWeight: FontWeight.w700)),
                  )
                else
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                    ),
                    onPressed: selectedOption == null ? null : _submitQuiz,
                    child: const Text('Submit Assessment', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView() {
    final correctCount = _calculateScore();
    final percentage = ((correctCount / _questions.length) * 100).round();
    final passed = percentage >= 70;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Assessment Results', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: passed ? const Color(0xFFFEF3C7) : const Color(0xFFFEE2E2),
                border: Border.all(
                  color: passed ? const Color(0xFFF59E0B) : AppColors.error,
                  width: 3,
                ),
              ),
              child: Icon(
                passed ? Icons.verified : Icons.cancel_outlined,
                size: 60,
                color: passed ? const Color(0xFFD97706) : AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              passed ? 'Skill Verified!' : 'Needs Review',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            Text(
              passed
                  ? 'Congratulations! You scored $percentage% and placed in the top 15% of trade professionals for $_skillTitle.'
                  : 'You scored $percentage%. The minimum passing score for verification is 70%. You can retake this assessment in 30 days.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppColors.midText, height: 1.4),
            ),
            const SizedBox(height: 24),

            // Badge Card
            if (passed)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.workspace_premium, color: Color(0xFFD97706), size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('VSP Verified Skill Badge Unlocked',
                              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Color(0xFF92400E))),
                          SizedBox(height: 2),
                          Text('Added to your public profile and highlights in contractor search.',
                              style: TextStyle(fontSize: 11, color: Color(0xFFB45309))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 28),

            // Breakdown
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Question Review', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            const SizedBox(height: 12),
            ...List.generate(_questions.length, (idx) {
              final q = _questions[idx];
              final userAns = _selectedAnswers[idx];
              final isRight = userAns == q.correctIndex;

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                elevation: 0.5,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  side: BorderSide(color: isRight ? AppColors.success.withValues(alpha: 0.3) : AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            isRight ? Icons.check_circle : Icons.cancel,
                            size: 18,
                            color: isRight ? AppColors.success : AppColors.error,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Q${idx + 1}: ${q.question}',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Your answer: ${userAns != null ? q.options[userAns] : "No answer"}',
                        style: TextStyle(
                          fontSize: 12,
                          color: isRight ? AppColors.success : AppColors.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (!isRight) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Correct answer: ${q.options[q.correctIndex]}',
                          style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600),
                        ),
                      ],
                      const SizedBox(height: 6),
                      Text(
                        q.explanation,
                        style: const TextStyle(fontSize: 11, color: AppColors.midText, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.brand,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
              ),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Back to Profile Skills', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}
