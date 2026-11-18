import 'package:flutter/material.dart';

import '../../../app/nana_navigator.dart';
import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../products/presentation/nana_barcode_scan_page.dart';
import '../../products/presentation/nana_product_form_page.dart';
import '../../session/presentation/session_scope.dart';
import '../../shell/presentation/nana_admin_store.dart';
import '../../store/presentation/nana_catalog_chrome.dart';
import 'nana_receipt.dart';
import 'nana_receipt_printer.dart';

class NanaStoreSalePage extends StatefulWidget {
  const NanaStoreSalePage({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<NanaStoreSalePage> createState() => _NanaStoreSalePageState();
}

class _NanaStoreSalePageState extends State<NanaStoreSalePage> {
  final _query = TextEditingController();
  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _note = TextEditingController();
  final _advance = TextEditingController();
  final _qty = <String, int>{};
  var _payMethod = 'efectivo';
  var _paymentMode = 'contado';
  var _busy = false;
  var _categoryId = 'all';
  var _view = NanaCatalogView.cards;

  @override
  void dispose() {
    _query.dispose();
    _customerName.dispose();
    _customerPhone.dispose();
    _note.dispose();
    _advance.dispose();
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
    final lines = store.products.where((product) => (_qty[product.id] ?? 0) > 0).map((product) {
      return (product: product, quantity: _qty[product.id]!);
    }).toList();
    final total = lines.fold<double>(0, (acc, line) => acc + line.product.salePrice * line.quantity);
    final units = lines.fold<int>(0, (acc, line) => acc + line.quantity);

    final content = Column(
      children: [
        if (widget.embedded)
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 16, padding, 0),
            child: const Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Venta', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink)),
                  SizedBox(height: 4),
                  Text('Caja de tienda', style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted)),
                ],
              ),
            ),
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 12, padding, 8),
          child: NanaCatalogChrome(
            query: _query,
            hint: 'Buscar prenda o código',
            view: _view,
            onView: (value) => setState(() => _view = value),
            onQuery: () => setState(() {}),
            categories: store.categories,
            categoryId: _categoryId,
            onCategory: (value) => setState(() => _categoryId = value),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 0, padding, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _PayChip(
                    label: 'Contado',
                    icon: Icons.point_of_sale_rounded,
                    selected: _paymentMode == 'contado',
                    onTap: () => setState(() => _paymentMode = 'contado'),
                  ),
                  _PayChip(
                    label: 'Contra entrega',
                    icon: Icons.schedule_rounded,
                    selected: _paymentMode == 'contraEntrega',
                    onTap: () => setState(() => _paymentMode = 'contraEntrega'),
                  ),
                  _PayChip(
                    label: 'Efectivo',
                    icon: Icons.payments_outlined,
                    selected: _payMethod == 'efectivo',
                    onTap: () => setState(() => _payMethod = 'efectivo'),
                  ),
                  _PayChip(
                    label: 'Yape',
                    icon: Icons.qr_code_rounded,
                    selected: _payMethod == 'yape',
                    onTap: () => setState(() => _payMethod = 'yape'),
                  ),
                  _PayChip(
                    label: 'POS58',
                    icon: Icons.print_rounded,
                    selected: false,
                    onTap: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      try {
                        await connectNanaPrinter(context);
                        messenger.showSnackBar(const SnackBar(content: Text('POS58 vinculada.')));
                      } catch (error) {
                        if ('$error'.toLowerCase().contains('cancel')) return;
                        messenger.showSnackBar(const SnackBar(content: Text('No se pudo vincular la POS58.')));
                      }
                    },
                  ),
                ],
              ),
              if (_paymentMode == 'contraEntrega') ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _customerName,
                        decoration: const InputDecoration(
                          hintText: 'Cliente',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _customerPhone,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          hintText: 'Celular',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _advance,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          hintText: 'Adelanto S/',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _note,
                        decoration: const InputDecoration(
                          hintText: 'Nota',
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderSide: BorderSide.none),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 6),
              Text(
                units == 0 ? 'Carrito vacío' : '$units en carrito',
                style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.muted),
              ),
            ],
          ),
        ),
        Expanded(
          child: products.isEmpty
              ? const Center(child: Text('No hay prendas en este filtro.'))
              : _view == NanaCatalogView.cards
                  ? GridView.builder(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 12),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: tablet ? 3 : 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: tablet ? 0.78 : 0.68,
                      ),
                      itemCount: products.length,
                      itemBuilder: (context, index) {
                        final product = products[index];
                        return _SaleCard(
                          product: product,
                          categoryName: store.categoryById(product.categoryId)?.name,
                          quantity: _qty[product.id] ?? 0,
                          onMinus: () => _changeQty(product, -1),
                          onPlus: () => _changeQty(product, 1),
                          onOpen: () => _showProduct(store, product),
                        );
                      },
                    )
                  : ListView.separated(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 12),
                      itemCount: products.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final product = products[index];
                        return _SaleListTile(
                          product: product,
                          categoryName: store.categoryById(product.categoryId)?.name,
                          quantity: _qty[product.id] ?? 0,
                          onMinus: () => _changeQty(product, -1),
                          onPlus: () => _changeQty(product, 1),
                          onOpen: () => _showProduct(store, product),
                        );
                      },
                    ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: EdgeInsets.fromLTRB(padding, 8, padding, widget.embedded ? 8 : 16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : () => _scan(store),
                    icon: const Icon(Icons.qr_code_scanner_rounded),
                    label: const Text('Escanear'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      foregroundColor: NanaColors.pinkDark,
                      side: const BorderSide(color: NanaColors.pinkDark),
                      textStyle: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: _busy || lines.isEmpty ? null : () => _save(store, lines),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                      backgroundColor: NanaColors.pinkDark,
                    ),
                    child: Text(
                      _busy
                          ? 'Guardando…'
                          : _paymentMode == 'contraEntrega'
                              ? 'Reservar ${formatPen(total)}'
                              : 'Cobrar ${formatPen(total)}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );

    if (widget.embedded) {
      return SafeArea(child: content);
    }

    return Scaffold(
      backgroundColor: NanaColors.cream,
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: NanaColors.ink,
        title: const Text('Venta en tienda', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: content,
    );
  }

  void _changeQty(NanaProduct product, int delta) {
    setState(() {
      final next = (_qty[product.id] ?? 0) + delta;
      if (next <= 0) {
        _qty.remove(product.id);
      } else {
        _qty[product.id] = next;
      }
    });
  }

  Future<void> _scan(NanaAdminStore store) async {
    final code = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const NanaBarcodeScanPage()),
    );
    if (!mounted || code == null || code.trim().isEmpty) return;
    final product = store.productByCode(code);
    if (product != null) {
      await _showProduct(store, product, scannedCode: code);
      return;
    }
    final create = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Producto no registrado'),
        content: Text('El código “$code” no está en el catálogo. ¿Agregarlo ahora?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Agregar')),
        ],
      ),
    );
    if (create != true || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => NanaAdminStoreScope(
          store: store,
          child: NanaProductFormPage(initialCode: code.trim()),
        ),
      ),
    );
  }

  Future<void> _showProduct(NanaAdminStore store, NanaProduct product, {String? scannedCode}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: NanaColors.cream,
      builder: (context) {
        return _SaleProductSheet(
          product: product,
          categoryName: store.categoryById(product.categoryId)?.name,
          scannedCode: scannedCode,
          quantity: _qty[product.id] ?? 0,
          onAdd: () {
            _changeQty(product, 1);
            Navigator.pop(context);
          },
        );
      },
    );
  }

  Future<void> _save(NanaAdminStore store, List<({NanaProduct product, int quantity})> lines) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(NanaNavigator.key.currentContext ?? context);
    final createdAt = DateTime.now();
    final total = lines.fold<double>(0, (acc, line) => acc + line.product.salePrice * line.quantity);
    final advance = double.tryParse(_advance.text.replaceAll(',', '.')) ?? 0;
    try {
      await store.recordStoreSale(
        cashierEmail: SessionScope.of(context).user?.email ?? '',
        lines: lines,
        payMethod: _payMethod,
        paymentMode: _paymentMode,
        customerName: _paymentMode == 'contraEntrega' ? _customerName.text : 'Tienda',
        customerPhone: _customerPhone.text,
        note: _note.text,
        advance: advance,
      );
      if (!mounted) return;
      setState(() => _qty.clear());
      if (!widget.embedded) Navigator.of(context).pop();
      messenger.showSnackBar(
        SnackBar(content: Text(_paymentMode == 'contraEntrega' ? 'Pedido reservado.' : 'Venta registrada.')),
      );
      try {
        await printNanaReceipt(
          receiptFromSale(
            store: store.storeProfile,
            createdAt: createdAt,
            customerName: _paymentMode == 'contraEntrega' ? _customerName.text : 'Tienda',
            customerPhone: _customerPhone.text,
            note: _note.text,
            lines: lines,
            total: total,
            payMethod: _payMethod,
            paymentMode: _paymentMode,
            advance: advance,
          ),
          context: context,
        );
      } catch (error) {
        final message = '$error'.toLowerCase();
        if (message.contains('cancel')) return;
        messenger.showSnackBar(const SnackBar(content: Text('La venta se guardó, pero no se imprimió la boleta.')));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo guardar la venta.')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _PayChip extends StatelessWidget {
  const _PayChip({required this.label, required this.icon, required this.selected, required this.onTap});

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      avatar: Icon(icon, size: 18, color: selected ? NanaColors.pinkDark : NanaColors.muted),
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
      selectedColor: NanaColors.pink.withValues(alpha: 0.22),
      checkmarkColor: NanaColors.pinkDark,
      labelStyle: TextStyle(fontWeight: FontWeight.w800, color: selected ? NanaColors.pinkDark : NanaColors.ink),
    );
  }
}

