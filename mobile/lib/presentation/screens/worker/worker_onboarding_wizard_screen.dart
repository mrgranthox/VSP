import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/presentation/providers/worker_provider.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_button.dart';
import 'package:vsp_mobile/presentation/widgets/vsp_text_field.dart';

class WorkerOnboardingWizardScreen extends StatefulWidget {
  const WorkerOnboardingWizardScreen({super.key});

  @override
  State<WorkerOnboardingWizardScreen> createState() =>
      _WorkerOnboardingWizardScreenState();
}

class _WorkerOnboardingWizardScreenState
    extends State<WorkerOnboardingWizardScreen> {
  int _currentStep = 1;

  // Controllers for wizard fields
  final TextEditingController _headlineController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();
  final TextEditingController _experienceController =
      TextEditingController(text: '3');
  final TextEditingController _hourlyRateController =
      TextEditingController(text: '150');
  final TextEditingController _serviceNameController = TextEditingController();
  final TextEditingController _servicePriceController =
      TextEditingController(text: '200');
  final TextEditingController _idNumberController = TextEditingController();
  final TextEditingController _certNameController = TextEditingController();

  String _selectedCategory = 'Electrical Services';
  String _selectedCoverageRegion = 'Greater Accra (Accra, Tema, Kasoa)';
  String _availabilitySchedule = 'Mon - Sat (8:00 AM - 6:00 PM)';
  String _idType = 'Ghana Card / National ID';
  final List<String> _servicesList = ['Full Wiring Installation', 'Fault Diagnosis & Repair'];
  final List<String> _certificationsList = ['NVTI Electrical Grade 1', 'Energy Commission Wireman License'];

  @override
  void initState() {
    super.initState();
    final prov = context.read<WorkerProvider>();
    _headlineController.text =
        prov.onboardingData['headline'] as String? ?? 'Master Certified Electrician';
    _bioController.text = prov.onboardingData['bio'] as String? ??
        'Experienced electrician with 5+ years servicing residential, industrial, and commercial wiring.';
  }

  @override
  void dispose() {
    _headlineController.dispose();
    _bioController.dispose();
    _experienceController.dispose();
    _hourlyRateController.dispose();
    _serviceNameController.dispose();
    _servicePriceController.dispose();
    _idNumberController.dispose();
    _certNameController.dispose();
    super.dispose();
  }

  void _nextStep() {
    if (_currentStep < 9) {
      setState(() => _currentStep++);
    } else {
      _submitWizard();
    }
  }

  void _prevStep() {
    if (_currentStep > 1) {
      setState(() => _currentStep--);
    } else {
      context.pop();
    }
  }

  Future<void> _submitWizard() async {
    final prov = context.read<WorkerProvider>();
    prov.updateOnboardingField('headline', _headlineController.text.trim());
    prov.updateOnboardingField('bio', _bioController.text.trim());
    prov.updateOnboardingField(
        'experienceYears', int.tryParse(_experienceController.text.trim()) ?? 3);
    prov.updateOnboardingField(
        'hourlyRateMinor', (double.tryParse(_hourlyRateController.text.trim()) ?? 150) * 100);

    final success = await prov.submitWorkerOnboarding();
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Worker profile published successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        context.go('/worker/dashboard');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final workerProvider = context.watch<WorkerProvider>();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _prevStep,
        ),
        title: Text('Pro Setup: Step $_currentStep of 9'),
        actions: [
          TextButton(
            onPressed: () => context.go('/worker/dashboard'),
            child: const Text('Save & Exit', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Step Progress Bar
          LinearProgressIndicator(
            value: _currentStep / 9.0,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
            minHeight: 4,
          ),

          // Main Step Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _buildCurrentStepContent(),
            ),
          ),

          // Bottom Action Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  offset: const Offset(0, -2),
                  blurRadius: 6,
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  if (_currentStep > 1) ...[
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: _prevStep,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text('Back'),
                      ),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    flex: 2,
                    child: VspButton(
                      text: _currentStep == 9 ? 'Finish & Publish' : 'Continue',
                      isLoading: workerProvider.isLoading,
                      onPressed: _nextStep,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStepContent() {
    switch (_currentStep) {
      case 1:
        return _buildStep1Category();
      case 2:
        return _buildStep2HeadlineAndBio();
      case 3:
        return _buildStep3ExperienceAndRate();
      case 4:
        return _buildStep4ServicesOffered();
      case 5:
        return _buildStep5CoverageArea();
      case 6:
        return _buildStep6Schedule();
      case 7:
        return _buildStep7IdentityVerification();
      case 8:
        return _buildStep8Certifications();
      case 9:
        return _buildStep9PortfolioAndReview();
      default:
        return const SizedBox();
    }
  }

  // Step 1: Category & Trade
  Widget _buildStep1Category() {
    final categories = [
      'Electrical Services',
      'Plumbing & Pipefitting',
      'Carpentry & Woodwork',
      'Masonry & Construction',
      'Painting & Decorating',
      'AC & Refrigeration',
      'Welding & Fabrication',
      'Automotive Mechanics',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Select your primary trade',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Choose the main category that best represents your trade skills. Clients will discover you under this trade.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        ...categories.map((cat) {
          final isSelected = _selectedCategory == cat;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primarySurface : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? AppColors.primary : Colors.grey.shade300,
                width: isSelected ? 2 : 1,
              ),
            ),
            child: ListTile(
              title: Text(
                cat,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                ),
              ),
              trailing: isSelected
                  ? const Icon(Icons.check_circle_rounded,
                      color: AppColors.primary)
                  : null,
              onTap: () => setState(() => _selectedCategory = cat),
            ),
          );
        }),
      ],
    );
  }

  // Step 2: Headline & Bio
  Widget _buildStep2HeadlineAndBio() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Headline & Bio',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'A catchy headline helps you stand out in search results. Tell clients about your background and work ethic.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),
        VspTextField(
          controller: _headlineController,
          label: 'Professional Headline',
          hint: 'e.g. Master Licensed Electrician & Solar Installer',
        ),
        const SizedBox(height: 20),
        VspTextField(
          controller: _bioController,
          label: 'Detailed Bio',
          hint: 'Describe your expertise, standard practices, and why clients should choose you...',
          maxLines: 5,
        ),
      ],
    );
  }

  // Step 3: Experience & Hourly Rate
  Widget _buildStep3ExperienceAndRate() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Experience & Rates',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Set your baseline hourly rate in Ghana Cedis (GH₵). You can adjust specific quotes for each job later.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 24),
        VspTextField(
          controller: _experienceController,
          label: 'Years of Experience',
          hint: 'e.g. 5',
          keyboardType: TextInputType.number,
          prefixIcon: const Icon(Icons.history_edu_rounded),
        ),
        const SizedBox(height: 20),
        VspTextField(
          controller: _hourlyRateController,
          label: 'Baseline Hourly Rate (GH₵)',
          hint: 'e.g. 150',
          keyboardType: TextInputType.number,
          prefixIcon: const Icon(Icons.payments_outlined),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primarySurface,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Row(
            children: [
              Icon(Icons.info_outline, color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Average hourly rate for electricians in Greater Accra is GH₵ 120 - GH₵ 180.',
                  style: TextStyle(fontSize: 12, color: AppColors.primary),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Step 4: Specific Services Offered
  Widget _buildStep4ServicesOffered() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Services Catalog',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'List specific services and standard starting prices you offer so clients can book directly.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              flex: 2,
              child: VspTextField(
                controller: _serviceNameController,
                label: 'Service Name',
                hint: 'e.g. Generator Connection',
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 1,
              child: VspTextField(
                controller: _servicePriceController,
                label: 'Price (GH₵)',
                hint: '250',
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ElevatedButton.icon(
          onPressed: () {
            final name = _serviceNameController.text.trim();
            final price = _servicePriceController.text.trim();
            if (name.isNotEmpty) {
              setState(() {
                _servicesList.add('$name (GH₵ $price)');
                _serviceNameController.clear();
              });
            }
          },
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add Service'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primarySurface,
            foregroundColor: AppColors.primary,
            elevation: 0,
          ),
        ),
        const SizedBox(height: 20),
        const Text('Active Services:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        ..._servicesList.map(
          (s) => ListTile(
            dense: true,
            leading: const Icon(Icons.build_circle_outlined,
                color: AppColors.primary),
            title: Text(s, style: const TextStyle(fontSize: 14)),
            trailing: IconButton(
              icon: const Icon(Icons.close, size: 18, color: Colors.grey),
              onPressed: () => setState(() => _servicesList.remove(s)),
            ),
          ),
        ),
      ],
    );
  }

  // Step 5: Coverage Area
  Widget _buildStep5CoverageArea() {
    final regions = [
      'Greater Accra (Accra, Tema, Kasoa)',
      'Ashanti Region (Kumasi, Obuasi)',
      'Western Region (Takoradi, Sekondi)',
      'Central Region (Cape Coast, Winneba)',
      'Eastern Region (Koforidua)',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Service Coverage Area',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Select the regions where you can travel to clients without excessive logistics fees.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        RadioGroup<String>(
          groupValue: _selectedCoverageRegion,
          onChanged: (val) {
            if (val != null) setState(() => _selectedCoverageRegion = val);
          },
          child: Column(
            children: regions.map((reg) {
              return RadioListTile<String>(
                value: reg,
                title: Text(reg, style: const TextStyle(fontSize: 14)),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // Step 6: Availability Schedule
  Widget _buildStep6Schedule() {
    final schedules = [
      'Mon - Sat (8:00 AM - 6:00 PM)',
      'Mon - Fri (8:00 AM - 5:00 PM)',
      '24/7 Emergency Response',
      'Weekends Only (Sat & Sun)',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Working Hours & Availability',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'When are you typically open to accept job bookings?',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        RadioGroup<String>(
          groupValue: _availabilitySchedule,
          onChanged: (val) {
            if (val != null) setState(() => _availabilitySchedule = val);
          },
          child: Column(
            children: schedules.map((sched) {
              return RadioListTile<String>(
                value: sched,
                title: Text(sched, style: const TextStyle(fontSize: 14)),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  // Step 7: Identity Verification
  Widget _buildStep7IdentityVerification() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Identity Verification (KYC)',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'VSP requires national identity verification to build trust with customers and grant verified badge.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        DropdownButtonFormField<String>(
          initialValue: _idType,
          decoration: const InputDecoration(
            labelText: 'ID Document Type',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(
                value: 'Ghana Card / National ID',
                child: Text('Ghana Card / National ID')),
            DropdownMenuItem(
                value: 'Voter ID Card', child: Text('Voter ID Card')),
            DropdownMenuItem(
                value: 'Passport', child: Text('Passport')),
            DropdownMenuItem(
                value: 'Driver License', child: Text('Driver License')),
          ],
          onChanged: (v) {
            if (v != null) setState(() => _idType = v);
          },
        ),
        const SizedBox(height: 16),
        VspTextField(
          controller: _idNumberController,
          label: 'ID Card Number',
          hint: 'e.g. GHA-123456789-0',
        ),
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            border: Border.all(
                color: Colors.grey.shade400, style: BorderStyle.solid),
            borderRadius: BorderRadius.circular(12),
            color: Colors.grey.shade50,
          ),
          child: Column(
            children: [
              const Icon(Icons.cloud_upload_outlined,
                  size: 40, color: AppColors.primary),
              const SizedBox(height: 8),
              const Text(
                'Upload Photo of Document',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 4),
              const Text(
                'Clear front image showing your photo and name',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Document image captured and queued.')),
                  );
                },
                child: const Text('Select File'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Step 8: Trade Certifications
  Widget _buildStep8Certifications() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Trade Credentials',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Provide vocational training certificates, NVTI diplomas, or professional licenses.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: VspTextField(
                controller: _certNameController,
                label: 'Certificate / License Title',
                hint: 'e.g. NVTI Certificate 2',
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: () {
                final c = _certNameController.text.trim();
                if (c.isNotEmpty) {
                  setState(() {
                    _certificationsList.add(c);
                    _certNameController.clear();
                  });
                }
              },
              icon: const Icon(Icons.add),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Added Credentials:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        ..._certificationsList.map(
          (cert) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const Icon(Icons.verified_outlined,
                  color: AppColors.success),
              title: Text(cert, style: const TextStyle(fontSize: 14)),
              trailing: IconButton(
                icon: const Icon(Icons.delete_outline, size: 18),
                onPressed: () => setState(() => _certificationsList.remove(cert)),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Step 9: Portfolio & Final Review
  Widget _buildStep9PortfolioAndReview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Review & Publish Profile',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'Verify your summary before going live. Your profile will be immediately listed on VSP.',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),
        Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: AppColors.primarySurface,
                      child: Icon(Icons.engineering_rounded,
                          color: AppColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _headlineController.text.isEmpty
                                ? 'Licensed Trades Professional'
                                : _headlineController.text,
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(_selectedCategory,
                              style: const TextStyle(
                                  color: AppColors.primary, fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
                const Divider(height: 24),
                _buildReviewItem('Bio', _bioController.text),
                _buildReviewItem(
                    'Experience', '${_experienceController.text} Years'),
                _buildReviewItem('Hourly Rate',
                    'GH₵ ${_hourlyRateController.text}/hr'),
                _buildReviewItem('Coverage Area', _selectedCoverageRegion),
                _buildReviewItem('Hours', _availabilitySchedule),
                _buildReviewItem('Verification ID', '$_idType submitted'),
                _buildReviewItem(
                    'Certifications', '${_certificationsList.length} verified'),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value.isEmpty ? '—' : value,
                style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
