import 'package:flutter/material.dart';

import '../../../core/constants/nana_assets.dart';
import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../products/presentation/nana_products_page.dart';
import '../../session/presentation/session_scope.dart';
import '../../shell/presentation/nana_admin_store.dart';
import '../../store/presentation/nana_categories_page.dart';
import '../../store/presentation/nana_offers_page.dart';
import '../../store/presentation/nana_section_page.dart';
import '../../store/presentation/nana_store_page.dart';
import '../../store/presentation/nana_users_page.dart';
import '../../store/presentation/nana_videos_page.dart';

class NanaHomePage extends StatelessWidget {
  const NanaHomePage({super.key, required this.onOpenTab});

  final ValueChanged<int> onOpenTab;

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  String _today() {
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    final now = DateTime.now();
    return '${days[now.weekday - 1]} ${now.day} de ${months[now.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionScope.of(context);
    final user = session.user!;
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);
    final columns = NanaLayout.homeColumns(context);

    final tiles = <_HomeTile>[
      _HomeTile(
        label: 'Productos',
        hint: 'Catálogo y precios',
        icon: Icons.checkroom_rounded,
        color: NanaColors.pinkDark,
        onTap: () => NanaSectionPage.open(
          context,
          title: 'Productos',
          body: const NanaProductsPage(showTitle: false),
        ),
      ),
      _HomeTile(
        label: 'Categorías',
        hint: 'Menús de la tienda',
        icon: Icons.grid_view_rounded,
        color: const Color(0xFF7C5CFC),
        onTap: () => NanaSectionPage.open(context, title: 'Categorías', body: const NanaCategoriesPage()),
      ),
      _HomeTile(
        label: 'Ofertas',
        hint: 'Precios promocionales',
        icon: Icons.local_offer_rounded,
        color: const Color(0xFFD97706),
        onTap: () => NanaSectionPage.open(context, title: 'Ofertas', body: const NanaOffersPage()),
      ),
      _HomeTile(
        label: 'Usuarios',
        hint: 'Cuentas y roles',
        icon: Icons.people_alt_rounded,
        color: const Color(0xFF0F9D8A),
        onTap: () => NanaSectionPage.open(context, title: 'Usuarios', body: const NanaUsersPage()),
      ),
      _HomeTile(
        label: 'Videos',
        hint: 'Portada y reels',
        icon: Icons.videocam_rounded,
        color: const Color(0xFFE11D74),
        onTap: () => NanaSectionPage.open(context, title: 'Videos', body: const NanaVideosPage()),
      ),
      _HomeTile(
        label: 'Tienda',
        hint: 'Datos públicos',
        icon: Icons.storefront_rounded,
        color: NanaColors.ink,
        onTap: () => NanaSectionPage.open(context, title: 'Tienda', body: const NanaStorePage()),
      ),
    ];

    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 12, padding, 8),
            sliver: SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.fromLTRB(18, 18, 14, 18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(26),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFFF7AB8), NanaColors.pinkDark],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: NanaColors.pinkDark.withValues(alpha: 0.28),
                      blurRadius: 24,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.asset(
                        NanaAssets.icon,
                        width: 58,
                        height: 58,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox(
                          width: 58,
                          height: 58,
                          child: ColoredBox(
                            color: Colors.white,
                            child: Icon(Icons.storefront_rounded, color: NanaColors.pinkDark),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_greeting()}, ${user.firstName}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: -0.4,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _today(),
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.88),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(
                              user.role,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Salir',
                      onPressed: session.logout,
                      icon: const Icon(Icons.logout_rounded, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 6, padding, 4),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  _Kpi(
                    label: 'Nuevos',
                    value: '${store.newCount}',
                    color: const Color(0xFF0F9D8A),
                    onTap: () => onOpenTab(1),
                  ),
                  const SizedBox(width: 10),
                  _Kpi(
                    label: 'Reservas',
                    value: '${store.reservedCount}',
                    color: const Color(0xFFD97706),
                    onTap: () => onOpenTab(1),
                  ),
                  const SizedBox(width: 10),
                  _Kpi(
                    label: 'Alertas',
                    value: '${store.lowStockCount}',
                    color: const Color(0xFFC81E1E),
                    onTap: () => onOpenTab(3),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 14, padding, 8),
            sliver: const SliverToBoxAdapter(
              child: Text(
                'Administración',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: NanaColors.ink),
              ),
            ),
          ),
          SliverPadding(
            padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
            sliver: SliverGrid(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: NanaLayout.isTablet(context) ? 1.4 : 1.12,
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

class _Kpi extends StatelessWidget {
  const _Kpi({required this.label, required this.value, required this.color, required this.onTap});

  final String label;
  final String value;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.white,
        elevation: 0,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: NanaColors.line.withValues(alpha: 0.7)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 18, height: 4, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99))),
                const SizedBox(height: 10),
                Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: NanaColors.ink)),
                Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted, fontSize: 12)),
              ],
            ),
          ),
        ),
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
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: NanaColors.line.withValues(alpha: 0.75)),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
