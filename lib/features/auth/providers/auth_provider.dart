/// ----------------------------------------------------------------------------
/// auth_provider.dart
///
/// Riverpod state management for authentication in the Disaster Management
/// System (DMS) mobile app. This file defines:
///
///   - [AuthState]    — immutable snapshot of the current auth session,
///                      holding the JWT token and the authenticated [UserModel].
///   - [AuthNotifier] — a [StateNotifier] that orchestrates login, registration,
///                      OAuth (Google / Facebook), profile updates, and logout
///                      by delegating all network and storage calls to
///                      [AuthRepository].
///   - [authProvider] — the global Riverpod provider that widgets consume to
///                      read auth state or trigger auth actions.
///
/// On app start, [AuthNotifier._init] restores any persisted JWT so that
/// returning DMS users (citizens, officers, admins) are logged in automatically.
/// ----------------------------------------------------------------------------

// Riverpod: provides StateNotifier, StateNotifierProvider, and the Ref type
// used to wire providers together.
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Repository that wraps all auth-related HTTP calls and local token storage.
import '../data/auth_repository.dart';

// Data model representing a DMS user (citizen, field officer, or admin).
import '../data/models/user_model.dart';

/// Immutable snapshot of the authentication session.
///
/// Widgets rebuild whenever any field changes, so every mutation goes through
/// [copyWith] rather than direct field assignment.
class AuthState {
  /// JWT bearer token issued by the DMS backend after a successful auth.
  /// Null when the user is not logged in.
  final String? token;

  /// The currently authenticated DMS user (name, role, phone, etc.).
  /// Null until a successful login or session restore.
  final UserModel? user;

  /// True while an auth operation (login, register, OAuth) is in flight,
  /// used to show loading indicators in the UI.
  final bool isLoading;

  /// Human-readable error message from the last failed auth attempt,
  /// displayed to the user (e.g. "Invalid credentials").
  final String? error;

  /// Creates an [AuthState]. Defaults to the unauthenticated, idle state.
  const AuthState({
    this.token,
    this.user,
    this.isLoading = false,
    this.error,
  });

  /// Returns a new [AuthState] with selective field overrides.
  ///
  /// [clearToken] wipes both [token] and [user] — used on logout or when a
  /// persisted token is found to be invalid.
  /// [clearError] resets [error] to null — called at the start of every new
  /// auth attempt so stale errors don't linger in the UI.
  AuthState copyWith({
    String? token,
    UserModel? user,
    bool? isLoading,
    String? error,
    // When true, nulls out token and user regardless of other arguments.
    bool clearToken = false,
    // When true, nulls out the error field regardless of other arguments.
    bool clearError = false,
  }) =>
      AuthState(
        // Honour clearToken first; otherwise prefer the incoming value, then keep current.
        token: clearToken ? null : (token ?? this.token),
        // User is also cleared when the token is invalidated to avoid stale profile data.
        user: clearToken ? null : (user ?? this.user),
        isLoading: isLoading ?? this.isLoading,
        // Honour clearError first; otherwise prefer incoming error, then keep current.
        error: clearError ? null : (error ?? this.error),
      );
}

/// Riverpod [StateNotifier] that manages all authentication flows for the DMS app.
///
/// Exposes methods for email/password login, registration, OAuth sign-in,
/// profile updates, and logout. All state transitions are expressed as new
/// [AuthState] instances so Riverpod can diff and notify only affected widgets.
class AuthNotifier extends StateNotifier<AuthState> {
  /// Repository providing auth network calls and secure token storage.
  final AuthRepository _repo;

  /// Initialises with an empty (unauthenticated) state and immediately
  /// attempts to restore a previously saved session via [_init].
  AuthNotifier(this._repo) : super(const AuthState()) {
    // Restore session on app launch so returning DMS users are auto-logged in.
    _init();
  }

  /// Attempts to restore a persisted JWT from secure storage.
  ///
  /// If a token exists, fetches the current user profile from the DMS backend
  /// to confirm the token is still valid. On any error (expired token, network
  /// failure, revoked session) the token is cleared to force a fresh login.
  Future<void> _init() async {
    // Check local storage for a JWT saved from a previous session.
    final token = await _repo.getSavedToken();
    if (token != null) {
      try {
        // Validate token liveness by fetching the authenticated user's profile.
        final user = await _repo.getMe();
        // Token is valid — restore the full authenticated session.
        state = AuthState(token: token, user: user);
      } catch (e) {
        // Clear token on any auth failure so stale sessions don't auto-login
        await _repo.logout(); // Removes the invalid token from secure storage.
        state = const AuthState(); // Revert to the unauthenticated idle state.
      }
    }
  }

