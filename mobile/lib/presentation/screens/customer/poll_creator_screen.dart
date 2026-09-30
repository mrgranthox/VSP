import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/poll_model.dart';

class PollCreatorScreen extends StatefulWidget {
  const PollCreatorScreen({super.key});

  @override
  State<PollCreatorScreen> createState() => _PollCreatorScreenState();
}

class _PollCreatorScreenState extends State<PollCreatorScreen> {
  final TextEditingController _questionCtrl = TextEditingController();
  final List<TextEditingController> _optionCtrls = [
    TextEditingController(),
    TextEditingController(),
  ];

  String _durationDays = '7'; // 1, 3, 7, 14 days

  @override
  void dispose() {
    _questionCtrl.dispose();
    for (final c in _optionCtrls) {
      c.dispose();
    }
    super.dispose();
  }

  void _addOption() {
    if (_optionCtrls.length < 4) {
      setState(() {
        _optionCtrls.add(TextEditingController());
      });
    }
  }

  void _removeOption(int index) {
    if (_optionCtrls.length > 2) {
      setState(() {
        final removed = _optionCtrls.removeAt(index);
        removed.dispose();
      });
    }
  }

  void _submitPoll() {
    final question = _questionCtrl.text.trim();
    if (question.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a question for your trade poll.')),
      );
      return;
    }

    final validOptions = _optionCtrls
        .map((c) => c.text.trim())
        .where((text) => text.isNotEmpty)
        .toList();

    if (validOptions.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide at least 2 options for your poll.')),
      );
      return;
    }

    final days = int.tryParse(_durationDays) ?? 7;
    final endsAt = DateTime.now().add(Duration(days: days));

    final poll = Poll(
      id: 'poll-${DateTime.now().millisecondsSinceEpoch}',
      postId: '',
      question: question,
      options: List.generate(
        validOptions.length,
        (i) => PollOption(
          id: 'opt-${i + 1}',
          label: validOptions[i],
          voteCount: 0,
          percentage: 0.0,
        ),
      ),
      totalVotes: 0,
      endsAt: endsAt,
      isClosed: false,
    );

    Navigator.of(context).pop(poll);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create a Poll', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _submitPoll,
              child: const Text(
                'Done',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.brand),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question field
            const Text(
              'Your Question',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.darkText),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _questionCtrl,
              maxLength: 140,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'e.g. Which circuit breaker brand do you trust most for commercial panels?',
                hintStyle: const TextStyle(fontSize: 14, color: AppColors.midText),
                filled: true,
                fillColor: const Color(0xFFF9FAFB),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radius),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Options header
            const Text(
              'Options',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.darkText),
            ),
            const SizedBox(height: 8),

            // Options List
            ...List.generate(_optionCtrls.length, (index) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _optionCtrls[index],
                        maxLength: 35,
                        decoration: InputDecoration(
                          counterText: '',
                          hintText: 'Option ${index + 1}${index < 2 ? ' (Required)' : ''}',
                          hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
                          filled: true,
                          fillColor: const Color(0xFFF9FAFB),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radius),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radius),
                            borderSide: const BorderSide(color: AppColors.border),
                          ),
                        ),
                      ),
                    ),
                    if (index >= 2) ...[
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                        onPressed: () => _removeOption(index),
                      ),
                    ],
                  ],
                ),
              );
            }),

            // Add option button
            if (_optionCtrls.length < 4) ...[
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.brand),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                onPressed: _addOption,
                icon: const Icon(Icons.add, size: 18, color: AppColors.brand),
                label: const Text('+ Add Option (max 4)',
                    style: TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 24),
            ],

            const Divider(height: 32),

            // Poll Duration
            const Text(
              'Poll Duration',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.darkText),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                _buildDurationChip('1 Day', '1'),
                _buildDurationChip('3 Days', '3'),
                _buildDurationChip('1 Week', '7'),
                _buildDurationChip('2 Weeks', '14'),
              ],
            ),
            const SizedBox(height: 24),

            // Notice
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 18, color: AppColors.midText),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'We do not allow changes to the question or options once your poll is published.',
                      style: TextStyle(fontSize: 12, color: AppColors.midText),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDurationChip(String label, String value) {
    final isSelected = _durationDays == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.brand,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.darkText,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        fontSize: 13,
      ),
      backgroundColor: const Color(0xFFF3F4F6),
      onSelected: (_) => setState(() => _durationDays = value),
    );
  }
}
