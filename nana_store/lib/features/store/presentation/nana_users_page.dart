import 'package:flutter/material.dart';

import '../../../core/constants/nana_auth.dart';
import '../../../core/constants/nana_colors.dart';
import '../../../core/layout/nana_layout.dart';
import '../../session/presentation/session_scope.dart';
import '../../shell/presentation/nana_admin_store.dart';
import 'nana_catalog_chrome.dart';

class NanaUsersPage extends StatefulWidget {
  const NanaUsersPage({super.key});

  @override
  State<NanaUsersPage> createState() => _NanaUsersPageState();
}

class _NanaUsersPageState extends State<NanaUsersPage> {
  final _query = TextEditingController();
  var _filter = 'all';
  var _view = NanaCatalogView.cards;

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'desarrollador':
        return 'Desarrollador';
      case 'administrador':
        return 'Administrador';
      default:
        return 'Cliente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = NanaAdminStoreScope.of(context);
    final session = SessionScope.of(context);
    final isDev = session.user != null &&
        (session.user!.role == 'desarrollador' || NanaAuth.isSuperAdmin(session.user!.email));
    final padding = NanaLayout.pagePadding(context);
    final tablet = NanaLayout.isTablet(context);
    final needle = _query.text.trim().toLowerCase();
    final users = store.users.where((user) {
      if (_filter != 'all' && user.role != _filter) return false;
      if (needle.isEmpty) return true;
      return user.name.toLowerCase().contains(needle) || user.email.toLowerCase().contains(needle);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(padding, 12, padding, 10),
          child: NanaCatalogChrome(
            query: _query,
            hint: 'Buscar por nombre o correo',
            view: _view,
            onView: (value) => setState(() => _view = value),
            onQuery: () => setState(() {}),
            showCategories: false,
            filters: const [
              ('all', 'Todos'),
              ('cliente', 'Clientes'),
              ('administrador', 'Admins'),
              ('desarrollador', 'Devs'),
            ],
            filterId: _filter,
            onFilter: (value) => setState(() => _filter = value),
          ),
        ),
        Expanded(
          child: users.isEmpty
              ? const Center(child: Text('No hay usuarios en este filtro.'))
              : _view == NanaCatalogView.cards
                  ? GridView.builder(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: tablet ? 3 : 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.05,
                      ),
                      itemCount: users.length,
                      itemBuilder: (context, index) => _UserCard(
                        user: users[index],
                        roleLabel: _roleLabel(users[index].role),
                        canEdit: isDev && !NanaAuth.isSuperAdmin(users[index].email),
                        onRole: (role) => _setRole(store, users[index], role),
                      ),
                    )
                  : ListView.separated(
                      padding: EdgeInsets.fromLTRB(padding, 0, padding, 24),
                      itemCount: users.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final user = users[index];
                        return Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          child: ListTile(
                            title: Text(user.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                            subtitle: Text('${user.email}\n${_roleLabel(user.role)}'),
                            isThreeLine: true,
                            trailing: isDev && !NanaAuth.isSuperAdmin(user.email)
                                ? PopupMenuButton<String>(
                                    onSelected: (role) => _setRole(store, user, role),
                                    itemBuilder: (context) => const [
                                      PopupMenuItem(value: 'cliente', child: Text('Cliente')),
                                      PopupMenuItem(value: 'administrador', child: Text('Administrador')),
                                      PopupMenuItem(value: 'desarrollador', child: Text('Desarrollador')),
                                    ],
                                  )
                                : null,
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Future<void> _setRole(NanaAdminStore store, NanaStoreUser user, String role) async {
    try {
      await store.updateUserRole(user.id, role);
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo cambiar el rol.')));
    }
  }
}

class _UserCard extends StatelessWidget {
  const _UserCard({required this.user, required this.roleLabel, required this.canEdit, required this.onRole});

  final NanaStoreUser user;
  final String roleLabel;
  final bool canEdit;
  final ValueChanged<String> onRole;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: NanaColors.soft,
              child: Text(
                user.name.isEmpty ? '?' : user.name.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark),
              ),
            ),
            const Spacer(),
            Text(user.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
            Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: NanaColors.muted, fontSize: 12)),
            const SizedBox(height: 8),
            if (canEdit)
              DropdownButton<String>(
                value: const ['cliente', 'administrador', 'desarrollador'].contains(user.role) ? user.role : 'cliente',
                isExpanded: true,
                items: const [
                  DropdownMenuItem(value: 'cliente', child: Text('Cliente')),
                  DropdownMenuItem(value: 'administrador', child: Text('Administrador')),
                  DropdownMenuItem(value: 'desarrollador', child: Text('Desarrollador')),
                ],
                onChanged: (value) {
                  if (value != null) onRole(value);
                },
              )
            else
              Text(roleLabel, style: const TextStyle(fontWeight: FontWeight.w800, color: NanaColors.pinkDark)),
          ],
        ),
      ),
    );
  }
}
