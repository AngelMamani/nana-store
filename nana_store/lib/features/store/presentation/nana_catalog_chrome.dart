import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../shell/presentation/nana_admin_store.dart';

enum NanaCatalogView { list, cards }

class NanaCatalogChrome extends StatelessWidget {
  const NanaCatalogChrome({
    super.key,
    required this.query,
    required this.hint,
    required this.view,
    required this.onView,
    required this.onQuery,
    this.categories = const [],
    this.categoryId = 'all',
    this.onCategory,
    this.showCategories = true,
    this.filters = const [],
    this.filterId,
    this.onFilter,
  });

  final TextEditingController query;
  final String hint;
  final NanaCatalogView view;
  final ValueChanged<NanaCatalogView> onView;
  final VoidCallback onQuery;
  final List<NanaCategory> categories;
  final String categoryId;
  final ValueChanged<String>? onCategory;
  final bool showCategories;
  final List<(String id, String label)> filters;
  final String? filterId;
  final ValueChanged<String>? onFilter;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: query,
                onChanged: (_) => onQuery(),
                decoration: InputDecoration(
                  hintText: hint,
                  prefixIcon: const Icon(Icons.search_rounded, color: NanaColors.pinkDark),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
                ),
              ),
            ),
            const SizedBox(width: 8),
            NanaViewToggle(view: view, onView: onView),
          ],
        ),
        if (showCategories && onCategory != null) ...[
          const SizedBox(height: 10),
          NanaChipRow(
            items: [
              ('all', 'Todas'),
              for (final category in categories) (category.id, category.name),
            ],
            selected: categoryId,
            onSelected: onCategory!,
          ),
        ],
        if (filters.isNotEmpty && onFilter != null) ...[
          const SizedBox(height: 8),
          NanaChipRow(items: filters, selected: filterId ?? filters.first.$1, onSelected: onFilter!),
        ],
      ],
    );
  }
}

class NanaViewToggle extends StatelessWidget {
  const NanaViewToggle({super.key, required this.view, required this.onView});

  final NanaCatalogView view;
  final ValueChanged<NanaCatalogView> onView;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NanaColors.line.withValues(alpha: 0.8)),
      ),
      child: Row(
        children: [
          _Toggle(icon: Icons.view_list_rounded, selected: view == NanaCatalogView.list, onTap: () => onView(NanaCatalogView.list)),
          _Toggle(icon: Icons.grid_view_rounded, selected: view == NanaCatalogView.cards, onTap: () => onView(NanaCatalogView.cards)),
        ],
      ),
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.icon, required this.selected, required this.onTap});

  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      visualDensity: VisualDensity.compact,
      onPressed: onTap,
      icon: Icon(icon, color: selected ? NanaColors.pinkDark : NanaColors.muted),
    );
  }
}

class NanaChipRow extends StatelessWidget {
  const NanaChipRow({super.key, required this.items, required this.selected, required this.onSelected});

  final List<(String id, String label)> items;
  final String selected;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final item in items)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(item.$2),
                selected: selected == item.$1,
                onSelected: (_) => onSelected(item.$1),
                selectedColor: NanaColors.pink.withValues(alpha: 0.22),
                checkmarkColor: NanaColors.pinkDark,
                labelStyle: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: selected == item.$1 ? NanaColors.pinkDark : NanaColors.ink,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
