// Language selector components: a compact AppBar pill (LangPill) and the
// language-picker bottom sheet (showLangSheet / _LangSheetContent).
// LangPill shows the current language's flag emoji and a dropdown arrow.
// Tapping either opens a 2-column grid of available languages.
// Selecting a language calls localeProvider.setLocale() which persists the
// choice per-user via SharedPreferences and immediately rebuilds MaterialApp.
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ConsumerWidget, WidgetRef
import 'package:google_fonts/google_fonts.dart'; // Inter font for sheet title
import '../../core/constants/app_colors.dart'; // AppColors.border for grid tile borders
import '../../core/l10n/app_strings.dart'; // appString() for "select_language" label
import '../../providers/locale_provider.dart'; // localeProvider for reading/setting locale

const _kLangs = [
  ('en', '🇬🇧', 'English'),
  ('ar', '🇸🇦', 'العربية'),
  ('fr', '🇫🇷', 'Français'),
  ('es', '🇪🇸', 'Español'),
  ('de', '🇩🇪', 'Deutsch'),
  ('tr', '🇹🇷', 'Türkçe'),
  ('zh', '🇨🇳', '中文'),
  ('ru', '🇷🇺', 'Русский'),
];

/// AppBar pill that opens the language bottom sheet.
class LangPill extends ConsumerWidget {
  final bool isDark;
  final Color textCol;
  const LangPill({super.key, required this.isDark, required this.textCol});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(localeProvider).languageCode;
    final flag = _kLangs.firstWhere((l) => l.$1 == lang, orElse: () => _kLangs.first).$2;
    return GestureDetector(
      onTap: () => showLangSheet(context, ref, isDark: isDark),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(flag, style: const TextStyle(fontSize: 16)),
          Icon(Icons.arrow_drop_down, size: 16, color: textCol),
        ]),
      ),
    );
  }
}

/// Shows the language picker bottom sheet.
void showLangSheet(BuildContext context, WidgetRef ref, {required bool isDark}) {
  final lang = ref.read(localeProvider).languageCode;
  final textCol = isDark ? Colors.white : Colors.black87;
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _LangSheetContent(
      current: lang,
      isDark: isDark,
      textCol: textCol,
      onSelect: (code) {
        ref.read(localeProvider.notifier).setLocale(code);
        Navigator.pop(context);
      },
    ),
  );
}

class _LangSheetContent extends StatelessWidget {
  final String current;
  final bool isDark;
  final Color textCol;
  final void Function(String) onSelect;
  const _LangSheetContent({
    required this.current,
    required this.isDark,
    required this.textCol,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF111827) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 36),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Center(
          child: Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1D4ED8), Color(0xFF7C3AED)]),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.language_rounded, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Text(
            appString('select_language', current),
            style: GoogleFonts.inter(color: textCol, fontSize: 18, fontWeight: FontWeight.w700),
          ),
        ]),
        const SizedBox(height: 20),
        GridView.count(
          crossAxisCount: 2, shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 3.5,
          children: _kLangs.map((l) {
            final isSel = l.$1 == current;
            return GestureDetector(
              onTap: () => onSelect(l.$1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  gradient: isSel ? const LinearGradient(colors: [Color(0xFFDC2626), Color(0xFF991B1B)]) : null,
                  color: isSel ? null : (isDark ? const Color(0xFF1C2333) : Colors.grey.shade50),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSel ? const Color(0xFFDC2626) : (isDark ? AppColors.border : Colors.grey.shade200),
                  ),
                  boxShadow: isSel ? [const BoxShadow(color: Color(0x55DC2626), blurRadius: 8, offset: Offset(0, 2))] : [],
                ),
                child: Row(children: [
                  Text(l.$2, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(l.$3, style: TextStyle(
                      color: isSel ? Colors.white : textCol,
                      fontSize: 13, fontWeight: FontWeight.w600,
                    )),
                  ),
                  if (isSel) const Icon(Icons.check_circle, color: Colors.white, size: 16),
                ]),
              ),
            );
          }).toList(),
        ),
      ]),
    );
  }
}
