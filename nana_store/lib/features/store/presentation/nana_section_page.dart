import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../shell/presentation/nana_admin_store.dart';

class NanaSectionPage extends StatelessWidget {
  const NanaSectionPage({super.key, required this.title, this.hint, this.body});

  final String title;
  final String? hint;
  final Widget? body;

  static Future<void> open(
    BuildContext context, {
    required String title,
    String? hint,
    Widget? body,
  }) {
    final store = NanaAdminStoreScope.of(context);
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NanaAdminStoreScope(
          store: store,
          child: NanaSectionPage(title: title, hint: hint, body: body),
        ),
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
        elevation: 0,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: body ??
          Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: NanaColors.soft,
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Icon(Icons.auto_awesome_rounded, size: 36, color: NanaColors.pinkDark),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    hint ?? title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: NanaColors.ink),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Esta sección se completa en nativo, sin abrir la web.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted),
                  ),
                ],
              ),
            ),
          ),
    );
  }
}

