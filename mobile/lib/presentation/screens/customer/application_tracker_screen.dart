import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class ApplicationItem {
  final String id;
  final String jobId;
  final String jobTitle;
  final String companyName;
  final String location;
  final String salary;
  final DateTime appliedAt;
  final String status; // 'APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFER', 'REJECTED'
  final String? interviewDate;
  final String? notes;

  ApplicationItem({
    required this.id,
    required this.jobId,
    required this.jobTitle,
    required this.companyName,
    required this.location,
    required this.salary,
    required this.appliedAt,
    required this.status,
    this.interviewDate,
    this.notes,
  });

  ApplicationItem copyWith({
    String? status,
    String? notes,
  }) {
    return ApplicationItem(
      id: id,
      jobId: jobId,
      jobTitle: jobTitle,
      companyName: companyName,
      location: location,
      salary: salary,
      appliedAt: appliedAt,
      status: status ?? this.status,
      interviewDate: interviewDate,
      notes: notes ?? this.notes,
    );
  }
}

class ApplicationTrackerScreen extends StatefulWidget {
  const ApplicationTrackerScreen({super.key});

  @override
  State<ApplicationTrackerScreen> createState() => _ApplicationTrackerScreenState();
}

class _ApplicationTrackerScreenState extends State<ApplicationTrackerScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchCtrl = TextEditingController();
  String _searchQuery = '';

  late List<ApplicationItem> _applications;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _applications = [
      ApplicationItem(
        id: 'app-1',
        jobId: 'job-101',
        jobTitle: 'Commercial Journeyman Electrician',
        companyName: 'Apex Power & Automation',
        location: 'Austin, TX • On-site',
        salary: '\$42 - \$50 / hr',
        appliedAt: DateTime.now().subtract(const Duration(days: 2)),
        status: 'INTERVIEW',
        interviewDate: 'Tomorrow at 10:00 AM (Video Call)',
        notes: 'Technical screening with Lead Master Electrician',
      ),
      ApplicationItem(
        id: 'app-2',
        jobId: 'job-102',
        jobTitle: 'HVAC Lead Service Technician',
        companyName: 'ClimatePro Mechanical Solutions',
        location: 'Dallas, TX • Field Service',
        salary: '\$85,000 - \$105,000 / yr',
        appliedAt: DateTime.now().subtract(const Duration(days: 5)),
        status: 'REVIEWING',
        notes: 'Application viewed by hiring manager 2 days ago',
      ),
      ApplicationItem(
        id: 'app-3',
        jobId: 'job-103',
        jobTitle: 'Senior Pipefitter / Welder (6G Certified)',
        companyName: 'Trident Industrial Piping',
        location: 'Houston, TX • Industrial Plant',
        salary: '\$48 / hr + \$120 Per Diem',
        appliedAt: DateTime.now().subtract(const Duration(days: 8)),
        status: 'OFFER',
        notes: 'Formal offer received. Review compensation package.',
      ),
      ApplicationItem(
        id: 'app-4',
        jobId: 'job-104',
        jobTitle: 'Solar PV Site Foreman',
        companyName: 'SunForge Energy Systems',
        location: 'San Antonio, TX • Hybrid',
        salary: '\$75,000 - \$90,000 / yr',
        appliedAt: DateTime.now().subtract(const Duration(days: 12)),
        status: 'APPLIED',
        notes: 'Submitted via 1-Tap Easy Apply with OSHA 30 & NABCEP',
      ),
      ApplicationItem(
        id: 'app-5',
        jobId: 'job-105',
        jobTitle: 'CNC Mill & Lathe Machinist',
        companyName: 'Precision Aero Components',
        location: 'Fort Worth, TX • Machine Shop',
        salary: '\$36 - \$44 / hr',
        appliedAt: DateTime.now().subtract(const Duration(days: 20)),
        status: 'REJECTED',
        notes: 'Position closed - filled by internal promotion',
      ),
    ];
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'OFFER':
        return AppColors.success;
      case 'INTERVIEW':
        return AppColors.brand;
      case 'REVIEWING':
        return const Color(0xFFF59E0B);
      case 'APPLIED':
        return const Color(0xFF6366F1);
      case 'REJECTED':
      default:
        return AppColors.midText;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'OFFER':
        return 'Offer Received';
      case 'INTERVIEW':
        return 'Interview Scheduled';
      case 'REVIEWING':
        return 'Under Review';
      case 'APPLIED':
        return 'Submitted';
      case 'REJECTED':
        return 'Archived';
      default:
        return status;
    }
  }

  List<ApplicationItem> _filterByTab(int tabIndex) {
    var list = _applications;
    if (_searchQuery.isNotEmpty) {
      list = list.where((a) =>
          a.jobTitle.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          a.companyName.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }
    switch (tabIndex) {
      case 1:
        return list.where((a) => a.status == 'APPLIED' || a.status == 'REVIEWING').toList();
      case 2:
        return list.where((a) => a.status == 'INTERVIEW').toList();
      case 3:
        return list.where((a) => a.status == 'OFFER').toList();
      case 4:
        return list.where((a) => a.status == 'REJECTED').toList();
      case 0:
      default:
        return list;
    }
  }

  void _withdrawApplication(ApplicationItem app) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Withdraw Application?'),
        content: Text(
          'Are you sure you want to withdraw your application for "${app.jobTitle}" at ${app.companyName}? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Keep Application'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _applications.removeWhere((a) => a.id == app.id);
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Withdrew application for ${app.jobTitle}'),
                  action: SnackBarAction(
                    label: 'Undo',
                    onPressed: () {
                      setState(() {
                        _applications.add(app);
                      });
                    },
                  ),
                ),
              );
            },
            child: const Text('Withdraw', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('Job Application Tracker',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(104),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: SizedBox(
                  height: 40,
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _searchQuery = v),
                    decoration: InputDecoration(
                      hintText: 'Search applications by role or contractor...',
                      hintStyle: const TextStyle(fontSize: 13),
                      prefixIcon: const Icon(Icons.search, size: 18),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchCtrl.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                      fillColor: const Color(0xFFF9FAFB),
                      filled: true,
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
              ),
              TabBar(
                controller: _tabController,
                isScrollable: true,
                labelColor: AppColors.brand,
                unselectedLabelColor: AppColors.midText,
                indicatorColor: AppColors.brand,
                labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: [
                  Tab(text: 'All (${_applications.length})'),
                  Tab(text: 'Active (${_applications.where((a) => a.status == 'APPLIED' || a.status == 'REVIEWING').length})'),
                  Tab(text: 'Interview (${_applications.where((a) => a.status == 'INTERVIEW').length})'),
                  Tab(text: 'Offer (${_applications.where((a) => a.status == 'OFFER').length})'),
                  Tab(text: 'Archived (${_applications.where((a) => a.status == 'REJECTED').length})'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: List.generate(5, (index) => _buildApplicationList(index)),
      ),
    );
  }

  Widget _buildApplicationList(int tabIndex) {
    final list = _filterByTab(tabIndex);

    if (list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.assignment_outlined, size: 54, color: AppColors.midText),
              const SizedBox(height: 14),
              const Text(
                'No applications found',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              const Text(
                'Browse trade openings and apply with 1-Tap Easy Apply.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.midText, fontSize: 13),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brand,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius)),
                ),
                onPressed: () => context.push('/customer/jobs'),
                icon: const Icon(Icons.work_outline, size: 18),
                label: const Text('Browse Trade Jobs'),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      itemCount: list.length,
      itemBuilder: (context, idx) {
        final app = list[idx];
        final statusColor = _getStatusColor(app.status);
        final statusLabel = _getStatusLabel(app.status);
        final dateStr = DateFormat('MMM d, yyyy').format(app.appliedAt);

        return Card(
          margin: const EdgeInsets.only(bottom: 14),
          elevation: 0.5,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppTheme.radius),
            side: const BorderSide(color: AppColors.border),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.brandLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Center(
                        child: Icon(Icons.business_center_rounded, color: AppColors.brand, size: 24),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            app.jobTitle,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            app.companyName,
                            style: const TextStyle(color: AppColors.darkText, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            app.location,
                            style: const TextStyle(color: AppColors.midText, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9FAFB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.payments_outlined, size: 16, color: AppColors.midText),
                      const SizedBox(width: 6),
                      Text(app.salary, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const Spacer(),
                      const Icon(Icons.schedule, size: 14, color: AppColors.midText),
                      const SizedBox(width: 4),
                      Text('Applied $dateStr', style: const TextStyle(fontSize: 11, color: AppColors.midText)),
                    ],
                  ),
                ),
                if (app.interviewDate != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.brandLight.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.brand.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.videocam_outlined, size: 18, color: AppColors.brand),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            app.interviewDate!,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brand),
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push('/call/interview-${app.id}'),
                          child: const Text('Join Room', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                        ),
                      ],
                    ),
                  ),
                ],
                if (app.notes != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    app.notes!,
                    style: const TextStyle(fontSize: 12, color: AppColors.midText, fontStyle: FontStyle.italic),
                  ),
                ],
                const SizedBox(height: 12),
                const Divider(height: 1),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (app.status != 'REJECTED')
                      TextButton(
                        onPressed: () => _withdrawApplication(app),
                        child: const Text('Withdraw', style: TextStyle(color: AppColors.error, fontSize: 12)),
                      ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      ),
                      onPressed: () => context.push('/customer/jobs'),
                      child: const Text('View Job Post', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
