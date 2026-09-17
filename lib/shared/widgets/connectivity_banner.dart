// Thin banner shown at the top of every screen inside MainScaffold when the device
// loses internet connectivity. Disappears automatically when the connection returns.
// Uses isOnlineProvider (a StreamProvider backed by connectivity_plus) so it
// reacts in real-time without any manual polling.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/connectivity_service.dart'; // isOnlineProvider stream
import '../../core/constants/app_colors.dart'; // AppColors.warning (amber)

// Non-intrusive offline indicator placed above the page content area.
// Returns a zero-height widget when online so it has no layout impact.
class ConnectivityBanner extends ConsumerWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // valueOrNull defaults to true (online) while the stream hasn't emitted yet,
    // preventing a false offline flash on cold start
    final isOnline = ref.watch(isOnlineProvider).valueOrNull ?? true;
    if (isOnline) return const SizedBox.shrink(); // No banner when online — zero height
    return Container(
      width: double.infinity, // Stretches across the full screen width
      color: AppColors.warning, // Amber background — caution, not error
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.wifi_off_rounded, size: 14, color: Colors.black), // Offline icon
          SizedBox(width: 6),
          Text(
            'No internet connection — showing cached data', // Informs user data may be stale
            style: TextStyle(color: Colors.black, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
