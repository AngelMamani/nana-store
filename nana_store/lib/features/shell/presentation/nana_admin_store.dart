import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

class NanaCategory {
  const NanaCategory({required this.id, required this.name, this.slug = '', this.order = 0});

  final String id;
  final String name;
  final String slug;
  final int order;
}

class NanaProduct {
  const NanaProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.promotionalPrice,
    required this.pin,
    required this.stock,
    required this.createdAt,
    required this.rank,
    this.image,
    this.code,
    this.categoryId,
    this.description,
    this.cost,
    this.video,
    this.gallery = const [],
    this.colors = const [],
    this.sizes = const [],
    this.stocks = const {},
    this.previousVariants = const [],
  });

  final String id;
  final String name;
  final String? image;
  final String? code;
  final String? categoryId;
  final String? description;
  final double price;
  final double? promotionalPrice;
  final double? cost;
  final bool pin;
  final int rank;
  final int? stock;
  final DateTime? createdAt;
  final String? video;
  final List<String> gallery;
  final List<String> colors;
  final List<String> sizes;
  final Map<String, int?> stocks;
  final List<Map<String, dynamic>> previousVariants;

  double get salePrice => promotionalPrice ?? price;
  bool get onSale => promotionalPrice != null && promotionalPrice! < price;
}

String variantOptionKey(List<Map<String, String>> options) {
  final copy = [...options]..sort((left, right) => (left['name'] ?? '').compareTo(right['name'] ?? ''));
  return copy.map((option) => '${option['name']}:${option['title']}').join('|');
}

({List<Map<String, Object?>> variations, List<Map<String, Object?>> variants}) rebuildProductVariants({
  required String productId,
  required double price,
  required double? promotionalPrice,
  required List<String> colors,
  required List<String> sizes,
  required List<Map<String, dynamic>> previous,
  required Map<String, String> stocks,
}) {
  final cleanColors = [...{for (final item in colors.map((value) => value.trim())) if (item.isNotEmpty) item}];
  final cleanSizes = [...{for (final item in sizes.map((value) => value.trim())) if (item.isNotEmpty) item}];
  final variations = <Map<String, Object?>>[];
  if (cleanColors.isNotEmpty) {
    variations.add({
      'id': '$productId-color',
      'name': 'Color',
      'isPrimary': true,
      'options': [for (final title in cleanColors) {'title': title, 'image': null}],
    });
  }
  if (cleanSizes.isNotEmpty) {
    variations.add({
      'id': '$productId-size',
      'name': 'Tamaño',
      'isPrimary': cleanColors.isEmpty,
      'options': [for (final title in cleanSizes) {'title': title, 'image': null}],
    });
  }
  final colorList = cleanColors.isEmpty ? <String?>[null] : cleanColors.cast<String?>();
  final sizeList = cleanSizes.isEmpty ? <String?>[null] : cleanSizes.cast<String?>();
  final variants = <Map<String, Object?>>[];
  var index = 0;
  for (final color in colorList) {
    for (final size in sizeList) {
      final options = <Map<String, String>>[
        if (color != null) {'name': 'Color', 'title': color},
        if (size != null) {'name': 'Tamaño', 'title': size},
      ];
      if (options.isEmpty) continue;
      final key = variantOptionKey(options);
      Map<String, dynamic>? matched;
      for (final item in previous) {
        final itemOptions = item['options'];
        if (itemOptions is! List) continue;
        final mapped = [
          for (final option in itemOptions)
            if (option is Map) {'name': '${option['name']}', 'title': '${option['title']}'},
        ];
        if (variantOptionKey(mapped) == key) {
          matched = item;
          break;
        }
      }
      final raw = stocks[key];
      final amount = raw == null || raw.trim().isEmpty ? null : int.tryParse(raw.trim());
      variants.add({
        'id': matched?['id'] ?? '$productId-v-$index',
        'price': matched?['price'] ?? price,
        'promotionalPrice': matched?['promotionalPrice'] ?? promotionalPrice,
        'image': matched?['image'],
        'stock': amount ?? matched?['stock'],
        'options': options,
      });
      index += 1;
    }
  }
  return (variations: variations, variants: variants);
}

class NanaOrderLine {
  const NanaOrderLine({
    required this.name,
    required this.quantity,
    required this.unitPrice,
    this.productId = '',
    this.detail = '',
  });

  final String productId;
  final String name;
  final int quantity;
  final double unitPrice;
  final String detail;

  double get net => unitPrice * quantity;
}

