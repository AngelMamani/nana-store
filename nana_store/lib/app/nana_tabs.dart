import 'package:flutter/material.dart';

class NanaTab {
  const NanaTab({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;

  static const items = <NanaTab>[
    NanaTab(label: 'Inicio', icon: Icons.home_outlined, selectedIcon: Icons.home_rounded),
    NanaTab(label: 'Pedidos', icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long_rounded),
    NanaTab(label: 'Venta', icon: Icons.point_of_sale_outlined, selectedIcon: Icons.point_of_sale_rounded),
    NanaTab(label: 'Stock', icon: Icons.inventory_2_outlined, selectedIcon: Icons.inventory_2_rounded),
  ];
}
