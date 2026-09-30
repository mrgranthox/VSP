import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../widgets/avatar_badge.dart';

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key});

  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  String _search = '';

  final List<Map<String, dynamic>> _invitations = [
    {
      'id': 'inv-1',
      'name': 'Francis Darko',
      'trade': 'Master Carpenter & Millwork Specialist',
      'mutualCount': 14,
    },
    {
      'id': 'inv-2',
      'name': 'Abena Osei',
      'trade': 'Project Engineer at Turner Construction',
      'mutualCount': 9,
    },
  ];

  final List<Map<String, dynamic>> _connections = [
    {
      'id': 'conn-1',
      'name': 'Kwabena Yeboah',
      'headline': 'Licensed Electrician • Solar & High Voltage',
      'connectedSince': 'Connected 2 months ago',
    },
    {
      'id': 'conn-2',
      'name': 'Rita Ansah',
      'headline': 'Lead HVAC Technician • Cold Chain Systems',
      'connectedSince': 'Connected 4 months ago',
    },
    {
      'id': 'conn-3',
      'name': 'Daniel K. Mensah',
      'headline': 'Managing Director, Apex Properties',
      'connectedSince': 'Connected 6 months ago',
    },
    {
      'id': 'conn-4',
      'name': 'George Tetteh',
      'headline': 'Plumbing Inspector & Master Contractor',
      'connectedSince': 'Connected 8 months ago',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _connections.where((c) {
      if (_search.isEmpty) return true;
      final q = _search.toLowerCase();
      return (c['name'] as String).toLowerCase().contains(q) ||
          (c['headline'] as String).toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        title: const Text('My Vocational Network', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.darkText,
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Pending Invitations
          if (_invitations.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Invitations (${_invitations.length})',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.darkText),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('Manage all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            ..._invitations.map((inv) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  elevation: 0.5,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        AvatarBadge(name: inv['name'] as String, radius: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(inv['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text(inv['trade'] as String, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                              Text('${inv['mutualCount']} mutual trade connections', style: const TextStyle(fontSize: 11, color: AppColors.lightText)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: AppColors.midText),
                          onPressed: () {
                            setState(() => _invitations.removeWhere((i) => i['id'] == inv['id']));
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.check_circle_outline, color: AppColors.brand, size: 28),
                          onPressed: () {
                            setState(() {
                              _connections.insert(0, {
                                'id': inv['id'],
                                'name': inv['name'],
                                'headline': inv['trade'],
                                'connectedSince': 'Just now',
                              });
                              _invitations.removeWhere((i) => i['id'] == inv['id']);
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Connected with ${inv['name']}!')),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                )),
            const SizedBox(height: 16),
          ],

          // Search Field
          TextField(
            decoration: InputDecoration(
              hintText: 'Search connections by trade, skill, or name...',
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.midText),
              prefixIcon: const Icon(Icons.search, color: AppColors.midText, size: 20),
              contentPadding: const EdgeInsets.symmetric(vertical: 10),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
          const SizedBox(height: 16),

          Text(
            '${filtered.length} Connections',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.darkText),
          ),
          const SizedBox(height: 10),

          ...filtered.map((conn) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                elevation: 0.5,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      AvatarBadge(name: conn['name'] as String, radius: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(conn['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text(conn['headline'] as String, style: const TextStyle(fontSize: 12, color: AppColors.midText)),
                            Text(conn['connectedSince'] as String, style: const TextStyle(fontSize: 11, color: AppColors.lightText)),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.brandLight,
                          foregroundColor: AppColors.brandDark,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        ),
                        onPressed: () => context.push('/inbox'),
                        child: const Text('Message', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
