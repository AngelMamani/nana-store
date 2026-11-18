import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';
import 'nana_catalog_chrome.dart';

class NanaOffersPage extends StatefulWidget {
  const NanaOffersPage({super.key});

  @override
  State<NanaOffersPage> createState() => _NanaOffersPageState();
}

class _NanaOffersPageState extends State<NanaOffersPage> {
  final _query = TextEditingController();
  var _categoryId = 'all';
  var _filter = 'on';
  var _view = NanaCatalogView.cards;
  var _percent = 20;
  var _busy = false;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  List<NanaProduct> _visible(NanaAdminStore store) {
    final needle = _query.text.trim().toLowerCase();
    return store.products.where((product) {
      if (_categoryId != 'all' && product.categoryId != _categoryId) return false;
      if (_filter == 'on' && !product.onSale) return false;
      if (_filter == 'off' && product.onSale) return false;
      if (needle.isEmpty) return true;
      return product.name.toLowerCase().contains(needle);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final padding = NanaLayout.pagePadding(context);
    final tablet = NanaLayout.isTablet(context);
    final products = _visible(store);

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 12, padding, 8),
          child: Row(
            children: [
              for (final percent in const [10, 15, 20, 30, 50])
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text('$percent%'),
                    selected: _percent == percent,
                    onSelected: (_) => setState(() => _percent = percent),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 0, padding, 8),
          child: Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _busy ? null : () => _applyAll(store, products),
                  style: FilledButton.styleFrom(backgroundColor: NanaColors.pinkDark),
                  child: Text('Aplicar $_percent%'),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: _busy ? null : () => _clearAll(store, products),
                child: const Text('Quitar ofertas'),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 0, padding, 10),
          child: NanaCatalogChrome(
            query: _query,
            hint: 'Buscar producto',
            view: _view,
            onView: (value) => setState(() => _view = value),
            onQuery: () => setState(() {}),
            categories: store.categories,
            categoryId: _categoryId,
            onCategory: (value) => setState(() => _categoryId = value),
            filters: const [('on', 'En oferta'), ('off', 'Sin oferta'), ('all', 'Todos')],
            filterId: _filter,
            onFilter: (value) => setState(() => _filter = value),
          ),
        ),
        Expanded(
          child: products.isEmpty
              ? const Center(child: Text('No hay productos en este filtro.'))
              : _view == NanaCatalogView.cards
                  ? GridView.builder(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: tablet ? 3 : 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.86,
                      ),
                      itemCount: products.length,
                      itemBuilder: (context, index) => _OfferCard(
                        product: products[index],
                        onApply: () => _applyOne(store, products[index]),
                        onClear: () => _clearOne(store, products[index]),
                      ),
                    )
                  : ListView.separated(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      itemCount: products.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final product = products[index];
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          child: ListTile(
                            title: Text(product.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                            subtitle: Text(
                              product.onSale ? '${formatPen(product.price)} → ${formatPen(product.salePrice)}' : formatPen(product.price),
                            ),
                            trailing: product.onSale
                                ? TextButton(onPressed: () => _clearOne(store, product), child: const Text('Quitar'))
                                : TextButton(onPressed: () => _applyOne(store, product), child: Text('$_percent%')),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Future<void> _applyOne(NanaAdminStore store, NanaProduct product) async {
    final promo = product.price * (100 - _percent) / 100;
    try {
      await store.setProductOffer(product, promo);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo aplicar la oferta.')));
    }
  }

  Future<void> _clearOne(NanaAdminStore store, NanaProduct product) async {
    try {
      await store.setProductOffer(product, null);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo quitar la oferta.')));
    }
  }

  Future<void> _applyAll(NanaAdminStore store, List<NanaProduct> products) async {
    setState(() => _busy = true);
    try {
      for (final product in products) {
        await store.setProductOffer(product, product.price * (100 - _percent) / 100);
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudieron aplicar las ofertas.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _clearAll(NanaAdminStore store, List<NanaProduct> products) async {
    setState(() => _busy = true);
    try {
      for (final product in products) {
        await store.setProductOffer(product, null);
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudieron quitar las ofertas.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.product, required this.onApply, required this.onClear});

  final NanaProduct product;
  final VoidCallback onApply;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
            const Spacer(),
            Text(formatPen(product.price), style: TextStyle(decoration: product.onSale ? TextDecoration.lineThrough : null, color: NanaColors.muted)),
            Text(formatPen(product.salePrice), style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
            const SizedBox(height: 8),
            if (product.onSale)
              TextButton(onPressed: onClear, child: const Text('Quitar oferta'))
            else
              FilledButton(onPressed: onApply, child: const Text('Aplicar')),
          ],
        ),
      ),
    );
  }
}
