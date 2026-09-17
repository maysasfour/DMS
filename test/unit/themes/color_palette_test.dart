import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/core/themes/color_palette.dart';
import 'package:disaster_management_app/core/constants/roles.dart';

void main() {
  group('ColorPalette', () {
    // ── getPrimaryByRole ────────────────────────────────────────────────────
    group('getPrimaryByRole', () {
      test('returns admin color (case-insensitive)', () {
        expect(ColorPalette.getPrimaryByRole('admin'),  ColorPalette.adminPrimary);
        expect(ColorPalette.getPrimaryByRole('ADMIN'),  ColorPalette.adminPrimary);
        expect(ColorPalette.getPrimaryByRole('Admin'),  ColorPalette.adminPrimary);
      });

      test('returns responder color', () {
        expect(ColorPalette.getPrimaryByRole('responder'), ColorPalette.responderPrimary);
        expect(ColorPalette.getPrimaryByRole('RESPONDER'), ColorPalette.responderPrimary);
      });

      test('returns citizen color', () {
        expect(ColorPalette.getPrimaryByRole('citizen'), ColorPalette.citizenPrimary);
      });

      test('returns official color', () {
        expect(ColorPalette.getPrimaryByRole('official'), ColorPalette.officialPrimary);
      });

      test('returns citizen as default for unknown role', () {
        expect(ColorPalette.getPrimaryByRole('unknown'),  ColorPalette.citizenPrimary);
        expect(ColorPalette.getPrimaryByRole(''),         ColorPalette.citizenPrimary);
        expect(ColorPalette.getPrimaryByRole('hacker'),   ColorPalette.citizenPrimary);
      });
    });

    // ── primaryByRoleEnum ───────────────────────────────────────────────────
    group('primaryByRoleEnum', () {
      test('returns correct color for each UserRole', () {
        expect(ColorPalette.primaryByRoleEnum(UserRole.admin),     ColorPalette.adminPrimary);
        expect(ColorPalette.primaryByRoleEnum(UserRole.responder), ColorPalette.responderPrimary);
        expect(ColorPalette.primaryByRoleEnum(UserRole.citizen),   ColorPalette.citizenPrimary);
        expect(ColorPalette.primaryByRoleEnum(UserRole.official),  ColorPalette.officialPrimary);
      });

      test('returns admin color for null role', () {
        expect(ColorPalette.primaryByRoleEnum(null), ColorPalette.adminPrimary);
      });
    });

    // ── getStatusColor ──────────────────────────────────────────────────────
    group('getStatusColor', () {
      test('maps all known statuses correctly', () {
        expect(ColorPalette.getStatusColor('reported'),     ColorPalette.reported);
        expect(ColorPalette.getStatusColor('acknowledged'), ColorPalette.acknowledged);
        expect(ColorPalette.getStatusColor('inprogress'),   ColorPalette.inProgress);
        expect(ColorPalette.getStatusColor('resolved'),     ColorPalette.resolved);
        expect(ColorPalette.getStatusColor('closed'),       ColorPalette.closed);
      });

      test('is case-insensitive', () {
        expect(ColorPalette.getStatusColor('REPORTED'),  ColorPalette.reported);
        expect(ColorPalette.getStatusColor('Resolved'),  ColorPalette.resolved);
      });

      test('returns reported for unknown status', () {
        expect(ColorPalette.getStatusColor('unknown'), ColorPalette.reported);
      });
    });

    // ── getSeverityColor ────────────────────────────────────────────────────
    group('getSeverityColor', () {
      test('maps all severity levels correctly', () {
        expect(ColorPalette.getSeverityColor('low'),      ColorPalette.severityLow);
        expect(ColorPalette.getSeverityColor('medium'),   ColorPalette.severityMedium);
        expect(ColorPalette.getSeverityColor('high'),     ColorPalette.severityHigh);
        expect(ColorPalette.getSeverityColor('critical'), ColorPalette.severityCritical);
      });

      test('is case-insensitive', () {
        expect(ColorPalette.getSeverityColor('HIGH'),     ColorPalette.severityHigh);
        expect(ColorPalette.getSeverityColor('Critical'), ColorPalette.severityCritical);
      });

      test('defaults to medium for unknown severity', () {
        expect(ColorPalette.getSeverityColor('severe'),   ColorPalette.severityMedium);
        expect(ColorPalette.getSeverityColor(''),         ColorPalette.severityMedium);
      });

      test('handles SQL injection input safely — does not throw', () {
        expect(() => ColorPalette.getSeverityColor('<script>alert(1)</script>'),
            returnsNormally);
        expect(() => ColorPalette.getPrimaryByRole("'; DROP TABLE;--"),
            returnsNormally);
      });
    });

    // ── gradientByRole ──────────────────────────────────────────────────────
    group('gradientByRole', () {
      test('all roles return valid LinearGradient with 2+ colors', () {
        for (final role in ['admin', 'responder', 'citizen', 'official']) {
          final g = ColorPalette.gradientByRole(role);
          expect(g, isA<LinearGradient>());
          expect(g.colors.length, greaterThanOrEqualTo(2));
        }
      });

      test('unknown role returns citizen gradient', () {
        expect(ColorPalette.gradientByRole('xyz'), ColorPalette.citizenGradient);
      });
    });

    // ── glowShadow ──────────────────────────────────────────────────────────
    group('glowShadow', () {
      test('returns exactly 2 BoxShadow entries', () {
        final shadows = ColorPalette.glowShadow(Colors.blue);
        expect(shadows.length, 2);
      });

      test('inner shadow has smaller blur than outer shadow', () {
        final shadows = ColorPalette.glowShadow(Colors.red);
        expect(shadows[0].blurRadius, lessThan(shadows[1].blurRadius));
      });

      test('larger radius produces larger blur', () {
        final tight = ColorPalette.glowShadow(Colors.red, radius: 10);
        final wide  = ColorPalette.glowShadow(Colors.red, radius: 40);
        expect(tight[0].blurRadius, lessThan(wide[0].blurRadius));
      });
    });

    // ── Glass opacity contracts ─────────────────────────────────────────────
    group('Glass color opacity', () {
      test('glassLight has low opacity (< 0.15)', () {
        expect(ColorPalette.glassLight.opacity, lessThan(0.15));
      });

      test('glassMid, glassLight, glassDark are all distinct', () {
        expect(ColorPalette.glassMid,  isNot(ColorPalette.glassLight));
        expect(ColorPalette.glassDark, isNot(ColorPalette.glassLight));
        expect(ColorPalette.glassDark, isNot(ColorPalette.glassMid));
      });
    });
  });
}
