import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:vsp_mobile/core/theme/app_colors.dart';
import 'package:vsp_mobile/presentation/providers/service_request_provider.dart';
import 'package:vsp_mobile/presentation/widgets/empty_state_view.dart';
import 'package:vsp_mobile/presentation/widgets/status_pill.dart';

class WorkerRequestsScreen extends StatefulWidget {
  const WorkerRequestsScreen({super.key});

  @override
  State<WorkerRequestsScreen> createState() => _WorkerRequestsScreenState();
}

class _WorkerRequestsScreenState extends State<WorkerRequestsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final requestProvider = context.watch<ServiceRequestProvider>();
    final allRequests = requestProvider.myRequests;

    final pending = allRequests
        .where((r) =>
            r.status.toUpperCase() == 'SUBMITTED' ||
            r.status.toUpperCase() == 'OPEN')
        .toList();

    final quoted = allRequests
        .where((r) =>
            r.status.toUpperCase() == 'MATCHED' ||
            r.status.toUpperCase() == 'QUOTED' ||
            r.status.toUpperCase() == 'IN_PROGRESS')
        .toList();

    final archived = allRequests
        .where((r) =>
            r.status.toUpperCase() == 'COMPLETED' ||
            r.status.toUpperCase() == 'CANCELLED' ||
            r.status.toUpperCase() == 'EXPIRED')
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Requests'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textMuted,
          indicatorColor: AppColors.primary,
          tabs: [
            Tab(text: 'New (${pending.length})'),
            Tab(text: 'Quoted (${quoted.length})'),
            Tab(text: 'Archived (${archived.length})'),
          ],
        ),
      ),
      body: requestProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildRequestList(context, pending, isPending: true),
                _buildRequestList(context, quoted),
                _buildRequestList(context, archived),
              ],
            ),
    );
  }

  Widget _buildRequestList(
    BuildContext context,
    List requests, {
    bool isPending = false,
  }) {
    if (requests.isEmpty) {
      return const EmptyStateView(
        title: 'No Job Requests',
        subtitle: 'Incoming client job requests will appear here in real-time.',
        icon: Icons.inbox_outlined,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      itemBuilder: (context, index) {
        final req = requests[index];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  StatusPill(status: req.status),
                  if (req.budgetMinor != null)
                    Text(
                      req.budgetFormatted,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                req.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                req.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.location_on_outlined,
                      size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  const Expanded(
                    child: Text(
                      'Accra Central / 4.2 km away',
                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Icon(Icons.calendar_today_outlined,
                      size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    req.formattedDate,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),
              if (isPending) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Request declined')),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textSecondary,
                          side: BorderSide(color: Colors.grey.shade300),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Decline'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => context
                            .push('/worker/requests/${req.id}/respond'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Send Quote'),
                      ),
                    ),
                  ],
                ),
              ] else ...[
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () =>
                        context.push('/customer/requests/${req.id}'),
                    icon: const Icon(Icons.remove_red_eye_outlined, size: 16),
                    label: const Text('View Details'),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}
