import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/constants/nana_colors.dart';

abstract final class NanaTheme {
  static const systemUi = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

  static ThemeData get light {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: NanaColors.pink,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: NanaColors.cream,
      useMaterial3: true,
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: NanaColors.pink.withValues(alpha: 0.18),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: selected ? NanaColors.pinkDark : NanaColors.muted,
          );
        }),
      ),
    );
  }
}
