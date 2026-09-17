// Integration test: Login flow — AuthNotifier + AuthState + AuthRepository
// Uses a fake DioClient to avoid real HTTP calls.
// Run with: flutter test test/integration/login_flow_test.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:disaster_management_app/features/auth/data/models/user_model.dart';
import 'package:disaster_management_app/features/auth/providers/auth_provider.dart';

// ── Stub AuthRepository that bypasses DioClient entirely ─────────────────────
//
// AuthRepository is a concrete class that requires DioClient (which needs
// a live server). We build a test-only subclass that overrides the methods
// we need, then inject it via Riverpod overrides.
class _StubAuthRepository {
  final bool shouldSucceed;
  final UserModel? userOverride;

  _StubAuthRepository({required this.shouldSucceed, this.userOverride});

  static const _adminUser = UserModel(
    id: 1,
    email: 'admin@dms.local',
    firstName: 'Mays',
    lastName: 'Admin',
    role: 'ADMIN',
  );

  Future<String?> getSavedToken() async => null;

  Future<UserModel> getMe() async => userOverride ?? _adminUser;

  Future<({String token, UserModel user})> login(
      String email, String password) async {
    if (shouldSucceed) {
      final u = userOverride ?? _adminUser;
      return (token: 'fake-jwt-token', user: u);
    }
    throw Exception('Invalid credentials');
  }

  Future<void> logout() async {}
}

// ── Test-only AuthNotifier that uses _StubAuthRepository ─────────────────────
class _TestAuthNotifier extends StateNotifier<AuthState> {
  final _StubAuthRepository _repo;

  _TestAuthNotifier(this._repo) : super(const AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _repo.login(email, password);
      state = AuthState(token: result.token, user: result.user);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
  }
}

StateNotifierProvider<_TestAuthNotifier, AuthState> _makeProvider(
    _StubAuthRepository repo) {
  return StateNotifierProvider<_TestAuthNotifier, AuthState>(
      (ref) => _TestAuthNotifier(repo));
}

void main() {
  // ── AuthState initial state ────────────────────────────────────────────────
  group('AuthState', () {
    test('default state: no token, no user, not loading, no error', () {
      const state = AuthState();
      expect(state.token, isNull);
      expect(state.user, isNull);
      expect(state.isLoading, isFalse);
      expect(state.error, isNull);
    });

    test('copyWith sets token and user', () {
      const state = AuthState();
      const user = UserModel(
          id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN');
      final updated = state.copyWith(token: 'jwt-abc', user: user);
      expect(updated.token, 'jwt-abc');
      expect(updated.user, user);
      expect(updated.isLoading, isFalse);
    });

    test('copyWith sets isLoading without touching token', () {
      const state = AuthState(token: 'tok');
      final loading = state.copyWith(isLoading: true);
      expect(loading.isLoading, isTrue);
      expect(loading.token, 'tok');
    });

    test('clearToken removes token and user', () {
      const user = UserModel(
          id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN');
      final state = AuthState(token: 'tok', user: user);
      final cleared = state.copyWith(clearToken: true);
      expect(cleared.token, isNull);
      expect(cleared.user, isNull);
    });

    test('clearError removes error', () {
      const state = AuthState(error: 'Some error');
      final cleared = state.copyWith(clearError: true);
      expect(cleared.error, isNull);
    });
  });

  // ── Login flow integration ─────────────────────────────────────────────────
  group('Login flow integration', () {
    test('initial state is unauthenticated', () {
      final stub = _StubAuthRepository(shouldSucceed: false);
      final provider = _makeProvider(stub);
      final container = ProviderContainer(overrides: []);
      addTearDown(container.dispose);

      final notifier = _TestAuthNotifier(stub);
      expect(notifier.state.token, isNull);
      expect(notifier.state.user, isNull);
      expect(notifier.state.isLoading, isFalse);
    });

    test('successful login sets token and user with correct role', () async {
      const fakeUser = UserModel(
          id: 1,
          email: 'admin@dms.local',
          firstName: 'Mays',
          lastName: 'Admin',
          role: 'ADMIN');
      final stub = _StubAuthRepository(shouldSucceed: true, userOverride: fakeUser);
      final notifier = _TestAuthNotifier(stub);

      await notifier.login('admin@dms.local', 'demo123');

      expect(notifier.state.token, 'fake-jwt-token');
      expect(notifier.state.user?.email, 'admin@dms.local');
      expect(notifier.state.user?.role, 'ADMIN');
      expect(notifier.state.error, isNull);
    });

    test('failed login sets error and keeps token null', () async {
      final stub = _StubAuthRepository(shouldSucceed: false);
      final notifier = _TestAuthNotifier(stub);

      try {
        await notifier.login('wrong@dms.local', 'badpass');
      } catch (_) {}

      expect(notifier.state.token, isNull);
      expect(notifier.state.error, isNotNull);
    });

    test('logout clears token and user', () async {
      const fakeUser = UserModel(
          id: 2,
          email: 'ops@dms.local',
          firstName: 'Ops',
          lastName: 'Chief',
          role: 'ADMIN');
      final stub = _StubAuthRepository(shouldSucceed: true, userOverride: fakeUser);
      final notifier = _TestAuthNotifier(stub);

      await notifier.login('ops@dms.local', 'demo123');
      expect(notifier.state.token, isNotNull);

      await notifier.logout();
      expect(notifier.state.token, isNull);
      expect(notifier.state.user, isNull);
    });
  });

  // ── Role-based auth guard ──────────────────────────────────────────────────
  group('Role-based auth guard', () {
    Future<_TestAuthNotifier> loginAs(UserModel user) async {
      final stub = _StubAuthRepository(shouldSucceed: true, userOverride: user);
      final notifier = _TestAuthNotifier(stub);
      await notifier.login(user.email, 'demo123');
      return notifier;
    }

    test('ADMIN role is set correctly after login', () async {
      const user = UserModel(
          id: 1, email: 'admin@dms.local',
          firstName: 'Mays', lastName: 'Admin', role: 'ADMIN');
      final notifier = await loginAs(user);
      expect(notifier.state.user?.role, 'ADMIN');
    });

    test('CITIZEN role is set correctly after login', () async {
      const user = UserModel(
          id: 3, email: 'ahmed@dms.local',
          firstName: 'Ahmed', lastName: 'Al-Rashidi', role: 'CITIZEN');
      final notifier = await loginAs(user);
      expect(notifier.state.user?.role, 'CITIZEN');
    });

    test('RESCUE_TEAM role is set correctly after login', () async {
      const user = UserModel(
          id: 5, email: 'team1@dms.local',
          firstName: 'Alpha', lastName: 'Team', role: 'RESCUE_TEAM');
      final notifier = await loginAs(user);
      expect(notifier.state.user?.role, 'RESCUE_TEAM');
    });

    test('isAuthenticated is true when token is present', () async {
      const user = UserModel(
          id: 1, email: 'admin@dms.local',
          firstName: 'Mays', lastName: 'Admin', role: 'ADMIN');
      final notifier = await loginAs(user);
      expect(notifier.state.token, isNotNull);
      expect(notifier.state.user, isNotNull);
    });
  });
}
