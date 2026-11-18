abstract final class NanaAuth {
  static const superAdminEmail = 'amamanim@unamad.edu.pe';

  static bool isSuperAdmin(String email) {
    return email.trim().toLowerCase() == superAdminEmail;
  }

  static bool canUseAdmin(String role, String email) {
    if (isSuperAdmin(email)) return true;
    return role == 'administrador' || role == 'desarrollador';
  }
}
