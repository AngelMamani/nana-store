import 'package:flutter/material.dart';

import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../shell/presentation/nana_admin_store.dart';
import '../../store/presentation/nana_catalog_chrome.dart';
import 'nana_receipt.dart';
import 'nana_receipt_printer.dart';

class NanaOrdersPage extends StatefulWidget {
  const NanaOrdersPage({super.key});

  @override
  State<NanaOrdersPage> createState() => _NanaOrdersPageState();
}

class _NanaOrdersPageState extends State<NanaOrdersPage> {
  final _query = TextEditingController();
  var _filter = 'todos';
  var _view = NanaCatalogView.list;

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
    final orders = store.orders.where((order) {
      if (_filter != 'todos' && order.status != _filter) return false;
      if (needle.isEmpty) return true;
      return order.customerName.toLowerCase().contains(needle) || order.channelLabel.toLowerCase().contains(needle);
    }).toList();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 16, padding, 8),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Pedidos', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: NanaColors.ink)),
                SizedBox(height: 4),
                Text('Ventas y reservas', style: TextStyle(fontWeight: FontWeight.w700, color: NanaColors.muted)),
              ],
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(padding, 0, padding, 10),
            child: NanaCatalogChrome(
              query: _query,
              hint: 'Buscar cliente o canal',
              view: _view,
              onView: (value) => setState(() => _view = value),
              onQuery: () => setState(() {}),
              showCategories: false,
              filters: const [
                ('todos', 'Todos'),
                ('nuevo', 'Nuevos'),
                ('reservado', 'Reservados'),
                ('atendido', 'Atendidos'),
              ],
              filterId: _filter,
              onFilter: (value) => setState(() => _filter = value),
            ),
          ),
          Expanded(
            child: orders.isEmpty
                ? const Center(child: Text('No hay pedidos en este filtro.'))
                : _view == NanaCatalogView.cards
                    ? GridView.builder(
                        padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: tablet ? 3 : 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 1.15,
                        ),
                        itemCount: orders.length,
                        itemBuilder: (context, index) {
                          final order = orders[index];
                          return Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(22),
                            child: InkWell(
                              onTap: () => _changeStatus(store, order),
                              borderRadius: BorderRadius.circular(22),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(order.customerName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                                    Text('${order.statusLabel} · ${order.channelLabel}'),
                                    const Spacer(),
                                    Text(formatPen(order.total), style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
                                    Text('${order.lineCount} prendas', style: const TextStyle(color: NanaColors.muted)),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: IconButton(
                                        tooltip: 'Imprimir boleta',
                                        onPressed: () => _print(store, order),
                                        icon: const Icon(Icons.print_rounded, color: NanaColors.pinkDark),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      )
                    : ListView.separated(
                        padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                        itemCount: orders.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final order = orders[index];
                          return Material(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            child: ListTile(
                              onTap: () => _changeStatus(store, order),
                              title: Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.ink)),
                              subtitle: Text('${order.statusLabel} · ${order.channelLabel} · ${order.lineCount} prendas'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    formatPen(order.total),
                                    style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark),
                                  ),
                                  IconButton(
                                    tooltip: 'Imprimir boleta',
                                    onPressed: () => _print(store, order),
                                    icon: const Icon(Icons.print_rounded, color: NanaColors.pinkDark),
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

  Future<void> _print(NanaAdminStore store, NanaOrder order) async {
    try {
      await printNanaReceipt(receiptFromOrder(store.storeProfile, order), context: context);
    } catch (error) {
      final message = '$error'.toLowerCase();
      if (message.contains('cancel')) return;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo imprimir la boleta.')));
    }
  }

  Future<void> _changeStatus(NanaAdminStore store, NanaOrder order) async {
    final next = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(title: Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w800))),
              for (final status in const ['nuevo', 'reservado', 'atendido', 'cancelado'])
                ListTile(
                  title: Text(NanaOrder.labelFor(status)),
                  onTap: () => Navigator.pop(context, status),
                ),
            ],
          ),
        );
      },
    );
    if (next == null || next == order.status) return;
    try {
      await store.setOrderStatus(order, next);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo actualizar el pedido.')));
    }
  }
}
