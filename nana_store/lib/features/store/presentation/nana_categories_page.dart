import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';
import 'nana_catalog_chrome.dart';

class NanaCategoriesPage extends StatefulWidget {
  const NanaCategoriesPage({super.key});

  @override
  State<NanaCategoriesPage> createState() => _NanaCategoriesPageState();
}

class _NanaCategoriesPageState extends State<NanaCategoriesPage> {
  final _query = TextEditingController();
  final _name = TextEditingController();
  var _categoryId = 'all';
  var _view = NanaCatalogView.cards;

  @override
  void dispose() {
    _query.dispose();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);
    final tablet = NanaLayout.isTablet(context);
    final needle = _query.text.trim().toLowerCase();
    final categories = store.categories.where((category) {
      if (_categoryId != 'all' && category.id != _categoryId) return false;
      if (needle.isEmpty) return true;
      return category.name.toLowerCase().contains(needle) || category.slug.toLowerCase().contains(needle);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 12, padding, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _name,
                  decoration: InputDecoration(
                    hintText: 'Nueva categoría',
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => _create(store),
                style: FilledButton.styleFrom(backgroundColor: NanaColors.pinkDark),
                child: const Text('Agregar'),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 0, padding, 10),
          child: NanaCatalogChrome(
            query: _query,
            hint: 'Buscar categoría',
            view: _view,
            onView: (value) => setState(() => _view = value),
            onQuery: () => setState(() {}),
            categories: store.categories,
            categoryId: _categoryId,
            onCategory: (value) => setState(() => _categoryId = value),
          ),
        ),
        Expanded(
          child: categories.isEmpty
              ? const Center(child: Text('Aún no hay categorías.'))
              : _view == NanaCatalogView.cards
                  ? GridView.builder(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: tablet ? 3 : 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.15,
                      ),
                      itemCount: categories.length,
                      itemBuilder: (context, index) => _CategoryCard(
                        category: categories[index],
                        count: store.products.where((product) => product.categoryId == categories[index].id).length,
                        onEdit: () => _rename(store, categories[index]),
                        onDelete: () => _delete(store, categories[index]),
                      ),
                    )
                  : ListView.separated(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      itemCount: categories.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final category = categories[index];
                        final count = store.products.where((product) => product.categoryId == category.id).length;
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: NanaColors.soft,
                              child: Icon(Icons.grid_view_rounded, color: NanaColors.pinkDark),
                            ),
                            title: Text(category.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                            subtitle: Text('$count prendas'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(onPressed: () => _rename(store, category), icon: const Icon(Icons.edit_rounded)),
                                IconButton(onPressed: () => _delete(store, category), icon: const Icon(Icons.delete_outline_rounded)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Future<void> _create(NanaAdminStore store) async {
    final name = _name.text.trim();
    if (name.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Escribe al menos 2 caracteres.')));
      return;
    }
    try {
      await store.saveCategory(name: name);
      _name.clear();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo crear la categoría.')));
    }
  }

  Future<void> _rename(NanaAdminStore store, NanaCategory category) async {
    final controller = TextEditingController(text: category.name);
    final next = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Renombrar categoría'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Guardar')),
        ],
      ),
    );
    if (next == null || next.length < 2) return;
    try {
      await store.saveCategory(id: category.id, name: next, order: category.order);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo guardar.')));
    }
  }

  Future<void> _delete(NanaAdminStore store, NanaCategory category) async {
    final used = store.products.any((product) => product.categoryId == category.id);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar categoría'),
        content: Text(used ? 'Hay prendas en “${category.name}”. ¿Eliminar igual?' : '¿Eliminar “${category.name}”?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await store.deleteCategory(category.id);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo eliminar.')));
    }
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category, required this.count, required this.onEdit, required this.onDelete});

  final NanaCategory category;
  final int count;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(22),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.grid_view_rounded, color: NanaColors.pinkDark),
              const Spacer(),
              Text(category.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              Text('$count prendas', style: const TextStyle(fontWeight: FontWeight.w600, color: NanaColors.muted)),
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
