import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';

class NanaInventoryPage extends StatelessWidget {
  const NanaInventoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    final padding = NanaLayout.pagePadding(context);
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(padding, 16, padding, 16),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inventario',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink),
            ),
            SizedBox(height: 4),
            Text('Control de stock', style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted)),
            Spacer(),
            Center(
              child: Column(
                children: [
                  Icon(Icons.inventory_2_rounded, size: 48, color: NanaColors.pinkDark),
                  SizedBox(height: 12),
                  Text(
                    'Stock nativo en el siguiente paso.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.ink),
                  ),
                ],
              ),
            ),
            Spacer(),
          ],
        ),
      ),
    );
  }
}
