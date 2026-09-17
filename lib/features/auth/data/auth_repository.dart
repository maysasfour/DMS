// ============================================================
// auth_repository.dart
// Disaster Management System — Flutter Mobile App
//
// This file defines the [AuthRepository] class, which serves as the
// single source of truth for all authentication operations in the DMS
// mobile app. It handles credential-based login, new user registration,
// OAuth social login (Google and Facebook), profile retrieval/update,
// and secure JWT token persistence.
//
// The repository communicates with the DMS Spring Boot backend over
// HTTP via [DioClient] and maps server responses to [UserModel] objects.
// JWT tokens issued by the backend are stored in secure local storage
// so that authenticated requests (e.g., submitting incident reports,
// accessing emergency resources) can be made without re-login.
// ============================================================

// HTTP client library used for all network requests to the DMS backend
import 'package:dio/dio.dart';
// Riverpod dependency injection — exposes [authRepositoryProvider] to the widget tree
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Google Sign-In SDK for OAuth authentication via Google accounts
import 'package:google_sign_in/google_sign_in.dart';
// Facebook Auth SDK for OAuth authentication via Facebook accounts
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
// Central API endpoint definitions (login, register, profile, oauth, etc.)
import '../../../core/constants/api_constants.dart';
// Configured Dio instance with base URL, auth interceptor, and shared secure storage
import '../../../core/network/dio_client.dart';
// Typed exception wrapper that converts DioException into readable DMS errors
import '../../../core/network/api_exception.dart';
// Data model representing an authenticated DMS user (name, role, phone, etc.)
import 'models/user_model.dart';

/// Module-level [GoogleSignIn] instance configured with the required OAuth scopes.
/// [serverClientId] must be the Web Client ID (OAuth type 3) registered in Firebase/Google Cloud
/// Console so that the Android SDK can return a valid [idToken] for server-side verification.
final _googleSignIn = GoogleSignIn(
  // Request access to the user's email and basic profile for DMS account creation
  scopes: ['email', 'profile'],
  // serverClientId = web client (type 3) — required so Android SDK returns an idToken
  serverClientId: '170971948937-eh0jj3f3a8catr0ln94qbphq853c70ao.apps.googleusercontent.com',
);

/// Riverpod [Provider] that creates and exposes a singleton [AuthRepository].
/// Injects the shared [DioClient] so all auth calls share the same HTTP configuration,
/// including the base URL and Authorization header interceptor.
final authRepositoryProvider = Provider((ref) {
  return AuthRepository(ref.read(dioClientProvider));
});

/// Repository encapsulating all authentication logic for the DMS mobile app.
///
/// Provides methods for email/password login, user registration, social OAuth login,
/// profile management, and secure token handling. All DMS users (citizens, officers,
/// admins) authenticate through this repository before accessing incident or resource data.
class AuthRepository {
  /// The configured HTTP client used to communicate with the DMS backend REST API
  final DioClient _client;

  // Use the single shared storage instance from DioClient
  /// Constructs [AuthRepository] with the injected [DioClient].
  /// Relies on [sharedStorage] exposed by [DioClient] for JWT persistence.
  AuthRepository(this._client);

  /// Authenticates an existing DMS user with email and password credentials.
  ///
  /// Sends a POST request to the login endpoint and, on success, persists the
  /// returned JWT to secure storage so subsequent incident/resource API calls
  /// include the Authorization header automatically.
  ///
  /// Returns a record containing the raw [token] string and a [UserModel]
  /// populated from the server response.
  /// Throws [ApiException] on HTTP errors (e.g., 401 wrong credentials).
  Future<({String token, UserModel user})> login(
      String email, String password) async {
    try {
      // POST credentials to the DMS backend login endpoint
      final res = await _client.post(
        ApiConstants.login,
        data: {'email': email, 'password': password},
      );

      // Unwrap the response envelope — the backend may nest data under a 'data' key
      final body = res.data as Map<String, dynamic>;
      // Support both wrapped { data: {...} } and flat response shapes
      final data = (body['data'] ?? body) as Map<String, dynamic>;
      // Extract the JWT issued by the DMS backend for this session
      final token = data['token'] as String;
      // Deserialize the authenticated user's profile from the response payload
      final user = UserModel.fromJson(data);
      // Persist the JWT securely so it survives app restarts (used by dio interceptor)
      await sharedStorage.write(key: 'jwt_token', value: token);
      // Return both the token and the hydrated user model as a Dart record
      return (token: token, user: user);
    } on DioException catch (e) {
      // Convert network/server errors into a typed DMS ApiException with a readable message
      throw ApiException.fromDioError(e);
    } catch (e) {
      // Catch any unexpected errors (e.g., JSON parse failures) and rethrow generically
      throw Exception(e.toString());
    }
  }

