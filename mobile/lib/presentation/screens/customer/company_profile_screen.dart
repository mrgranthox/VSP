import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../providers/linkedin_provider.dart';
import '../../widgets/vsp_button.dart';

class CompanyProfileScreen extends StatefulWidget {
  final String slug;

  const CompanyProfileScreen({super.key, required this.slug});

  @override
  State<CompanyProfileScreen> createState() => _CompanyProfileScreenState();
}

class _CompanyProfileScreenState extends State<CompanyProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LinkedInProvider>().selectCompany(widget.slug);
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LinkedInProvider>();
    final company = provider.currentCompany;

    if (company == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Contractor Profile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: Text(company.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverToBoxAdapter(
            child: Container(
              color: Colors.white,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Banner cover
                  Container(
                    height: 120,
                    width: double.infinity,
                    color: AppColors.brandLight,
                    child: company.coverImageUrl != null
                        ? Image.network(company.coverImageUrl!, fit: BoxFit.cover)
                        : const Center(
                            child: Icon(Icons.business_rounded, size: 48, color: AppColors.brandDark),
                          ),
                  ),

                  // Profile Header Content
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Transform.translate(
                          offset: const Offset(0, -32),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: Colors.white, width: 3),
                                  boxShadow: const [
                                    BoxShadow(color: Colors.black12, blurRadius: 6),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(Icons.apartment_rounded, color: AppColors.brand, size: 36),
                                ),
                              ),
                              const Spacer(),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: company.isFollowed ? const Color(0xFFF3F4F6) : AppColors.brand,
                                  foregroundColor: company.isFollowed ? AppColors.darkText : Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                ),
                                onPressed: () => provider.toggleFollowCompany(company.id),
                                child: Text(
                                  company.isFollowed ? 'Following' : '+ Follow',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Transform.translate(
                          offset: const Offset(0, -20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    company.name,
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.darkText),
                                  ),
                                  if (company.verificationStatus == 'APPROVED') ...[
                                    const SizedBox(width: 6),
                                    const Icon(Icons.verified, color: AppColors.brand, size: 20),
                                  ],
                                ],
                              ),
                              if (company.tagline != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  company.tagline!,
                                  style: const TextStyle(fontSize: 14, color: AppColors.midText),
                                ),
                              ],
                              const SizedBox(height: 8),
                              Text(
                                '${company.industry} • ${company.location ?? 'West Africa'}',
                                style: const TextStyle(fontSize: 12, color: AppColors.lightText),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${company.followerCount} followers • ${company.employeeCount} staff members',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.brandDark),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Tabs
                  TabBar(
                    controller: _tabCtrl,
                    labelColor: AppColors.brand,
                    unselectedLabelColor: AppColors.midText,
                    indicatorColor: AppColors.brand,
                    tabs: const [
                      Tab(text: 'About'),
                      Tab(text: 'Open Jobs'),
                      Tab(text: 'Tradespeople'),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabCtrl,
          children: [
            // About Tab
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Company Overview',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.darkText),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        company.description ?? 'Leading vocational service contractor delivering excellence in tradecraft.',
                        style: const TextStyle(fontSize: 14, height: 1.5, color: Color(0xFF374151)),
                      ),
                      const Divider(height: 24),
                      if (company.website != null) ...[
                        Row(
                          children: [
                            const Icon(Icons.link, size: 18, color: AppColors.midText),
                            const SizedBox(width: 8),
                            Text(company.website!, style: const TextStyle(fontSize: 13, color: AppColors.brand)),
                          ],
                        ),
                        const SizedBox(height: 10),
                      ],
                      if (company.email != null) ...[
                        Row(
                          children: [
                            const Icon(Icons.email_outlined, size: 18, color: AppColors.midText),
                            const SizedBox(width: 8),
                            Text(company.email!, style: const TextStyle(fontSize: 13, color: AppColors.midText)),
                          ],
                        ),
                        const SizedBox(height: 10),
                      ],
                      if (company.phone != null) ...[
                        Row(
                          children: [
                            const Icon(Icons.phone_outlined, size: 18, color: AppColors.midText),
                            const SizedBox(width: 8),
                            Text(company.phone!, style: const TextStyle(fontSize: 13, color: AppColors.midText)),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),

            // Open Jobs Tab
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildJobOpeningCard(
                  title: 'Journeyman Industrial Electrician',
                  location: company.location ?? 'Accra, Ghana',
                  rate: '\$35 - \$45 / hour',
                  type: 'Full-Time Contract',
                ),
                _buildJobOpeningCard(
                  title: 'Solar PV Site Foreman',
                  location: company.location ?? 'Accra, Ghana',
                  rate: '\$50 - \$65 / hour',
                  type: 'Direct Hire',
                ),
              ],
            ),

            // Tradespeople Staff Tab
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildStaffCard('Kofi Mensah', 'Master Electrician • Head of Operations'),
                _buildStaffCard('Sarah Boateng', 'Safety Inspector & QA Lead'),
                _buildStaffCard('Kwame Asante', 'Senior Solar Installer'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobOpeningCard({
    required String title,
    required String location,
    required String rate,
    required String type,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.brandLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  type,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.brandDark),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(location, style: const TextStyle(fontSize: 13, color: AppColors.midText)),
          const SizedBox(height: 6),
          Text(rate, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.successDark)),
          const SizedBox(height: 12),
          VspButton(
            text: 'Easy Apply',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Profile and credentials submitted to hiring manager!')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStaffCard(String name, String role) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.brandLight,
            child: Text(name[0], style: const TextStyle(color: AppColors.brandDark, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text(role, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
