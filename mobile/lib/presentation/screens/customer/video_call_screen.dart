import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class VideoCallScreen extends StatefulWidget {
  final String conversationId;

  const VideoCallScreen({super.key, required this.conversationId});

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isFrontCamera = true;
  bool _isSpeakerOn = true;
  int _callSeconds = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() => _callSeconds++);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _endCall() {
    _timer?.cancel();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Call ended. Total duration: ${_formatDuration(_callSeconds)}')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111827), // Deep dark theme for WebRTC video room
      body: SafeArea(
        child: Stack(
          children: [
            // Remote Video Background
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1F2937), Color(0xFF111827)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircleAvatar(
                      radius: 56,
                      backgroundColor: AppColors.brand.withValues(alpha: 0.2),
                      child: const CircleAvatar(
                        radius: 48,
                        backgroundColor: AppColors.brand,
                        child: Text(
                          'TC',
                          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Turner Construction Co.',
                      style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Hiring Interview: Lead Journeyman',
                      style: TextStyle(color: Color(0xFF9CA3AF), fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.success,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Connected • ${_formatDuration(_callSeconds)}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Top Status Bar
            Positioned(
              top: 16,
              left: 16,
              right: 16,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.lock_outline, color: AppColors.success, size: 14),
                        SizedBox(width: 6),
                        Text('End-to-End Encrypted', style: TextStyle(color: Colors.white, fontSize: 11)),
                      ],
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(_isSpeakerOn ? Icons.volume_up : Icons.volume_down, color: Colors.white),
                    onPressed: () => setState(() => _isSpeakerOn = !_isSpeakerOn),
                  ),
                ],
              ),
            ),

            // Local PiP Window (bottom right above controls)
            Positioned(
              right: 16,
              bottom: 120,
              width: 110,
              height: 160,
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF374151),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    children: [
                      Center(
                        child: _isVideoOff
                            ? const Icon(Icons.videocam_off, color: Colors.white54, size: 28)
                            : const Text('You', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w700)),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: InkWell(
                          onTap: () => setState(() => _isFrontCamera = !_isFrontCamera),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                            child: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom In-Call Controls Bar
            Positioned(
              bottom: 24,
              left: 20,
              right: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F2937).withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Mute Audio
                    _buildControlButton(
                      icon: _isMuted ? Icons.mic_off : Icons.mic,
                      isActive: _isMuted,
                      activeColor: AppColors.error,
                      inactiveColor: const Color(0xFF374151),
                      onTap: () => setState(() => _isMuted = !_isMuted),
                    ),

                    // Toggle Video
                    _buildControlButton(
                      icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
                      isActive: _isVideoOff,
                      activeColor: AppColors.error,
                      inactiveColor: const Color(0xFF374151),
                      onTap: () => setState(() => _isVideoOff = !_isVideoOff),
                    ),

                    // Share Jobsite Screen
                    _buildControlButton(
                      icon: Icons.screen_share_outlined,
                      isActive: false,
                      activeColor: AppColors.brand,
                      inactiveColor: const Color(0xFF374151),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Screen & site schematic sharing activated.')),
                        );
                      },
                    ),

                    // End Call
                    _buildControlButton(
                      icon: Icons.call_end,
                      isActive: true,
                      activeColor: AppColors.error,
                      inactiveColor: AppColors.error,
                      onTap: _endCall,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required Color inactiveColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: isActive ? activeColor : inactiveColor,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }
}
