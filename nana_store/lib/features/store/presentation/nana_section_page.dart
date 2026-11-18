import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';

class NanaSectionPage extends StatelessWidget {
  const NanaSectionPage({super.key, required this.title, required this.hint});

  final String title;
  final String hint;

  static Future<void> open(BuildContext context, {required String title, required String hint}) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NanaSectionPage(title: title, hint: hint),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: NanaColors.cream,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: NanaColors.ink,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 42, color: NanaColors.pinkDark),
              const SizedBox(height: 12),
              Text(
                hint,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted),
              ),
              const SizedBox(height: 8),
              const Text(
                'Esta pantalla se arma en Flutter, sin la web.',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w600, color: NanaColors.ink),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