  /// Authenticates a DMS user with email and password credentials.
  ///
  /// Sets [isLoading] while the request is in flight and stores the returned
  /// JWT + user profile on success. Re-throws on failure so calling UI can
  /// display the error.
  Future<void> login(String email, String password) async {
    // Signal UI to show a loading spinner and clear any previous error message.
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Delegate credential validation to the repository (HTTP POST /auth/login).
      final result = await _repo.login(email, password);
      // Store token and user; isLoading implicitly false in the new AuthState.
      state = AuthState(token: result.token, user: result.user);
    } catch (e) {
      // Surface the error in state so the login form can display it.
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow; // Re-throw so the calling widget can perform additional handling.
    }
  }

  /// Registers a new DMS citizen account and logs them in immediately.
  ///
  /// [confirmPassword] is passed to the backend for server-side validation.
  /// [phone] is optional but recommended for SMS alert delivery during disasters.
  Future<void> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    // Backend validates that confirmPassword matches password.
    required String confirmPassword,
    // Optional contact number used for emergency notifications.
    String? phone,
  }) async {
    // Signal UI to show a loading spinner and clear any previous error message.
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Delegate registration to the repository (HTTP POST /auth/register).
      final result = await _repo.register(
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
        phone: phone,
      );
      // Auto-login after registration: store the returned token and user profile.
      state = AuthState(token: result.token, user: result.user);
    } catch (e) {
      // Surface validation or network errors for the registration form to display.
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow; // Propagate so the UI can scroll to the relevant field or show a dialog.
    }
  }

  /// Updates the authenticated user's DMS profile (name, phone, avatar, etc.).
  ///
  /// [data] is a flexible map that may contain any subset of updatable fields,
  /// allowing partial profile edits without replacing the entire user object.
  Future<void> updateProfile(Map<String, dynamic> data) async {
    try {
      // Send the partial update to the DMS backend and receive the refreshed user.
      final user = await _repo.updateMe(data);
      // Replace only the user field; keep the existing token and error state.
      state = state.copyWith(user: user);
    } catch (e) {
      rethrow; // Let the profile screen handle display of update errors.
    }
  }

  /// Authenticates a DMS user via Google OAuth.
  ///
  /// Triggers the Google sign-in flow through the repository, which handles
  /// the OAuth redirect and exchanges the Google token for a DMS JWT.
  Future<void> loginWithGoogle() async {
    // Signal UI to show a loading spinner and clear any previous error message.
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Initiate Google OAuth flow and exchange for a DMS session token.
      final result = await _repo.loginWithGoogle();
      // Store the DMS JWT and user profile returned after successful OAuth.
      state = AuthState(token: result.token, user: result.user);
    } catch (e) {
      // Surface OAuth errors (user cancelled, network failure, etc.).
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow; // Propagate so the UI can show an appropriate OAuth error dialog.
    }
  }

  /// Authenticates a DMS user via Facebook OAuth.
  ///
  /// The Facebook App Secret never leaves the backend; this method only
  /// initiates the client-side OAuth flow and forwards the result to the
  /// DMS backend for token exchange.
  Future<void> loginWithFacebook() async {
    // Signal UI to show a loading spinner and clear any previous error message.
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      // Initiate Facebook OAuth flow and exchange for a DMS session token.
      final result = await _repo.loginWithFacebook();
      // Store the DMS JWT and user profile returned after successful OAuth.
      state = AuthState(token: result.token, user: result.user);
    } catch (e) {
      // Surface OAuth errors (user cancelled, account mismatch, etc.).
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow; // Propagate so the UI can show an appropriate OAuth error dialog.
    }
  }

  /// Logs out the current DMS user, clearing the JWT from secure storage
  /// and resetting state to the unauthenticated idle snapshot.
  ///
  /// After this call, any widget watching [authProvider] will rebuild and
  /// redirect the user to the login screen.
  Future<void> logout() async {
    // Instruct the repository to delete the stored JWT and invalidate the session.
    await _repo.logout();
    // Reset to the empty unauthenticated state so the app shows the login screen.
    state = const AuthState();
  }
}

/// Global Riverpod provider for authentication state.
///
/// Widgets read this provider to determine whether a DMS user is logged in,
/// retrieve the current [UserModel], or invoke auth actions via the notifier.
///
/// Example usage in a widget:
///   final auth = ref.watch(authProvider);
///   final notifier = ref.read(authProvider.notifier);
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  // Resolve the AuthRepository (handles HTTP + secure storage) and inject it.
  return AuthNotifier(ref.read(authRepositoryProvider));
});