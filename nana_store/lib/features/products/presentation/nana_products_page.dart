import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';

class NanaProductsPage extends StatelessWidget {
  const NanaProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return _NativeSection(
      title: 'Productos',
      hint: 'Catálogo de la tienda',
      icon: Icons.checkroom_rounded,
    );
  }
}

class _NativeSection extends StatelessWidget {
  const _NativeSection({required this.title, required this.hint, required this.icon});

  final String title;
  final String hint;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final padding = NanaLayout.pagePadding(context);
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(padding, 16, padding, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink),
            ),
            const SizedBox(height: 4),
            Text(hint, style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted)),
            const Spacer(),
            Center(
              child: Column(
                children: [
                  Icon(icon, size: 48, color: NanaColors.pinkDark),
                  const SizedBox(height: 12),
                  const Text(
                    'Lista nativa en el siguiente paso.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.ink),
                  ),
                ],
              ),
            ),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
