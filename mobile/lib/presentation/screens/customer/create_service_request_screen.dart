import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../providers/home_provider.dart';
import '../../providers/service_request_provider.dart';
import '../../widgets/vsp_button.dart';
import '../../widgets/vsp_text_field.dart';

class CreateServiceRequestScreen extends StatefulWidget {
  final String? categoryId;

  const CreateServiceRequestScreen({super.key, this.categoryId});

  @override
  State<CreateServiceRequestScreen> createState() =>
      _CreateServiceRequestScreenState();
}

class _CreateServiceRequestScreenState
    extends State<CreateServiceRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController =
      TextEditingController(text: 'East Legon, Accra');
  final _budgetController = TextEditingController(text: '200');

  late String _selectedTradeId;
  String _urgency = 'MEDIUM';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedTradeId = (widget.categoryId != null && widget.categoryId!.isNotEmpty)
        ? widget.categoryId!
        : 'elec';
  }

  final List<Map<String, String>> _urgencyOptions = [
    {'key': 'LOW', 'label': 'Flexible'},
    {'key': 'MEDIUM', 'label': 'Standard (2-3 days)'},
    {'key': 'HIGH', 'label': 'Urgent (24h)'},
    {'key': 'EMERGENCY', 'label': 'Emergency Now'},
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _locationController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final reqProvider = context.read<ServiceRequestProvider>();
    final budgetVal = int.tryParse(_budgetController.text.trim()) ?? 200;

    final success = await reqProvider.createRequest(
      tradeCategoryId: _selectedTradeId,
      title: _titleController.text.trim(),
      description: _descController.text.trim(),
      urgency: _urgency,
      locationAddress: _locationController.text.trim(),
      budgetMinor: budgetVal * 100,
    );

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.success,
            content: Text(
                'Service request submitted! Nearby trades are being notified.'),
          ),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.danger,
            content: Text('Failed to submit request. Please try again.'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final home = context.watch<HomeProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Post Service Request'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Select Trade Category',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 42,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: home.tradeCategories.length,
                    itemBuilder: (context, index) {
                      final cat = home.tradeCategories[index];
                      final isSelected = _selectedTradeId == cat.id;

                      return Container(
                        margin: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${cat.icon} ${cat.name}'),
                          selected: isSelected,
                          selectedColor: AppColors.brand,
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected ? Colors.white : AppColors.darkText,
                          ),
                          onSelected: (val) {
                            if (val) {
                              setState(() {
                                _selectedTradeId = cat.id;
                              });
                            }
                          },
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 18),

                VspTextField(
                  controller: _titleController,
                  label: 'Project Title',
                  hintText: 'e.g. Electrical main breaker tripping constantly',
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Please enter a title' : null,
                ),
                const SizedBox(height: 14),

                VspTextField(
                  controller: _descController,
                  label: 'Detailed Description',
                  hintText:
                      'Explain what is happening, appliance types, and any specific materials needed...',
                  maxLines: 4,
                  validator: (v) => v == null || v.trim().length < 10
                      ? 'Please provide at least 10 characters'
                      : null,
                ),
                const SizedBox(height: 18),

                const Text(
                  'Urgency Level',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 8),
                Column(
                  children: _urgencyOptions.map((opt) {
                    final isSelected = _urgency == opt['key'];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _urgency = opt['key']!;
                          });
                        },
                        borderRadius: BorderRadius.circular(AppTheme.radius),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.brandLight
                                : AppColors.screenBg,
                            borderRadius: BorderRadius.circular(AppTheme.radius),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.brand
                                  : AppColors.border,
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(
                                opt['label']!,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? AppColors.brandDark
                                      : AppColors.darkText,
                                ),
                              ),
                              const Spacer(),
                              if (isSelected)
                                const Icon(Icons.check_circle_rounded,
                                    size: 18, color: AppColors.brand),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),

                VspTextField(
                  controller: _locationController,
                  label: 'Job Location Address',
                  hintText: 'City, neighborhood, street name...',
                  prefixIcon: Icons.location_on_outlined,
                  validator: (v) => v == null || v.trim().isEmpty
                      ? 'Please specify location'
                      : null,
                ),
                const SizedBox(height: 14),

                VspTextField(
                  controller: _budgetController,
                  label: 'Estimated Budget (GHS)',
                  hintText: '150',
                  keyboardType: TextInputType.number,
                  prefixIcon: Icons.payments_outlined,
                ),
                const SizedBox(height: 24),

                VspButton(
                  text: 'Submit Service Request',
                  width: double.infinity,
                  isLoading: _isSubmitting,
                  onPressed: _handleSubmit,
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