  /// Registers a new DMS user account and immediately logs them in.
  ///
  /// Sends profile fields to the registration endpoint. On success, calls [login]
  /// so the new user receives a JWT without requiring a second manual login step.
  /// [phone] is optional — citizens may register without a phone number, but
  /// providing one enables SMS-based incident alert notifications.
  ///
  /// Returns the same record as [login]: [token] + [UserModel].
  /// Throws [ApiException] on validation failures (e.g., duplicate email, weak password).
  Future<({String token, UserModel user})> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String confirmPassword,
    // Optional phone number for SMS alerts and officer contact purposes
    String? phone,
  }) async {
    try {
      // POST new user data to the DMS registration endpoint
      await _client.post(
        ApiConstants.register,
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'password': password,
          // Backend validates that confirmPassword matches password before creating the account
          'confirmPassword': confirmPassword,
          // Only include phone in the payload if the user actually provided one
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );
      // Auto-login after registration so the user lands directly on the incident dashboard
      return await login(email, password);
    } on DioException catch (e) {
      // Surface validation or conflict errors (e.g., 409 email already exists)
      throw ApiException.fromDioError(e);
    }
  }

  /// Fetches the currently authenticated DMS user's profile from the backend.
  ///
  /// Uses the persisted JWT (injected by the Dio interceptor) to call the /me endpoint.
  /// Useful for refreshing user data after profile edits or role changes by an admin.
  ///
  /// Returns the up-to-date [UserModel] for the session user.
  /// Throws [ApiException] on 401 (token expired or revoked).
  Future<UserModel> getMe() async {
    try {
      // GET the authenticated user's own profile record from the DMS backend
      final res = await _client.get(ApiConstants.me);
      // Unwrap the response envelope consistently with other endpoints
      final body = res.data as Map<String, dynamic>;
      final data = (body['data'] ?? body) as Map<String, dynamic>;
      // Deserialize and return the refreshed user profile
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Updates the authenticated DMS user's profile fields.
  ///
  /// [profileData] is a flexible map to allow partial updates (e.g., only phone
  /// or only display name) without requiring all fields. Used from the Profile
  /// screen so users can keep their contact info current for incident notifications.
  ///
  /// Returns the updated [UserModel] as confirmed by the backend.
  /// Throws [ApiException] on validation errors or permission issues.
  Future<UserModel> updateMe(Map<String, dynamic> profileData) async {
    try {
      // PUT updated profile fields to the DMS profile endpoint
      final res = await _client.put(ApiConstants.profile, data: profileData);
      // Unwrap the server response envelope
      final body = res.data as Map<String, dynamic>;
      final d = (body['data'] ?? body) as Map<String, dynamic>;
      // Return the server-confirmed, updated user model
      return UserModel.fromJson(d);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Signs the current user out of the DMS app by removing the stored JWT.
  ///
  /// Deleting the token from secure storage ensures subsequent requests are
  /// unauthenticated and the user is redirected to the login screen. No backend
  /// call is made since the DMS uses stateless JWT authentication.
  Future<void> logout() async {
    // Remove the JWT from secure storage — the dio interceptor will stop sending it
    await sharedStorage.delete(key: 'jwt_token');
  }

  /// Reads the persisted JWT token from secure storage, if one exists.
  ///
  /// Used at app startup to check whether a previous session is still active,
  /// allowing users to skip re-login after closing and reopening the DMS app.
  /// Returns [null] if no token is saved (user has never logged in or has logged out).
  Future<String?> getSavedToken() => sharedStorage.read(key: 'jwt_token');

  /// Initiates Google OAuth sign-in and exchanges the Google ID token with the DMS backend.
  ///
  /// Forces a fresh sign-in flow each time (via [signOut] first) to prevent stale account
  /// issues when switching between Google accounts. The [idToken] returned by the Google
  /// SDK is forwarded to the DMS OAuth endpoint for server-side verification, after which
  /// the backend issues its own JWT for subsequent API calls.
  ///
  /// Throws an [Exception] if the user cancels the flow or if the Google SDK does not
  /// return an ID token (e.g., missing SHA-1 fingerprint in Firebase Console).
  Future<({String token, UserModel user})> loginWithGoogle() async {
    // Sign out of any cached Google session to force account picker to appear
    await _googleSignIn.signOut();
    // Open the Google account picker and request user consent
    final account = await _googleSignIn.signIn();
    // User dismissed the picker — abort login without throwing a hard error on the UI
    if (account == null) throw Exception('Google sign-in cancelled');
    // Retrieve the OAuth tokens from the signed-in Google account
    final auth = await account.authentication;
    // The ID token proves the user's identity to the DMS backend
    final idToken = auth.idToken;
    if (idToken == null) {
      // This typically means the SHA-1 of the keystore is not registered in Firebase
      throw Exception(
          'Google did not return an ID token — '
          'check SHA-1 fingerprint is registered in Firebase.');
    }
    // Exchange the Google ID token for a DMS backend JWT
    return _oauthExchange(idToken, 'google');
  }

  /// Initiates Facebook OAuth login and exchanges the Facebook access token with the DMS backend.
  ///
  /// Forces a log-out first to clear any cached Facebook session. After the user
  /// authenticates via the Facebook native dialog or browser fallback, the resulting
  /// access token is sent to the DMS OAuth endpoint. The backend verifies it against
  /// the Facebook Graph API and issues a DMS JWT.
  ///
  /// Handles the special case where Facebook is in development mode and only test users
  /// are allowed, surfacing a clear admin-action message instead of a cryptic SDK error.
  ///
  /// Throws [Exception] on cancellation, test-user restrictions, or SDK failures.
  Future<({String token, UserModel user})> loginWithFacebook() async {
    // Clear any cached Facebook session to avoid reusing a stale or wrong account
    await FacebookAuth.instance.logOut();
    // Open the Facebook login dialog, requesting email and profile for DMS account mapping
    final result = await FacebookAuth.instance.login(
      // Minimum scopes needed to create or match a DMS user record
      permissions: ['email', 'public_profile'],
      // Prefer the native Facebook app; fall back to browser if not installed
      loginBehavior: LoginBehavior.nativeWithFallback,
    );
    // User tapped Cancel in the Facebook dialog — abort gracefully
    if (result.status == LoginStatus.cancelled) {
      throw Exception('Facebook login cancelled');
    }
    // Any non-success status (other than cancelled) is treated as an error
    if (result.status != LoginStatus.success) {
      final msg = result.message ?? result.status.toString();
      // Detect Facebook App review restrictions — app is in dev mode and user is not a tester
      if (msg.toLowerCase().contains('user logged in as different facebook user') ||
          msg.toLowerCase().contains('not authorized') ||
          msg.toLowerCase().contains('test user')) {
        // Provide a clear resolution path for users blocked by Facebook's app review gate
        throw Exception(
            'Facebook login is restricted to test users. '
            'Ask the admin to add your Facebook account as a Tester at developers.facebook.com.');
      }
      // Surface any other Facebook SDK error message to the calling UI layer
      throw Exception('Facebook login failed: $msg');
    }
    // Extract the short-lived access token issued by Facebook after successful login
    final accessToken = result.accessToken?.tokenString;
    // Guard against an unlikely but possible null token despite a success status
    if (accessToken == null) throw Exception('No Facebook access token received');
    // Exchange the Facebook access token for a DMS backend JWT
    return _oauthExchange(accessToken, 'facebook');
  }

  /// Private helper that sends an OAuth provider token to the DMS backend and returns
  /// a DMS session record ([token] + [UserModel]).
  ///
  /// Used by both [loginWithGoogle] and [loginWithFacebook] to avoid duplicating the
  /// HTTP exchange logic. The [provider] string ('google' or 'facebook') tells the
  /// backend which verification strategy to apply against the third-party identity provider.
  ///
  /// On success, the backend-issued JWT is persisted to secure storage so all future
  /// DMS API calls (incident reports, resource queries, alerts) are authenticated.
  Future<({String token, UserModel user})> _oauthExchange(
      String token, String provider) async {
    try {
      // POST the provider token and provider name to the DMS OAuth login endpoint
      final res = await _client.post(
        ApiConstants.oauthLogin,
        // 'idToken' is the field name expected by the DMS backend for both Google and Facebook tokens
        data: {'idToken': token, 'provider': provider},
      );
      // Unwrap the standard DMS response envelope
      final body = res.data as Map<String, dynamic>;
      final data = (body['data'] ?? body) as Map<String, dynamic>;
      // Extract the DMS-issued JWT that will authorise all subsequent API requests
      final jwt = data['token'] as String;
      // Deserialize the DMS user profile returned alongside the token
      final user = UserModel.fromJson(data);
      // Persist the JWT so the Dio interceptor includes it on future requests
      await sharedStorage.write(key: 'jwt_token', value: jwt);
      // Return the session record to the calling login method
      return (token: jwt, user: user);
    } on DioException catch (e) {
      // Convert backend OAuth verification errors into typed DMS exceptions
      throw ApiException.fromDioError(e);
    }
  }
}