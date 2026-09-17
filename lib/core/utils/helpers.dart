// =============================================================================
// File: helpers.dart
// Project: Disaster Management System (DMS) — Flutter Mobile App
// Purpose: Provides shared utility helper functions used across the DMS app.
//          This includes UI convenience methods such as displaying feedback
//          messages (snack bars) to field officers, team members, and citizens
//          after actions like incident reporting, resource requests, or alerts.
// =============================================================================

// Flutter material library — provides BuildContext, ScaffoldMessenger, SnackBar, and Text widgets
// Required for accessing the widget tree, scaffold infrastructure, and core UI components
import 'package:flutter/material.dart';

/// Displays a brief snack bar notification at the bottom of the screen.
///
/// Used throughout the DMS app to provide immediate feedback to users —
/// for example, confirming that an incident was submitted, a resource was
/// requested, or an alert was acknowledged. The [context] must refer to a
/// widget that has a [Scaffold] ancestor.
///
/// [context] — the build context of the calling widget, used to locate the nearest Scaffold.
/// [message] — the human-readable text to display, e.g. "Incident reported successfully."
void showSnackBar(BuildContext context, String message) {
  // Locate the nearest ScaffoldMessenger in the widget tree to host the snack bar
  // ScaffoldMessenger manages snack bar display state across route transitions in the DMS app
  ScaffoldMessenger.of(context).showSnackBar(
    // Construct a SnackBar with the provided DMS feedback message as its content
    // Text widget renders the message string (e.g., success/error from incident or resource actions)
    SnackBar(content: Text(message)),
  );
}