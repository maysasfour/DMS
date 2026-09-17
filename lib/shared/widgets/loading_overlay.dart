// Wraps any widget with a full-screen semi-transparent loading overlay.
// Used during async operations (form submit, login, file upload) to block interaction
// and provide visual feedback without navigating away from the current screen.
// When isLoading is false the overlay is entirely absent from the widget tree
// (not just invisible) so it doesn't intercept pointer events.
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart'; // AppColors.primary for the spinner color

// Stack-based overlay: child always renders underneath; spinner layer conditionally added.
class LoadingOverlay extends StatelessWidget {
  final bool isLoading; // When true, renders the darkened overlay with spinner on top
  final Widget child;   // The page or form widget to wrap

  const LoadingOverlay(
      {super.key, required this.isLoading, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child, // Always present — the underlying page content
        if (isLoading) // Conditionally inserts the overlay; removed from tree when false
          Container(
            color: Colors.black54, // Semi-transparent black blocks the UI beneath
            child: const Center(
              child: CircularProgressIndicator(color: AppColors.primary), // Brand-colored spinner
            ),
          ),
      ],
    );
  }
}
