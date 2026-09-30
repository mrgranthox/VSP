import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/data/repositories/users_repository.dart';
import 'package:vsp_mobile/presentation/providers/auth_provider.dart';
import 'package:vsp_mobile/presentation/widgets/avatar_badge.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_button.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_text_field.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _displayNameController;
  late TextEditingController _bioController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().currentUser;
    _firstNameController =
        TextEditingController(text: user?.profile?.firstName ?? '');
    _lastNameController =
        TextEditingController(text: user?.profile?.lastName ?? '');
    _displayNameController =
        TextEditingController(text: user?.profile?.displayName ?? '');
    _bioController = TextEditingController(text: user?.profile?.bio ?? '');
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _displayNameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final authProvider = context.read<AuthProvider>();
    final usersRepo = context.read<UsersRepository>();

    final success = await authProvider.updateUserProfile(
      usersRepo: usersRepo,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      displayName: _displayNameController.text.trim().isNotEmpty
          ? _displayNameController.text.trim()
          : null,
      bio: _bioController.text.trim().isNotEmpty
          ? _bioController.text.trim()
          : null,
    );

    setState(() => _isLoading = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update profile. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final fullName = user?.profile?.fullName ?? 'User Profile';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar Section with Edit Badge
              Center(
                child: Stack(
                  children: [
                    AvatarBadge(
                      name: fullName,
                      imageUrl: user?.profile?.avatarUrl,
                      radius: 46,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                user?.email ?? user?.phone ?? '',
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 28),

              // First & Last Name
              Row(
                children: [
                  Expanded(
                    child: VspTextField(
                      controller: _firstNameController,
                      label: 'First Name',
                      hint: 'e.g. Kwame',
                      validator: (val) => val == null || val.trim().isEmpty
                          ? 'Required'
                          : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: VspTextField(
                      controller: _lastNameController,
                      label: 'Last Name',
                      hint: 'e.g. Mensah',
                      validator: (val) => val == null || val.trim().isEmpty
                          ? 'Required'
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Display Name
              VspTextField(
                controller: _displayNameController,
                label: 'Display Name / Nickname (Optional)',
                hint: 'e.g. Kwame M.',
              ),
              const SizedBox(height: 16),

              // Bio
              VspTextField(
                controller: _bioController,
                label: 'Bio / Note',
                hint: 'Tell service providers about your location or preferences...',
                maxLines: 3,
              ),
              const SizedBox(height: 32),

              // Save Button
              VspButton(
                text: 'Save Changes',
                isLoading: _isLoading,
                onPressed: _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
