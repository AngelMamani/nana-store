import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../products/presentation/nana_product_form_page.dart';
import '../../shell/presentation/nana_admin_store.dart';
import '../../store/presentation/nana_catalog_chrome.dart';

class NanaInventoryPage extends StatefulWidget {
  const NanaInventoryPage({super.key});

  @override
  State<NanaInventoryPage> createState() => _NanaInventoryPageState();
}

class _NanaInventoryPageState extends State<NanaInventoryPage> {
  final _query = TextEditingController();
  var _categoryId = 'all';
  var _filter = 'all';
  var _view = NanaCatalogView.cards;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  String _alert(NanaProduct product) {
    if (product.stock == null) return 'none';
    if (product.stock! <= 0) return 'out';
    if (product.stock! <= 3) return 'low';
    return 'ok';
  }

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);
    final tablet = NanaLayout.isTablet(context);
    final needle = _query.text.trim().toLowerCase();
    final products = [...store.products.where((product) {
      if (_categoryId != 'all' && product.categoryId != _categoryId) return false;
      if (_filter != 'all' && _alert(product) != _filter) return false;
      if (needle.isEmpty) return true;
      return product.name.toLowerCase().contains(needle) ||
          (product.code ?? '').toLowerCase().contains(needle) ||
          product.colors.any((color) => color.toLowerCase().contains(needle)) ||
          product.sizes.any((size) => size.toLowerCase().contains(needle));
    })]
      ..sort((left, right) {
        const order = {'out': 0, 'low': 1, 'ok': 2, 'none': 3};
        final byAlert = (order[_alert(left)] ?? 9).compareTo(order[_alert(right)] ?? 9);
        if (byAlert != 0) return byAlert;
        return left.name.toLowerCase().compareTo(right.name.toLowerCase());
      });

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 16, padding, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Inventario', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink)),
                const SizedBox(height: 4),
                Text(
                  '${store.products.length} prendas en catálogo',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted),
                ),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 0, padding, 10),
            child: NanaCatalogChrome(
              query: _query,
              hint: 'Buscar prenda, color o talla',
              view: _view,
              onView: (value) => setState(() => _view = value),
              onQuery: () => setState(() {}),
              categories: store.categories,
              categoryId: _categoryId,
              onCategory: (value) => setState(() => _categoryId = value),
              filters: const [
                ('all', 'Todos'),
                ('out', 'Agotado'),
                ('low', 'Bajo'),
                ('ok', 'Ok'),
                ('none', 'Sin control'),
              ],
              filterId: _filter,
              onFilter: (value) => setState(() => _filter = value),
            ),
          ),
          Expanded(
            child: store.loading
                ? const Center(child: CircularProgressIndicator())
                : products.isEmpty
                    ? const Center(child: Text('No hay productos en este filtro.'))
                    : _view == NanaCatalogView.cards
                        ? GridView.builder(
                            padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: tablet ? 3 : 2,
                              mainAxisSpacing: 12,
                              crossAxisSpacing: 12,
                              childAspectRatio: tablet ? 0.78 : 0.68,
                            ),
                            itemCount: products.length,
                            itemBuilder: (context, index) {
                              final product = products[index];
                              return _InventoryCard(
                                product: product,
                                categoryName: store.categoryById(product.categoryId)?.name,
                                reserved: store.reservedUnitsFor(product.id),
                                alertLabel: _label(_alert(product)),
                                alertColor: _color(_alert(product)),
                                onTap: () => _editStock(store, product),
                                onEdit: () => _openProduct(store, product),
                              );
                            },
                          )
                        : ListView.separated(
                            padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                            itemCount: products.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final product = products[index];
                              final alert = _alert(product);
                              final reserved = store.reservedUnitsFor(product.id);
                              return Material(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                child: ListTile(
                                  onTap: () => _editStock(store, product),
                                  leading: ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: SizedBox(width: 52, height: 52, child: _Thumb(url: product.image)),
                                  ),
                                  title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                                  subtitle: Text(
                                    [
                                      store.categoryById(product.categoryId)?.name ?? 'Sin categoría',
                                      formatPen(product.salePrice),
                                      _label(alert),
                                      if (reserved > 0) '$reserved reserv.',
                                    ].join(' · '),
                                  ),
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        product.stock == null ? '—' : '${product.stock} u.',
                                        style: TextStyle(fontWeight: FontWeight.w800, color: _color(alert)),
                                      ),
                                      IconButton(
                                        onPressed: () => _openProduct(store, product),
                                        icon: const Icon(Icons.edit_rounded, color: NanaColors.muted),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  String _label(String alert) {
    switch (alert) {
      case 'out':
        return 'Agotado';
      case 'low':
        return 'Reponer';
      case 'none':
        return 'Sin control';
      default:
        return 'Disponible';
    }
  }

  Color _color(String alert) {
    if (alert == 'out' || alert == 'low') return const Color(0xFFC81E1E);
    return NanaColors.ink;
  }

  Future<void> _openProduct(NanaAdminStore store, NanaProduct product) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NanaAdminStoreScope(
          store: store,
          child: NanaProductFormPage(product: product),
        ),
      ),
    );
  }

  Future<void> _editStock(NanaAdminStore store, NanaProduct product) async {
    final controller = TextEditingController(text: product.stock?.toString() ?? '');
    final next = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Stock · ${product.name}'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Unidades'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(context, int.tryParse(controller.text.trim())),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (next == null) return;
    try {
      await store.updateProductStock(product, next);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo actualizar el stock.')));
    }
  }
}

class _InventoryCard extends StatelessWidget {
  const _InventoryCard({
    required this.product,
    required this.alertLabel,
    required this.alertColor,
    required this.reserved,
    required this.onTap,
    required this.onEdit,
    this.categoryName,
  });

  final NanaProduct product;
  final String? categoryName;
  final String alertLabel;
  final Color alertColor;
  final int reserved;
  final VoidCallback onTap;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        onLongPress: onEdit,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: NanaColors.line.withValues(alpha: 0.8)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _Thumb(url: product.image)),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(
                      [
                        categoryName ?? 'Sin categoría',
                        formatPen(product.salePrice),
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: NanaColors.muted),
                    ),
                    const SizedBox(height: 4),
                    Text(alertLabel, style: TextStyle(fontWeight: FontWeight.w800, color: alertColor)),
                    Text(
                      [
                        product.stock == null ? 'Sin stock definido' : '${product.stock} u.',
                        if (reserved > 0) '$reserved reserv.',
                      ].join(' · '),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return const ColoredBox(
        color: NanaColors.soft,
        child: Icon(Icons.checkroom_rounded, color: NanaColors.pinkDark),
      );
    }
    return Image.network(
      url!,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => const ColoredBox(
        color: NanaColors.soft,
        child: Icon(Icons.checkroom_rounded, color: NanaColors.pinkDark),
      ),
    );
  }
}
