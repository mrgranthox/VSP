import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/worker_profile_model.dart';
import '../../../data/repositories/discovery_repository.dart';
import '../../widgets/empty_state_view.dart';
import '../../widgets/worker_card.dart';

class SavedWorkersScreen extends StatefulWidget {
  const SavedWorkersScreen({super.key});

  @override
  State<SavedWorkersScreen> createState() => _SavedWorkersScreenState();
}

class _SavedWorkersScreenState extends State<SavedWorkersScreen> {
  List<WorkerProfile> _savedWorkers = [];

  @override
  void initState() {
    super.initState();
    _savedWorkers = List.from(DiscoveryRepository.fallbackFeaturedWorkers.take(2));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Saved Workers'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: _savedWorkers.isEmpty
          ? EmptyStateView(
              icon: Icons.bookmark_border_rounded,
              title: 'No saved workers',
              message: 'Bookmark skilled trades to quickly hire them again.',
              buttonText: 'Explore Workers',
              onButtonPressed: () => context.go('/search'),
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _savedWorkers.length,
              itemBuilder: (context, index) {
                final worker = _savedWorkers[index];
                return Dismissible(
                  key: Key(worker.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    color: AppColors.danger,
                    child: const Icon(Icons.delete_outline, color: Colors.white),
                  ),
                  onDismissed: (_) {
                    setState(() {
                      _savedWorkers.removeAt(index);
                    });
                  },
                  child: WorkerCard(
                    worker: worker,
                    onTap: () => context.push('/worker/${worker.id}'),
                    onBookTap: () => context.push('/book-worker/${worker.id}'),
                    onMessageTap: () => context.push('/chat/${worker.id}'),
                  ),
                );
              },
            ),
    );
  }
}