class _QtyStepper extends StatelessWidget {
  const _QtyStepper({required this.quantity, required this.onMinus, required this.onPlus});

  final int quantity;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: NanaColors.soft,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: quantity == 0 ? null : onMinus,
            icon: const Icon(Icons.remove_rounded),
          ),
          Text('$quantity', style: const TextStyle(fontWeight: FontWeight.w800)),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: onPlus,
            icon: const Icon(Icons.add_rounded, color: NanaColors.pinkDark),
          ),
        ],
      ),
    );
  }
}

class _SaleListTile extends StatelessWidget {
  const _SaleListTile({
    required this.product,
    required this.quantity,
    required this.onMinus,
    required this.onPlus,
    required this.onOpen,
    this.categoryName,
  });

  final NanaProduct product;
  final String? categoryName;
  final int quantity;
  final VoidCallback onMinus;
  final VoidCallback onPlus;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: ListTile(
        onTap: onOpen,
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(width: 52, height: 52, child: _ProductThumb(url: product.image)),
        ),
        title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(
          [
            formatPen(product.salePrice),
            ?categoryName,
            if (product.code != null && product.code!.isNotEmpty) product.code!,
          ].join(' · '),
        ),
        trailing: _QtyStepper(quantity: quantity, onMinus: onMinus, onPlus: onPlus),
      ),
    );
  }
}

