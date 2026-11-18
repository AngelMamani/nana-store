import 'package:flutter/material.dart';

import '../../../core/constants/nana_assets.dart';
import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../session/presentation/session_scope.dart';
import '../../store/presentation/nana_section_page.dart';

class NanaHomePage extends StatelessWidget {
  const NanaHomePage({super.key, required this.onOpenTab});

  final ValueChanged<int> onOpenTab;

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user!;
    final padding = NanaLayout.pagePadding(context);
    final columns = NanaLayout.homeColumns(context);

    final tiles = <_HomeTile>[
      _HomeTile(
        label: 'Productos',
        hint: 'Editar catálogo',
        icon: Icons.checkroom_rounded,
        color: NanaColors.pinkDark,
        onTap: () => onOpenTab(1),
      ),
      _HomeTile(
        label: 'Pedidos',
        hint: 'Seguimiento',
        icon: Icons.receipt_long_rounded,
        color: const Color(0xFF0F9D8A),
        onTap: () => onOpenTab(2),
      ),
      _HomeTile(
        label: 'Inventario',
        hint: 'Control de stock',
        icon: Icons.inventory_2_rounded,
        color: const Color(0xFF7C5CFC),
        onTap: () => onOpenTab(3),
      ),
      _HomeTile(
        label: 'Ofertas',
        hint: 'Precios promo',
        icon: Icons.local_offer_rounded,
        color: const Color(0xFFD97706),
        onTap: () => NanaSectionPage.open(context, title: 'Ofertas', hint: 'Precios promocionales'),
      ),
      _HomeTile(
        label: 'Videos',
        hint: 'Portada y reels',
        icon: Icons.videocam_rounded,
        color: const Color(0xFFE11D74),
        onTap: () => NanaSectionPage.open(context, title: 'Videos', hint: 'Portada y reels'),
      ),
      _HomeTile(
        label: 'Tienda',
        hint: 'Datos públicos',
        icon: Icons.storefront_rounded,
        color: NanaColors.ink,
        onTap: () => NanaSectionPage.open(context, title: 'Tienda', hint: 'Datos públicos'),
      ),
    ];

    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 12, padding, 8),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.asset(NanaAssets.icon, width: 52, height: 52, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_greeting()}, ${user.firstName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: NanaColors.ink,
                          ),
                        ),
                        const Text(
                          'Panel NaNa Admin',
                          style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Salir',
                    onPressed: session.logout,
                    icon: const Icon(Icons.logout_rounded, color: NanaColors.pinkDark),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 8, padding, 24),
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: NanaLayout.isTablet(context) ? 1.35 : 1.05,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) => tiles[index],
                childCount: tiles.length,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeTile extends StatelessWidget {
  const _HomeTile({
    required this.label,
    required this.hint,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final String hint;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color),
              ),
              const Spacer(),
              Text(
                label,
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: NanaColors.ink),
              ),
              const SizedBox(height: 2),
              Text(
                hint,
                style: const TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
