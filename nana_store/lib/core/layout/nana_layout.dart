import 'package:flutter/material.dart';

abstract final class NanaLayout {
  static const tabletShortestSide = 600.0;

  static bool isTablet(BuildContext context) {
    return MediaQuery.sizeOf(context).shortestSide >= tabletShortestSide;
  }

  static int homeColumns(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width >= 1100) return 4;
    if (width >= 700) return 3;
    return 2;
  }

  static double pagePadding(BuildContext context) {
    return isTablet(context) ? 28 : 16;
  }
}
