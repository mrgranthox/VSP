import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class CreateArticleScreen extends StatefulWidget {
  const CreateArticleScreen({super.key});

  @override
  State<CreateArticleScreen> createState() => _CreateArticleScreenState();
}

class _CreateArticleScreenState extends State<CreateArticleScreen> {
  final _titleCtrl = TextEditingController();
  final _subtitleCtrl = TextEditingController();
  final _coverImageCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _subtitleCtrl.dispose();
    _coverImageCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _handlePublish() async {
    final title = _titleCtrl.text.trim();
    final content = _contentCtrl.text.trim();

    if (title.isEmpty || content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please provide both a title and article body.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final provider = context.read<LinkedInProvider>();
    final success = await provider.publishArticle(
      title: title,
      content: content,
      subtitle: _subtitleCtrl.text.trim().isNotEmpty ? _subtitleCtrl.text.trim() : null,
      coverImageUrl: _coverImageCtrl.text.trim().isNotEmpty ? _coverImageCtrl.text.trim() : null,
    );

    setState(() => _isSubmitting = false);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your article has been published successfully!')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Publish Article', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _isSubmitting ? null : _handlePublish,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Publish',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.brand),
                    ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          VspTextField(
            label: 'Article Headline',
            hintText: 'e.g., Installing Three-Phase Power: 2026 Safety Protocols',
            controller: _titleCtrl,
          ),
          const SizedBox(height: 16),
          VspTextField(
            label: 'Subtitle / Key Takeaway',
            hintText: 'Brief summary for feed readers...',
            controller: _subtitleCtrl,
          ),
          const SizedBox(height: 16),
          VspTextField(
            label: 'Cover Image URL (Optional)',
            hintText: 'https://images.unsplash.com/...',
            controller: _coverImageCtrl,
          ),
          const SizedBox(height: 16),
          const Text(
            'Article Content',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: _contentCtrl,
            maxLines: 15,
            decoration: InputDecoration(
              hintText: 'Write your trade guidance, step-by-step tutorial, diagnostic breakdown, or case study...',
              hintStyle: const TextStyle(fontSize: 14, color: AppColors.midText),
              filled: true,
              fillColor: const Color(0xFFF9FAFB),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
            ),
          ),
          const SizedBox(height: 24),
          VspButton(
            text: 'Publish to Vocational Network',
            isLoading: _isSubmitting,
            onPressed: _handlePublish,
          ),
        ],
      ),
    );
  }
}
