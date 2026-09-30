import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _agreedToTerms = true;
  double _passwordStrength = 0.0;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _calculatePasswordStrength(String val) {
    double score = 0;
    if (val.length >= 8) score += 0.25;
    if (val.contains(RegExp(r'[A-Z]'))) score += 0.25;
    if (val.contains(RegExp(r'[0-9]'))) score += 0.25;
    if (val.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) score += 0.25;

    setState(() {
      _passwordStrength = score;
    });
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please accept the Terms of Service to continue')),
      );
      return;
    }

    final auth = context.read<AuthProvider>();
    final success = await auth.register(
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      email: _emailController.text.trim().isNotEmpty ? _emailController.text.trim() : null,
      phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      password: _passwordController.text,
    );

    if (success && mounted) {
      if (auth.userMode == 'worker') {
        context.go('/worker/onboarding');
      } else {
        context.go('/customer/home');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Create an Account',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Join VSP to hire skilled professionals or offer your vocational trade services',
                  style: TextStyle(fontSize: 13, color: AppColors.midText),
                ),
                const SizedBox(height: 24),

                Row(
                  children: [
                    Expanded(
                      child: VspTextField(
                        controller: _firstNameController,
                        label: 'First Name',
                        hintText: 'Kofi',
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: VspTextField(
                        controller: _lastNameController,
                        label: 'Last Name',
                        hintText: 'Mensah',
                        validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                VspTextField(
                  controller: _emailController,
                  label: 'Email Address',
                  hintText: 'kofi.mensah@example.com',
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: Icons.email_outlined,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Please provide email';
                    if (!v.contains('@')) return 'Invalid email';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                VspTextField(
                  controller: _phoneController,
                  label: 'Phone Number',
                  hintText: '+233 24 123 4567',
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icons.phone_outlined,
                ),
                const SizedBox(height: 16),

                VspTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hintText: 'At least 8 characters',
                  isPassword: true,
                  prefixIcon: Icons.lock_outline,
                  onChanged: _calculatePasswordStrength,
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return 'Password must be at least 8 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 6),

                // Password strength indicator bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _passwordStrength,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _passwordStrength <= 0.25
                          ? AppColors.danger
                          : _passwordStrength <= 0.5
                              ? AppColors.warning
                              : AppColors.success,
                    ),
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 16),

                VspTextField(
                  controller: _confirmPasswordController,
                  label: 'Confirm Password',
                  hintText: 'Re-enter your password',
                  isPassword: true,
                  prefixIcon: Icons.lock_outline,
                  validator: (v) {
                    if (v != _passwordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Terms checkbox
                Row(
                  children: [
                    Checkbox(
                      value: _agreedToTerms,
                      activeColor: AppColors.brand,
                      onChanged: (val) {
                        setState(() {
                          _agreedToTerms = val ?? false;
                        });
                      },
                    ),
                    const Expanded(
                      child: Text(
                        'I agree to the VSP Terms of Service & Privacy Policy',
                        style: TextStyle(fontSize: 12, color: AppColors.dark3),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                VspButton(
                  text: 'Create Account',
                  width: double.infinity,
                  isLoading: auth.status == AuthStatus.loading,
                  onPressed: _handleRegister,
                ),
                const SizedBox(height: 20),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Already have an account? ',
                      style: TextStyle(fontSize: 14, color: AppColors.midText),
                    ),
                    InkWell(
                      onTap: () => context.pop(),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.brand,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
