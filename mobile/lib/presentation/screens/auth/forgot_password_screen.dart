import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _codeSent = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSendCode() async {
    if (_emailController.text.trim().isEmpty) return;

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() {
      _isLoading = false;
      _codeSent = true;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Verification code sent to your email/phone'),
        ),
      );
    }
  }

  Future<void> _handleReset() async {
    if (_otpController.text.length < 4 || _newPasswordController.text.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter valid code and password')),
      );
      return;
    }

    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    setState(() => _isLoading = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.success,
          content: Text('Password updated successfully! Please sign in.'),
        ),
      );
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                !_codeSent ? 'Reset Password' : 'Enter Verification Code',
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppColors.darkText,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                !_codeSent
                    ? 'Enter your registered email address or phone number to receive a 6-digit recovery code.'
                    : 'We sent a verification code to ${_emailController.text}. Enter it below with your new password.',
                style: const TextStyle(fontSize: 13, color: AppColors.midText),
              ),
              const SizedBox(height: 28),

              if (!_codeSent) ...[
                VspTextField(
                  controller: _emailController,
                  label: 'Email or Phone',
                  hintText: 'name@example.com',
                  prefixIcon: Icons.email_outlined,
                ),
                const SizedBox(height: 24),
                VspButton(
                  text: 'Send Reset Code',
                  width: double.infinity,
                  isLoading: _isLoading,
                  onPressed: _handleSendCode,
                ),
              ] else ...[
                VspTextField(
                  controller: _otpController,
                  label: '6-Digit Code',
                  hintText: '123456',
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.pin_outlined,
                ),
                const SizedBox(height: 16),
                VspTextField(
                  controller: _newPasswordController,
                  label: 'New Password',
                  hintText: 'At least 8 characters',
                  isPassword: true,
                  prefixIcon: Icons.lock_outline,
                ),
                const SizedBox(height: 24),
                VspButton(
                  text: 'Submit New Password',
                  width: double.infinity,
                  isLoading: _isLoading,
                  onPressed: _handleReset,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
