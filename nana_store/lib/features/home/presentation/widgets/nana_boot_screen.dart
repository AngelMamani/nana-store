import 'package:flutter/material.dart';

import '../../../../core/constants/nana_assets.dart';
import '../../../../core/constants/nana_colors.dart';

class NanaBootScreen extends StatelessWidget {
  const NanaBootScreen({super.key, required this.progress, this.error, this.onRetry});

  final int progress;
  final String? error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final value = progress > 0 && progress < 100 ? progress / 100 : null;
    return Scaffold(
      backgroundColor: NanaColors.cream,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [NanaColors.cream, NanaColors.soft, NanaColors.line],
          ),
        ),
        child: Stack(
          children: [
            const Positioned(top: -60, right: -40, child: _GlowBlob(size: 220, opacity: 0.35)),
            const Positioned(bottom: 80, left: -70, child: _GlowBlob(size: 260, opacity: 0.28)),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 24, 28, 20),
                child: Column(
                  children: [
                    const Spacer(),
                    Container(
                      width: 128,
                      height: 128,
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(32),
                        boxShadow: [
                          BoxShadow(
                            color: NanaColors.pinkDark.withValues(alpha: 0.22),
                            blurRadius: 28,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(27),
                        child: Image.asset(
                          NanaAssets.logo,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const Icon(Icons.storefront_rounded, size: 56, color: NanaColors.pinkDark),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'NaNa Admin',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: NanaColors.ink,
                        letterSpacing: -0.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Pedidos, caja, inventario y boletas\nen un solo panel.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                        color: NanaColors.muted,
                      ),
                    ),
                    const SizedBox(height: 36),
                    const Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: [
                        _Pill(label: 'Ventas'),
                        _Pill(label: 'Reservas'),
                        _Pill(label: 'Impresora'),
                        _Pill(label: 'Catálogo'),
                      ],
                    ),
                    const Spacer(),
                    if (error != null) ...[
                      Text(
                        error!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFFC81E1E)),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: onRetry,
                        style: FilledButton.styleFrom(backgroundColor: NanaColors.pinkDark),
                        child: const Text('Reintentar'),
                      ),
                    ] else ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(99),
                        child: LinearProgressIndicator(
                          value: value,
                          minHeight: 8,
                          color: NanaColors.pinkDark,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        value == null ? 'Abriendo NaNa Admin…' : 'Cargando ${progress.clamp(0, 99)}%',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: NanaColors.muted,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    const Text(
                      'Puerto Maldonado',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.4,
                        color: NanaColors.pinkDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GlowBlob extends StatelessWidget {
  const _GlowBlob({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: NanaColors.pink.withValues(alpha: opacity),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: NanaColors.line),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: NanaColors.pinkDark,
        ),
      ),
    );
  }
}