class _SaleCard extends StatelessWidget {
  const _SaleCard({
    required this.product,
    required this.quantity,
    required this.onMinus,
    required this.onPlus,
    required this.onOpen,
    this.categoryName,
  });

  final NanaProduct product;
  final String? categoryName;
  final int quantity;
  final VoidCallback onMinus;
  final VoidCallback onPlus;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(22),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: quantity > 0 ? NanaColors.pinkDark : NanaColors.line.withValues(alpha: 0.8)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: _ProductThumb(url: product.image)),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(
                      [
                        ?categoryName,
                        if (product.stock != null) 'Stock ${product.stock}',
                      ].join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: NanaColors.muted),
                    ),
                    const SizedBox(height: 4),
                    Text(formatPen(product.salePrice), style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerRight,
                      child: _QtyStepper(quantity: quantity, onMinus: onMinus, onPlus: onPlus),
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

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({this.url});

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

class _SaleProductSheet extends StatelessWidget {
  const _SaleProductSheet({
    required this.product,
    required this.onAdd,
    required this.quantity,
    this.categoryName,
    this.scannedCode,
  });

  final NanaProduct product;
  final String? categoryName;
  final String? scannedCode;
  final int quantity;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final gallery = product.gallery.isNotEmpty ? product.gallery : [if (product.image != null) product.image!];
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.paddingOf(context).bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (gallery.isNotEmpty)
              SizedBox(
                height: 180,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: gallery.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Image.network(gallery[index], width: 180, fit: BoxFit.cover),
                    );
                  },
                ),
              ),
            const SizedBox(height: 14),
            Text(product.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: NanaColors.ink)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (scannedCode != null) _InfoChip(label: 'Escaneado $scannedCode'),
                if (product.code != null && product.code!.isNotEmpty) _InfoChip(label: 'Código ${product.code}'),
                if (categoryName != null) _InfoChip(label: categoryName!),
                if (product.pin) const _InfoChip(label: 'Destacado'),
                if (product.onSale) const _InfoChip(label: 'Oferta'),
                if (product.stock != null) _InfoChip(label: 'Stock ${product.stock}'),
              ],
            ),
            const SizedBox(height: 12),
            Text(formatPen(product.salePrice), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
            if (product.onSale)
              Text(formatPen(product.price), style: const TextStyle(decoration: TextDecoration.lineThrough, color: NanaColors.muted)),
            if (product.cost != null) Text('Costo ${formatPen(product.cost!)}', style: const TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted)),
            if (product.description != null && product.description!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(product.description!, style: const TextStyle(fontWeight: FontWeight.w600, color: NanaColors.ink)),
            ],
            if (product.colors.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text('Colores: ${product.colors.join(', ')}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
            if (product.sizes.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('Tallas: ${product.sizes.join(', ')}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onAdd,
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                backgroundColor: NanaColors.pinkDark,
              ),
              child: Text(quantity == 0 ? 'Agregar a la venta' : 'Agregar otra unidad ($quantity)'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: NanaColors.soft, borderRadius: BorderRadius.circular(99)),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: NanaColors.pinkDark)),
    );
  }
}
