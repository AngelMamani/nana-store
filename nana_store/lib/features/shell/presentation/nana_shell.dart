import 'package:flutter/material.dart';

import '../../../app/nana_tabs.dart';
import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../home/presentation/nana_home_page.dart';
import '../../inventory/presentation/nana_inventory_page.dart';
import '../../orders/presentation/nana_orders_page.dart';
import '../../orders/presentation/nana_store_sale_page.dart';
import 'nana_admin_store.dart';

class NanaShell extends StatefulWidget {
  const NanaShell({super.key});

  @override
  State<NanaShell> createState() => NanaShellState();
}

class NanaShellState extends State<NanaShell> {
  late final NanaAdminStore _store;
  var _index = 0;

  @override
  void initState() {
    super.initState();
    _store = NanaAdminStore()..start();
  }

  @override
  void dispose() {
    _store.dispose();
    super.dispose();
  }

  void goTo(int index) {
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    final tablet = NanaLayout.isTablet(context);
    final pages = [
      NanaHomePage(onOpenTab: goTo),
      const NanaOrdersPage(),
      const NanaStoreSalePage(embedded: true),
      const NanaInventoryPage(),
    ];

    final body = IndexedStack(index: _index, children: pages);

    return NanaAdminStoreScope(
      store: _store,
      child: tablet
          ? Scaffold(
              backgroundColor: NanaColors.cream,
              body: Row(
                children: [
                  NavigationRail(
                    selectedIndex: _index,
                    onDestinationSelected: goTo,
                    extended: MediaQuery.sizeOf(context).width >= 980,
                    backgroundColor: Colors.white,
                    indicatorColor: NanaColors.pink.withValues(alpha: 0.18),
                    selectedIconTheme: const IconThemeData(color: NanaColors.pinkDark),
                    unselectedIconTheme: const IconThemeData(color: NanaColors.muted),
                    selectedLabelTextStyle: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: NanaColors.pinkDark,
                    ),
                    unselectedLabelTextStyle: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: NanaColors.muted,
                    ),
                    destinations: [
                      for (final tab in NanaTab.items)
                        NavigationRailDestination(
                          icon: Icon(tab.icon),
                          selectedIcon: Icon(tab.selectedIcon),
                          label: Text(tab.label),
                        ),
                    ],
                  ),
                  const VerticalDivider(width: 1, color: NanaColors.line),
                  Expanded(child: body),
                ],
              ),
            )
          : Scaffold(
              backgroundColor: NanaColors.cream,
              body: body,
              bottomNavigationBar: NavigationBar(
                selectedIndex: _index,
                onDestinationSelected: goTo,
                destinations: [
                  for (final tab in NanaTab.items)
                    NavigationDestination(
                      icon: Icon(tab.icon, color: NanaColors.muted),
                      selectedIcon: Icon(tab.selectedIcon, color: NanaColors.pinkDark),
                      label: tab.label,
                    ),
                ],
              ),
            ),
    );
  }
}
