import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

class PostTypeOption {
  final String id;
  final String label;
  final IconData icon;

  const PostTypeOption({
    required this.id,
    required this.label,
    required this.icon,
  });
}

const List<PostTypeOption> kPostTypeOptions = [
  PostTypeOption(id: 'UPDATE', label: 'Trade Update', icon: Icons.edit_note_rounded),
  PostTypeOption(id: 'PHOTO', label: 'Project Photo', icon: Icons.photo_library_outlined),
  PostTypeOption(id: 'ARTICLE', label: 'Technical Guide', icon: Icons.article_outlined),
  PostTypeOption(id: 'POLL', label: 'Trade Poll', icon: Icons.poll_outlined),
  PostTypeOption(id: 'EVENT', label: 'Host Workshop', icon: Icons.event_available_outlined),
  PostTypeOption(id: 'CELEBRATION', label: 'Celebrate Milestone', icon: Icons.celebration_outlined),
];

class PostTypeSelector extends StatelessWidget {
  final String selectedType;
  final ValueChanged<String> onSelected;

  const PostTypeSelector({
    super.key,
    required this.selectedType,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: kPostTypeOptions.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final opt = kPostTypeOptions[index];
          final isSelected = opt.id == selectedType;

          return InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              onSelected(opt.id);
            },
            borderRadius: BorderRadius.circular(AppTheme.radiusFull),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.brand : AppColors.screenBg,
                borderRadius: BorderRadius.circular(AppTheme.radiusFull),
                border: Border.all(
                  color: isSelected ? AppColors.brandDark : AppColors.border,
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    opt.icon,
                    size: 16,
                    color: isSelected ? Colors.white : AppColors.midText,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    opt.label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      color: isSelected ? Colors.white : AppColors.darkText,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