class NanaOrder {
  const NanaOrder({
    required this.id,
    required this.createdAt,
    required this.customerName,
    required this.total,
    required this.status,
    required this.channel,
    required this.lineCount,
    this.customerPhone = '',
    this.note = '',
    this.payMethod,
    this.paymentMode = 'contado',
    this.advance = 0,
    this.lines = const [],
  });

  final String id;
  final DateTime createdAt;
  final String customerName;
  final String customerPhone;
  final double total;
  final String status;
  final String channel;
  final int lineCount;
  final String note;
  final String? payMethod;
  final String paymentMode;
  final double advance;
  final List<NanaOrderLine> lines;

  String get statusLabel => labelFor(status);

  static String labelFor(String status) {
    switch (status) {
      case 'nuevo':
        return 'Nuevo';
      case 'reservado':
        return 'Reservado';
      case 'atendido':
        return 'Atendido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  }

  String get channelLabel => channel == 'tienda' ? 'Tienda' : 'WhatsApp';
}

class NanaStoreUser {
  const NanaStoreUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.createdAt,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String? createdAt;
}

class NanaStoreProfile {
  const NanaStoreProfile({
    this.name = 'NaNa',
    this.logo = '',
    this.banner = '',
    this.address = '',
    this.phone = '',
    this.whatsapp = '',
    this.email = '',
    this.videos = const {},
  });

  final String name;
  final String logo;
  final String banner;
  final String address;
  final String phone;
  final String whatsapp;
  final String email;
  final Map<String, Map<String, dynamic>> videos;
}

class NanaAdminStore extends ChangeNotifier {
  NanaAdminStore({FirebaseFirestore? firestore}) : _dbOverride = firestore;

  final FirebaseFirestore? _dbOverride;
  FirebaseFirestore get _db => _dbOverride ?? FirebaseFirestore.instance;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _productsSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _categoriesSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _ordersSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _usersSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _storeSub;

  var loading = true;
  String? error;
  List<NanaProduct> products = const [];
  List<NanaCategory> categories = const [];
  List<NanaOrder> orders = const [];
  List<NanaStoreUser> users = const [];
  NanaStoreProfile storeProfile = const NanaStoreProfile();

  int get reservedCount => orders.where((order) => order.status == 'reservado').length;
  int get newCount => orders.where((order) => order.status == 'nuevo').length;
  int get lowStockCount => products.where((product) => product.stock != null && product.stock! <= 2).length;

  void start() {
    _categoriesSub = _db.collection('catalog_categories').snapshots().listen(_onCategories, onError: _onError);
    _productsSub = _db.collection('catalog_products').snapshots().listen(_onProducts, onError: _onError);
    _ordersSub = _db.collection('catalog_orders').snapshots().listen(_onOrders, onError: _onError);
    _usersSub = _db.collection('users').snapshots().listen(_onUsers, onError: _onError);
    _storeSub = _db.collection('catalog_store').doc('profile').snapshots().listen(_onStore, onError: _onError);
  }

  NanaProduct? productByCode(String? code) {
    final needle = (code ?? '').trim().toLowerCase();
    if (needle.isEmpty) return null;
    for (final product in products) {
      final own = (product.code ?? '').trim().toLowerCase();
      if (own.isNotEmpty && own == needle) return product;
      if (product.id.toLowerCase() == needle) return product;
    }
    return null;
  }

  NanaCategory? categoryById(String? id) {
    if (id == null) return null;
    for (final category in categories) {
      if (category.id == id) return category;
    }
    return null;
  }

  Future<void> saveProduct({
    NanaProduct? existing,
    String? id,
    required String name,
    required double price,
    required List<String> gallery,
    required List<String> colors,
    required List<String> sizes,
    required Map<String, String> stocks,
    String? code,
    String? description,
    String? categoryId,
    String? video,
    double? promotionalPrice,
    double? cost,
    bool pin = false,
  }) async {
    final productId = existing?.id ?? id ?? 'prd_${DateTime.now().millisecondsSinceEpoch}';
    final siblings = products.where((item) => item.categoryId == categoryId);
    final nextRank = existing?.rank ??
        (siblings.isEmpty ? -1 : siblings.map((item) => item.rank).reduce((left, right) => left < right ? left : right) - 1);
    final built = rebuildProductVariants(
      productId: productId,
      price: price,
      promotionalPrice: promotionalPrice,
      colors: colors,
      sizes: sizes,
      previous: existing?.previousVariants ?? const [],
      stocks: stocks,
    );
    await _db.collection('catalog_products').doc(productId).set({
      'id': productId,
      'name': name.trim(),
      'description': (description ?? '').trim().isEmpty ? null : description!.trim(),
      'code': (code ?? '').trim().isEmpty ? null : code!.trim(),
      'categoryId': (categoryId ?? '').isEmpty ? null : categoryId,
      'image': gallery.isEmpty ? null : gallery.first,
      'gallery': gallery,
      'video': video,
      'price': price,
      'promotionalPrice': promotionalPrice,
      'cost': cost,
      'pin': pin,
      'rank': nextRank,
      'createdAt': existing?.createdAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
      'variations': built.variations,
      'variants': built.variants,
    });
  }

  Future<void> deleteProduct(String id) {
    return _db.collection('catalog_products').doc(id).delete();
  }

  Future<void> setProductOffer(NanaProduct product, double? promotionalPrice) {
    return _db.collection('catalog_products').doc(product.id).set({
      'promotionalPrice': promotionalPrice ?? FieldValue.delete(),
    }, SetOptions(merge: true));
  }

  Future<void> updateProductStock(NanaProduct product, int stock) {
    final variants = [
      for (final variant in product.previousVariants)
        {...Map<String, dynamic>.from(variant), 'stock': stock},
    ];
    if (variants.isEmpty) {
      return _db.collection('catalog_products').doc(product.id).set({
        'stock': stock,
      }, SetOptions(merge: true));
    }
    return _db.collection('catalog_products').doc(product.id).set({
      'variants': variants,
    }, SetOptions(merge: true));
  }

  Future<void> saveCategory({String? id, required String name, int? order}) {
    final trimmed = name.trim();
    final catId = id ?? 'cat_${DateTime.now().millisecondsSinceEpoch}';
    final slug = trimmed
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9áéíóúñü\s-]'), '')
        .trim()
        .replaceAll(RegExp(r'\s+'), '-');
    final nextOrder = order ??
        (categories.isEmpty ? 1 : categories.map((item) => item.order).reduce((left, right) => left > right ? left : right) + 1);
    return _db.collection('catalog_categories').doc(catId).set({
      'id': catId,
      'name': trimmed,
      'slug': slug,
      'order': nextOrder,
    });
  }

  Future<void> deleteCategory(String id) {
    return _db.collection('catalog_categories').doc(id).delete();
  }

  Future<void> updateUserRole(String id, String role) {
    return _db.collection('users').doc(id).set({'role': role}, SetOptions(merge: true));
  }

  Future<void> saveStoreProfile(NanaStoreProfile profile) {
    return _db.collection('catalog_store').doc('profile').set({
      'name': profile.name,
      'address': profile.address,
      'phone': profile.phone,
      'whatsapp': profile.whatsapp,
      'email': profile.email,
      'logo': profile.logo,
      'banner': profile.banner,
    }, SetOptions(merge: true));
  }

  Future<void> saveStoreVideo(String key, {String? url, bool? enabled}) {
    final current = Map<String, Map<String, dynamic>>.from(storeProfile.videos);
    final slot = Map<String, dynamic>.from(current[key] ?? {'enabled': true});
    if (url != null) slot['url'] = url;
    if (enabled != null) slot['enabled'] = enabled;
    current[key] = slot;
    return _db.collection('catalog_store').doc('profile').set({
      'videos': current,
    }, SetOptions(merge: true));
  }

  Future<void> setOrderStatus(NanaOrder order, String status) async {
    await _db.collection('catalog_orders').doc(order.id).set({
      'status': status,
      if (status == 'atendido') 'closedAt': DateTime.now().toIso8601String(),
    }, SetOptions(merge: true));
  }

  Future<void> recordStoreSale({
    required String cashierEmail,
    required List<({NanaProduct product, int quantity})> lines,
    required String payMethod,
    String paymentMode = 'contado',
    String customerName = 'Tienda',
    String customerPhone = '',
    String note = '',
    double advance = 0,
  }) async {
    if (lines.isEmpty) {
      throw StateError('Agrega al menos una prenda.');
    }
    final orderLines = [
      for (final line in lines)
        {
          'productId': line.product.id,
          'name': line.product.name,
          'quantity': line.quantity,
          'unitPrice': line.product.salePrice,
          'options': <Map<String, String>>[],
        },
    ];
    final total = lines.fold<double>(0, (acc, line) => acc + line.product.salePrice * line.quantity);
    final reserved = paymentMode == 'contraEntrega';
    final paid = reserved ? advance.clamp(0, total).toDouble() : total;
    final now = DateTime.now().toIso8601String();
    final id = 'ord_${DateTime.now().millisecondsSinceEpoch}';
    await _db.collection('catalog_orders').doc(id).set({
      'id': id,
      'createdAt': now,
      if (!reserved) 'closedAt': now,
      'customerName': customerName.trim().isEmpty ? 'Cliente de tienda' : customerName.trim(),
      'customerEmail': cashierEmail,
      'customerPhone': customerPhone.trim(),
      'total': total,
      'status': reserved ? 'reservado' : 'atendido',
      'note': note.trim(),
      'lines': orderLines,
      'channel': 'tienda',
      'paymentMode': paymentMode,
      'payMethod': payMethod,
      'advance': paid,
    });
    for (final line in lines) {
      if (line.product.stock == null) continue;
      await updateProductStock(line.product, (line.product.stock! - line.quantity).clamp(0, 999999).toInt());
    }
  }

  int reservedUnitsFor(String productId) {
    var units = 0;
    for (final order in orders) {
      if (order.status != 'reservado' && order.status != 'nuevo') continue;
      for (final line in order.lines) {
        if (line.productId == productId) units += line.quantity;
      }
    }
    return units;
  }

  void _onCategories(QuerySnapshot<Map<String, dynamic>> snap) {
    final next = snap.docs.map((doc) {
      final data = doc.data();
      return NanaCategory(
        id: doc.id,
        name: (data['name'] ?? 'Categoría').toString(),
        slug: (data['slug'] ?? '').toString(),
        order: data['order'] is num ? (data['order'] as num).toInt() : 0,
      );
    }).toList()
      ..sort((left, right) {
        final byOrder = left.order.compareTo(right.order);
        return byOrder != 0 ? byOrder : left.name.compareTo(right.name);
      });
    categories = next;
    notifyListeners();
  }

  void _onProducts(QuerySnapshot<Map<String, dynamic>> snap) {
    final next = snap.docs.map((doc) => _productFrom(doc.id, doc.data())).toList()
      ..sort((left, right) {
        final pin = (right.pin ? 1 : 0) - (left.pin ? 1 : 0);
        if (pin != 0) return pin;
        final leftTime = left.createdAt?.millisecondsSinceEpoch ?? 0;
        final rightTime = right.createdAt?.millisecondsSinceEpoch ?? 0;
        return rightTime.compareTo(leftTime);
      });
    products = next;
    loading = false;
    error = null;
    notifyListeners();
  }

  void _onOrders(QuerySnapshot<Map<String, dynamic>> snap) {
    final next = snap.docs.map((doc) => _orderFrom(doc.id, doc.data())).toList()
      ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
    orders = next;
    notifyListeners();
  }

  void _onUsers(QuerySnapshot<Map<String, dynamic>> snap) {
    users = snap.docs.map((doc) {
      final data = doc.data();
      return NanaStoreUser(
        id: doc.id,
        name: (data['name'] ?? 'Sin nombre').toString(),
        email: (data['email'] ?? '').toString(),
        role: (data['role'] ?? 'cliente').toString(),
        createdAt: data['createdAt']?.toString(),
      );
    }).toList()
      ..sort((left, right) => left.name.compareTo(right.name));
    notifyListeners();
  }

  void _onStore(DocumentSnapshot<Map<String, dynamic>> snap) {
    final data = snap.data();
    if (data == null) return;
    final videos = <String, Map<String, dynamic>>{};
    final raw = data['videos'];
    if (raw is Map) {
      raw.forEach((key, value) {
        if (value is Map) videos['$key'] = Map<String, dynamic>.from(value);
      });
    }
    storeProfile = NanaStoreProfile(
      name: (data['name'] ?? 'NaNa').toString(),
      logo: (data['logo'] ?? '').toString(),
      banner: (data['banner'] ?? '').toString(),
      address: (data['address'] ?? '').toString(),
      phone: (data['phone'] ?? '').toString(),
      whatsapp: (data['whatsapp'] ?? '').toString(),
      email: (data['email'] ?? '').toString(),
      videos: videos,
    );
    notifyListeners();
  }

  void _onError(Object _) {
    loading = false;
    error = 'No se pudo leer Firestore. Revisa la conexión.';
    notifyListeners();
  }

  NanaProduct _productFrom(String id, Map<String, dynamic> data) {
    final variants = data['variants'];
    int? stock;
    if (variants is List) {
      var sum = 0;
      var any = false;
      for (final variant in variants) {
        if (variant is Map && variant['stock'] is num) {
          any = true;
          sum += (variant['stock'] as num).toInt();
        }
      }
      if (any) stock = sum;
    }
    if (stock == null && data['stock'] is num) {
      stock = (data['stock'] as num).toInt();
    }
    final variations = data['variations'];
    final colors = <String>[];
    final sizes = <String>[];
    if (variations is List) {
      for (final variation in variations) {
        if (variation is! Map) continue;
        final name = (variation['name'] ?? '').toString();
        final options = variation['options'];
        final titles = <String>[
          if (options is List)
            for (final option in options)
              if (option is Map && '${option['title']}'.trim().isNotEmpty) '${option['title']}'.trim(),
        ];
        if (RegExp(r'color|colour|tono', caseSensitive: false).hasMatch(name)) {
          colors.addAll(titles);
        } else if (RegExp(r'talla|tama[nñ]o|size|medida', caseSensitive: false).hasMatch(name)) {
          sizes.addAll(titles);
        }
      }
    }
    final stocks = <String, int?>{};
    final previous = <Map<String, dynamic>>[];
    if (variants is List) {
      for (final variant in variants) {
        if (variant is! Map) continue;
        previous.add(Map<String, dynamic>.from(variant));
        final options = variant['options'];
        if (options is! List) continue;
        final mapped = [
          for (final option in options)
            if (option is Map) {'name': '${option['name']}', 'title': '${option['title']}'},
        ];
        stocks[variantOptionKey(mapped)] = variant['stock'] is num ? (variant['stock'] as num).toInt() : null;
      }
    }
    final gallery = <String>[
      if (data['gallery'] is List)
        for (final item in data['gallery'] as List)
          if (item != null && '$item'.isNotEmpty) '$item',
    ];
    final image = data['image']?.toString();
    if (image != null && image.isNotEmpty && !gallery.contains(image)) {
      gallery.insert(0, image);
    }
    return NanaProduct(
      id: id,
      name: (data['name'] ?? 'Producto').toString(),
      image: image,
      code: data['code']?.toString(),
      categoryId: data['categoryId']?.toString(),
      description: data['description']?.toString(),
      price: _money(data['price']),
      promotionalPrice: data['promotionalPrice'] == null ? null : _money(data['promotionalPrice']),
      cost: data['cost'] == null ? null : _money(data['cost']),
      pin: data['pin'] == true,
      rank: data['rank'] is num ? (data['rank'] as num).toInt() : 0,
      stock: stock,
      createdAt: DateTime.tryParse(data['createdAt']?.toString() ?? ''),
      video: data['video']?.toString(),
      gallery: gallery,
      colors: colors,
      sizes: sizes,
      stocks: stocks,
      previousVariants: previous,
    );
  }

  NanaOrder _orderFrom(String id, Map<String, dynamic> data) {
    final rawLines = data['lines'];
    final lines = <NanaOrderLine>[];
    if (rawLines is List) {
      for (final item in rawLines) {
        if (item is! Map) continue;
        final options = item['options'];
        final detail = options is List
            ? [
                for (final option in options)
                  if (option is Map && '${option['title']}'.trim().isNotEmpty) '${option['title']}',
              ].join(' · ')
            : '';
        lines.add(
          NanaOrderLine(
            productId: (item['productId'] ?? '').toString(),
            name: (item['name'] ?? 'Prenda').toString(),
            quantity: item['quantity'] is num ? (item['quantity'] as num).toInt() : int.tryParse('${item['quantity']}') ?? 1,
            unitPrice: _money(item['unitPrice']),
            detail: detail,
          ),
        );
      }
    }
    return NanaOrder(
      id: id,
      createdAt: DateTime.tryParse(data['createdAt']?.toString() ?? '') ?? DateTime.now(),
      customerName: (data['customerName'] ?? 'Invitado').toString(),
      customerPhone: (data['customerPhone'] ?? '').toString(),
      total: _money(data['total']),
      status: (data['status'] ?? 'nuevo').toString(),
      channel: (data['channel'] ?? 'whatsapp').toString(),
      lineCount: lines.length,
      note: (data['note'] ?? '').toString(),
      payMethod: data['payMethod']?.toString(),
      paymentMode: (data['paymentMode'] ?? 'contado').toString(),
      advance: _money(data['advance']),
      lines: lines,
    );
  }

  double _money(Object? value) {
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  @override
  void dispose() {
    _productsSub?.cancel();
    _categoriesSub?.cancel();
    _ordersSub?.cancel();
    _usersSub?.cancel();
    _storeSub?.cancel();
    super.dispose();
  }
}

class NanaAdminStoreScope extends InheritedNotifier<NanaAdminStore> {
  const NanaAdminStoreScope({
    super.key,
    required NanaAdminStore store,
    required super.child,
  }) : super(notifier: store);

  static NanaAdminStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<NanaAdminStoreScope>();
    assert(scope != null, 'NanaAdminStoreScope no está en el árbol.');
    return scope!.notifier!;
  }
}

String formatPen(num amount) => 'S/ ${amount.toStringAsFixed(2)}';
