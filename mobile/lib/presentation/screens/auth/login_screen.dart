import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPhoneMode = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final auth = context.read<AuthProvider>();
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    final success = await auth.login(
      email: !_isPhoneMode ? identifier : null,
      phone: _isPhoneMode ? identifier : null,
      password: password,
    );

    if (success && mounted) {
      if (auth.userMode == 'worker') {
        context.go('/worker/dashboard');
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
          onPressed: () => context.go('/onboarding'),
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
                Center(
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.screenBg,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.handyman_rounded,
                        size: 32,
                        color: AppColors.brand,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Center(
                  child: Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: AppColors.darkText,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(
                    auth.userMode == 'worker'
                        ? 'Sign in to access your worker dashboard & job leads'
                        : 'Sign in to hire verified vocational tradespeople',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.midText,
                    ),
                  ),
                ),
                const SizedBox(height: 28),

                // Email / Phone Mode Toggle Tab
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.screenBg,
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _isPhoneMode = false;
                              _identifierController.clear();
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: !_isPhoneMode ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              boxShadow: !_isPhoneMode
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 4,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                'Email Address',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: !_isPhoneMode ? AppColors.brand : AppColors.midText,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _isPhoneMode = true;
                              _identifierController.clear();
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: _isPhoneMode ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                              boxShadow: _isPhoneMode
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 4,
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                'Phone Number',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: _isPhoneMode ? AppColors.brand : AppColors.midText,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Identifier input
                VspTextField(
                  controller: _identifierController,
                  label: _isPhoneMode ? 'Phone Number' : 'Email Address',
                  hintText: _isPhoneMode ? '+233 24 123 4567' : 'name@example.com',
                  keyboardType: _isPhoneMode ? TextInputType.phone : TextInputType.emailAddress,
                  prefixIcon: _isPhoneMode ? Icons.phone_outlined : Icons.email_outlined,
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Please enter your ${_isPhoneMode ? 'phone number' : 'email'}';
                    }
                    if (!_isPhoneMode && !val.contains('@')) {
                      return 'Please enter a valid email address';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Password input
                VspTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hintText: 'Enter your account password',
                  isPassword: true,
                  prefixIcon: Icons.lock_outline,
                  validator: (val) {
                    if (val == null || val.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),

                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => context.push('/forgot-password'),
                    child: const Text(
                      'Forgot password?',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.brand,
                      ),
                    ),
                  ),
                ),

                if (auth.errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppColors.dangerLight,
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, size: 20, color: AppColors.dangerDark),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            auth.errorMessage!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.dangerDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),
                VspButton(
                  text: 'Sign In',
                  width: double.infinity,
                  isLoading: auth.status == AuthStatus.loading,
                  onPressed: _handleLogin,
                ),
                const SizedBox(height: 16),

                // Demo Quick Fill Helper for seamless evaluation
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 8,
                  children: [
                    TextButton(
                      onPressed: () {
                        _isPhoneMode = false;
                        _identifierController.text = 'alice@example.com';
                        _passwordController.text = 'Change-This-Password-123!';
                        setState(() {});
                      },
                      child: const Text(
                        'Customer (Alice)',
                        style: TextStyle(fontSize: 12, color: AppColors.brand, fontWeight: FontWeight.w600),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        _isPhoneMode = false;
                        _identifierController.text = 'bob@example.com';
                        _passwordController.text = 'Change-This-Password-123!';
                        setState(() {});
                      },
                      child: const Text(
                        'Worker (Bob)',
                        style: TextStyle(fontSize: 12, color: AppColors.accent, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Don't have an account? ",
                      style: TextStyle(fontSize: 14, color: AppColors.midText),
                    ),
                    InkWell(
                      onTap: () => context.push('/register'),
                      child: const Text(
                        'Register',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.brand,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
