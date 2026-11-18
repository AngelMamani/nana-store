import '../../shell/presentation/nana_admin_store.dart';

class NanaReceiptLine {
  const NanaReceiptLine({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.net,
    this.detail = '',
  });

  final String name;
  final String detail;
  final int quantity;
  final double unitPrice;
  final double net;
}

class NanaReceiptTicket {
  const NanaReceiptTicket({
    required this.storeName,
    required this.storeLogo,
    required this.storeAddress,
    required this.storePhone,
    required this.createdAt,
    required this.printedAt,
    required this.customerName,
    required this.customerPhone,
    required this.lines,
    required this.subtotal,
    required this.total,
    required this.payLabel,
    required this.note,
    required this.reserved,
    this.advance = 0,
    this.balance = 0,
  });

  final String storeName;
  final String storeLogo;
  final String storeAddress;
  final String storePhone;
  final DateTime createdAt;
  final DateTime printedAt;
  final String customerName;
  final String customerPhone;
  final List<NanaReceiptLine> lines;
  final double subtotal;
  final double total;
  final double advance;
  final double balance;
  final String payLabel;
  final String note;
  final bool reserved;
}

const _width = 32;

String _fit(String text, int size) {
  final value = text.replaceAll(RegExp(r'\s+'), ' ').trim();
  if (value.length <= size) return value;
  return '${value.substring(0, size - 1)}.';
}

String _padRow(String left, String right, int size) {
  final gap = size - left.length - right.length;
  if (gap >= 1) return '$left${' ' * gap}$right';
  return '${_fit(left, size - right.length - 1)} $right';
}

List<String> _wrap(String text, int size) {
  final words = text.split(' ').where((word) => word.isNotEmpty);
  final lines = <String>[];
  var current = '';
  for (final word in words) {
    final next = current.isEmpty ? word : '$current $word';
    if (next.length <= size) {
      current = next;
      continue;
    }
    if (current.isNotEmpty) lines.add(current);
    current = word.length <= size ? word : _fit(word, size);
  }
  if (current.isNotEmpty) lines.add(current);
  return lines;
}

String _formatWhen(DateTime value) {
  final date = value.toLocal();
  String two(int number) => number.toString().padLeft(2, '0');
  return '${two(date.day)}/${two(date.month)}/${date.year} ${two(date.hour)}:${two(date.minute)}';
}

String _payLabel(String paymentMode, String? payMethod) {
  final mode = paymentMode == 'contraEntrega' ? 'Contra entrega' : 'Contado';
  if (payMethod == 'yape') return '$mode · Yape';
  if (payMethod == 'efectivo') return '$mode · Efectivo';
  return mode;
}

NanaReceiptTicket receiptFromSale({
  required NanaStoreProfile store,
  required DateTime createdAt,
  required String customerName,
  required List<({NanaProduct product, int quantity})> lines,
  required double total,
  required String payMethod,
  String paymentMode = 'contado',
  String customerPhone = '',
  String note = '',
  double advance = 0,
}) {
  final reserved = paymentMode == 'contraEntrega';
  final paid = reserved ? advance.clamp(0, total).toDouble() : total;
  return NanaReceiptTicket(
    storeName: store.name.trim().isEmpty ? 'NaNa' : store.name.trim(),
    storeLogo: store.logo.trim(),
    storeAddress: store.address.trim(),
    storePhone: store.whatsapp.trim().isNotEmpty ? store.whatsapp.trim() : store.phone.trim(),
    createdAt: createdAt,
    printedAt: DateTime.now(),
    customerName: customerName.trim().isEmpty ? (reserved ? 'Cliente de tienda' : 'Tienda') : customerName.trim(),
    customerPhone: customerPhone.trim(),
    lines: [
      for (final line in lines)
        NanaReceiptLine(
          name: line.product.name,
          quantity: line.quantity,
          unitPrice: line.product.salePrice,
          net: line.product.salePrice * line.quantity,
        ),
    ],
    subtotal: total,
    total: total,
    advance: paid,
    balance: reserved ? (total - paid).clamp(0, total).toDouble() : 0,
    payLabel: _payLabel(paymentMode, payMethod),
    note: note,
    reserved: reserved,
  );
}

NanaReceiptTicket receiptFromOrder(NanaStoreProfile store, NanaOrder order) {
  final reserved = order.status == 'reservado' || order.paymentMode == 'contraEntrega';
  final subtotal = order.lines.fold<double>(0, (acc, line) => acc + line.net);
  return NanaReceiptTicket(
    storeName: store.name.trim().isEmpty ? 'NaNa' : store.name.trim(),
    storeLogo: store.logo.trim(),
    storeAddress: store.address.trim(),
    storePhone: store.whatsapp.trim().isNotEmpty ? store.whatsapp.trim() : store.phone.trim(),
    createdAt: order.createdAt,
    printedAt: DateTime.now(),
    customerName: order.customerName.trim().isEmpty ? 'Cliente' : order.customerName.trim(),
    customerPhone: order.customerPhone.trim(),
    lines: [
      for (final line in order.lines)
        NanaReceiptLine(
          name: line.name,
          detail: line.detail,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          net: line.net,
        ),
    ],
    subtotal: subtotal == 0 ? order.total : subtotal,
    total: order.total,
    payLabel: _payLabel(order.paymentMode, order.payMethod),
    note: order.note,
    reserved: reserved,
    advance: order.advance,
    balance: reserved ? (order.total - order.advance).clamp(0, order.total).toDouble() : 0,
  );
}

List<String> receiptBodyLines(NanaReceiptTicket ticket, {int columns = _width}) {
  final rule = '-' * columns;
  final lines = <String>[
    rule,
    'Venta: ${_formatWhen(ticket.createdAt)}',
    'Impreso: ${_formatWhen(ticket.printedAt)}',
  ];
  if (ticket.storeAddress.isNotEmpty) lines.addAll(_wrap(ticket.storeAddress, columns));
  if (ticket.storePhone.isNotEmpty) lines.add('Tel: ${ticket.storePhone}');
  lines.add(rule);
  lines.add(_fit('Cliente: ${ticket.customerName}', columns));
  if (ticket.customerPhone.isNotEmpty) lines.add('Cel: ${ticket.customerPhone}');
  if (ticket.reserved) lines.add('Estado: RESERVADO');
  lines.add(rule);
  for (final line in ticket.lines) {
    final qty = '${line.quantity}x ';
    final amount = formatPen(line.net);
    final name = _fit(line.name, columns - qty.length - amount.length - 1);
    lines.add(_padRow('$qty$name', amount, columns));
    if (line.detail.isNotEmpty) {
      lines.add('  ${_fit(line.detail.replaceAll('·', '-'), columns - 2)}');
    }
  }
  lines.add(rule);
  lines.add(_padRow('TOTAL', formatPen(ticket.total), columns));
  if (ticket.reserved) {
    lines.add(_padRow('Adelanto', formatPen(ticket.advance), columns));
    lines.add(_padRow('Saldo', formatPen(ticket.balance), columns));
  }
  lines.addAll(_wrap(ticket.payLabel, columns));
  if (ticket.note.isNotEmpty) {
    lines.add(rule);
    lines.addAll(_wrap('Nota: ${ticket.note}', columns));
  }
  lines.add(rule);
  lines.add('Gracias por su compra');
  lines.add('Vuelva pronto');
  return lines;
}
