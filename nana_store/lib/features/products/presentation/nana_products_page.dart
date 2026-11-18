import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';
import '../../store/presentation/nana_catalog_chrome.dart';
import 'nana_product_form_page.dart';

class NanaProductsPage extends StatefulWidget {
  const NanaProductsPage({super.key, this.showTitle = true});

  final bool showTitle;

  @override
  State<NanaProductsPage> createState() => _NanaProductsPageState();
}

class _NanaProductsPageState extends State<NanaProductsPage> {
  final _query = TextEditingController();
  var _categoryId = 'all';
  var _view = NanaCatalogView.cards;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);
    final tablet = NanaLayout.isTablet(context);
    final needle = _query.text.trim().toLowerCase();
    final products = store.products.where((product) {
      if (_categoryId != 'all' && product.categoryId != _categoryId) return false;
      if (needle.isEmpty) return true;
      return product.name.toLowerCase().contains(needle) || (product.code ?? '').toLowerCase().contains(needle);
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(store),
        backgroundColor: NanaColors.pinkDark,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo'),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.showTitle)
            Padding(
              padding: EdgeInsets.fromLTRB(padding, 16, padding, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Productos', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink)),
                  const SizedBox(height: 4),
                  Text(
                    '${products.length} prendas en el catálogo',
                    style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted),
                  ),
                ],
              ),
            ),
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 0, padding, 10),
            child: NanaCatalogChrome(
              query: _query,
              hint: 'Buscar por nombre o código',
              view: _view,
              onView: (value) => setState(() => _view = value),
              onQuery: () => setState(() {}),
              categories: store.categories,
              categoryId: _categoryId,
              onCategory: (value) => setState(() => _categoryId = value),
            ),
          ),
          Expanded(
            child: store.loading
                ? const Center(child: CircularProgressIndicator())
                : store.error != null
                    ? Center(child: Text(store.error!, textAlign: TextAlign.center))
                    : products.isEmpty
                        ? const Center(child: Text('No hay productos en este filtro.'))
                        : _view == NanaCatalogView.cards
                            ? GridView.builder(
                                padding: EdgeInsets.fromLTRB(padding, 0, padding, 88),
                                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: tablet ? 3 : 2,
                                  mainAxisSpacing: 12,
                                  crossAxisSpacing: 12,
                                  childAspectRatio: tablet ? 0.78 : 0.68,
                                ),
                                itemCount: products.length,
                                itemBuilder: (context, index) {
                                  final product = products[index];
                                  return _ProductCard(
                                    product: product,
                                    categoryName: store.categoryById(product.categoryId)?.name,
                                    onTap: () => _openForm(store, product),
                                    onLongPress: () => _delete(store, product),
                                  );
                                },
                              )
                            : ListView.separated(
                                padding: EdgeInsets.fromLTRB(padding, 0, padding, 88),
                                itemCount: products.length,
                                separatorBuilder: (_, _) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  final product = products[index];
                                  return _ProductListTile(
                                    product: product,
                                    categoryName: store.categoryById(product.categoryId)?.name,
                                    onTap: () => _openForm(store, product),
                                    onDelete: () => _delete(store, product),
                                  );
                                },
                              ),
          ),
        ],
      ),
    );
  }

  Future<void> _openForm(NanaAdminStore store, [NanaProduct? product]) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NanaAdminStoreScope(
          store: store,
          child: NanaProductFormPage(product: product),
        ),
      ),
    );
  }

  Future<void> _delete(NanaAdminStore store, NanaProduct product) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar producto'),
        content: Text('¿Quitar “${product.name}” del catálogo?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await store.deleteProduct(product.id);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo eliminar.')));
    }
  }
}

class _ProductListTile extends StatelessWidget {
  const _ProductListTile({
    required this.product,
    required this.onTap,
    required this.onDelete,
    this.categoryName,
  });

  final NanaProduct product;
  final String? categoryName;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: ListTile(
        onTap: onTap,
        onLongPress: onDelete,
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            width: 52,
            height: 52,
            child: product.image == null || product.image!.isEmpty
                ? const ColoredBox(color: NanaColors.soft, child: Icon(Icons.checkroom_rounded, color: NanaColors.pinkDark))
                : Image.network(product.image!, fit: BoxFit.cover),
          ),
        ),
        title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(
          [
            ?categoryName,
            if (product.stock != null) 'Stock ${product.stock}',
            if (product.onSale) 'Oferta',
          ].join(' · '),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(formatPen(product.salePrice), style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
            IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline_rounded, color: NanaColors.muted)),
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap, this.categoryName, this.onLongPress});

  final NanaProduct product;
  final String? categoryName;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
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
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    product.image == null || product.image!.isEmpty
                        ? const ColoredBox(
                            color: NanaColors.soft,
                            child: Icon(Icons.checkroom_rounded, size: 42, color: NanaColors.pinkDark),
                          )
                        : Image.network(
                            product.image!,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const ColoredBox(
                              color: NanaColors.soft,
                              child: Icon(Icons.checkroom_rounded, size: 42, color: NanaColors.pinkDark),
                            ),
                          ),
                    if (product.pin)
                      const Positioned(
                        top: 8,
                        left: 8,
                        child: _Badge(label: 'Destacado', color: NanaColors.pinkDark),
                      ),
                    if (product.onSale)
                      const Positioned(
                        top: 8,
                        right: 8,
                        child: _Badge(label: 'Oferta', color: Color(0xFFD97706)),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        ?categoryName,
                        if (product.stock != null) 'Stock ${product.stock}',
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: NanaColors.muted),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      formatPen(product.salePrice),
                      style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark),
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

class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
      child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
    );
  }
}
