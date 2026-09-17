import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:disaster_management_app/main.dart';

void main() {
  testWidgets('App should start', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: DisasterManagementApp()));
    // Build the first frame
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
    // Replace tree to dispose AnimationControllers, then drain all queued
    // Future.delayed timers from SplashScreen.initState (they guard with
    // `if (mounted)` so firing them after dispose is safe).
    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 5));
  });
}
