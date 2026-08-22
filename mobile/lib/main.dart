import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => AppState(),
      child: const MyApp(),
    ),
  );
}

// ==========================================
// 🎨 Unified Theme & Colors
// ==========================================
class AppColors {
  static const primary = Color(0xFF2E7D32); // Leaf Green
  static const primaryLight = Color(0xFFE8F5E9);
  static const secondary = Color(0xFFFFA000); // Amber Sun
  static const accent = Color(0xFF00796B); // Teal Water
  static const bgDark = Color(0xFF0A0F0D);
  static const bgCardDark = Color(0xFF16211B);
  static const textPrimary = Color(0xFFE0EBD4);
  static const textSecondary = Color(0xFF90A595);
  static const border = Color(0x402E7D32); // transparent border green
  static const danger = Color(0xFFD32F2F);
  static const success = Color(0xFF388E3C);
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AgroAssist AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: AppColors.bgDark,
        primaryColor: AppColors.primary,
        colorScheme: ColorScheme.dark(
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          surface: AppColors.bgCardDark,
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: AppColors.textPrimary, fontFamily: 'Outfit'),
          bodyMedium: TextStyle(color: AppColors.textSecondary, fontFamily: 'Outfit'),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.bgDark,
          elevation: 0,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
            fontFamily: 'Outfit',
          ),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

// ==========================================
// 🔄 Global AppState Provider
// ==========================================
class AppState extends ChangeNotifier {
  String _token = '';
  Map<String, dynamic>? _user;
  Map<String, dynamic> _cart = {'items': []};
  String _language = 'en';
  Map<String, dynamic> _location = {
    'lat': 18.5204,
    'lng': 73.8567,
    'address': 'Pune, Maharashtra'
  };
  Map<String, dynamic>? _weather;
  int _unreadNotifications = 0;
  bool _loading = false;

  final String apiUrl = 'http://10.0.2.2:5000/api'; // Android Emulator localhost bridge

  String get token => _token;
  Map<String, dynamic>? get user => _user;
  Map<String, dynamic> get cart => _cart;
  String get language => _language;
  Map<String, dynamic> get location => _location;
  Map<String, dynamic>? get weather => _weather;
  int get unreadNotifications => _unreadNotifications;
  bool get loading => _loading;

  AppState() {
    _loadSession();
    _detectLocation();
  }

  // Load saved session on launch
  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('token') ?? '';
    _language = prefs.getString('language') ?? 'en';
    if (_token.isNotEmpty) {
      await fetchUserProfile();
      await fetchCart();
      await fetchUnreadCount();
    }
    notifyListeners();
  }

  // Synchronize token state
  Future<void> setToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token.isEmpty) {
      await prefs.remove('token');
      _user = null;
      _cart = {'items': []};
      _unreadNotifications = 0;
    } else {
      await prefs.setString('token', token);
      await fetchUserProfile();
      await fetchCart();
      await fetchUnreadCount();
    }
    notifyListeners();
  }

  // Set selected Language
  Future<void> setLanguage(String lang) async {
    _language = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
    notifyListeners();
  }

  // Detect GPS location using Geolocator
  Future<void> _detectLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.low
        );
        _location['lat'] = position.latitude;
        _location['lng'] = position.longitude;

        // Geocoding reverse city lookup
        final response = await http.get(Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&zoom=10'
        ));
        
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final addressMap = data['address'];
          final city = addressMap['city'] ?? addressMap['town'] ?? addressMap['suburb'] ?? addressMap['county'] ?? 'Detected Location';
          final state = addressMap['state'] ?? '';
          _location['address'] = '$city, $state';
        }
        
        fetchWeather();
      }
    } catch (e) {
      debugPrint('Location detection error: $e');
    }
    notifyListeners();
  }

  // Manual location overrides
  void updateManualLocation(double lat, double lng, String address, String state, String district) {
    _location = {
      'lat': lat,
      'lng': lng,
      'address': address,
      'state': state,
      'district': district
    };
    fetchWeather();
    notifyListeners();
  }

  // API Call: Fetch User Profile
  Future<void> fetchUserProfile() async {
    try {
      final res = await http.get(
        Uri.parse('$apiUrl/user/me'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _user = jsonDecode(res.body);
        if (_user?['preferredLanguage'] != null) {
          _language = _user!['preferredLanguage'];
        }
      } else {
        await setToken('');
      }
    } catch (e) {
      debugPrint('Fetch profile error: $e');
    }
    notifyListeners();
  }

  // API Call: Fetch weather data
  Future<void> fetchWeather() async {
    try {
      final res = await http.get(Uri.parse(
        '$apiUrl/weather?lat=${_location['lat']}&lon=${_location['lng']}&city=${Uri.encodeComponent(_location['address'])}'
      ));
      if (res.statusCode == 200) {
        _weather = jsonDecode(res.body);
      }
    } catch (e) {
      debugPrint('Fetch weather error: $e');
    }
    notifyListeners();
  }

  // API Call: Fetch shopping cart
  Future<void> fetchCart() async {
    try {
      final res = await http.get(
        Uri.parse('$apiUrl/products/cart'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _cart = jsonDecode(res.body);
      }
    } catch (e) {
      debugPrint('Fetch cart error: $e');
    }
    notifyListeners();
  }

  // API Call: Fetch notifications count
  Future<void> fetchUnreadCount() async {
    try {
      final res = await http.get(
        Uri.parse('$apiUrl/notifications/unread-count'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _unreadNotifications = jsonDecode(res.body)['count'];
      }
    } catch (e) {
      debugPrint('Fetch unread notifications error: $e');
    }
    notifyListeners();
  }

  // Add Item to cart
  Future<Map<String, dynamic>> addToCart(String productId, {int quantity = 1}) async {
    if (_token.isEmpty) {
      return {'success': false, 'error': 'Please login first.'};
    }
    try {
      final res = await http.post(
        Uri.parse('$apiUrl/products/cart'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token'
        },
        body: jsonEncode({'productId': productId, 'quantity': quantity})
      );
      if (res.statusCode == 200) {
        _cart = jsonDecode(res.body);
        notifyListeners();
        return {'success': true};
      }
    } catch (e) {
      debugPrint('Add to cart error: $e');
    }
    return {'success': false, 'error': 'Cart update failed.'};
  }

  // Update Cart Quantity
  Future<void> updateCartQty(String productId, int quantity) async {
    try {
      final res = await http.put(
        Uri.parse('$apiUrl/products/cart/$productId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token'
        },
        body: jsonEncode({'quantity': quantity})
      );
      if (res.statusCode == 200) {
        _cart = jsonDecode(res.body);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Update cart error: $e');
    }
  }

  // Remove Item from cart
  Future<void> removeFromCart(String productId) async {
    try {
      final res = await http.delete(
        Uri.parse('$apiUrl/products/cart/$productId'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _cart = jsonDecode(res.body);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Remove from cart error: $e');
    }
  }

  // Clear Cart
  Future<void> clearCart() async {
    try {
      final res = await http.delete(
        Uri.parse('$apiUrl/products/cart'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _cart = {'items': []};
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Clear cart error: $e');
    }
  }

  // Dictionary translations helper
  String t(String key) {
    final Map<String, Map<String, String>> dict = {
      'en': {
        'dashboard': 'Dashboard',
        'aiAssistant': 'AI Assistant',
        'scanCrop': 'Scan Crop',
        'schemes': 'Govt Schemes',
        'marketPrices': 'Market Prices',
        'water': 'Irrigation',
        'fertilizer': 'Fertilizer',
        'products': 'Store',
        'cart': 'Cart',
        'notifications': 'Alerts',
        'profile': 'Profile',
        'logout': 'Logout',
        'welcome': 'Welcome, ',
        'location': 'Current Location',
        'quickActions': 'Quick Actions',
        'saveChanges': 'Save Changes',
        'countdown': 'Resend OTP in',
        'verify': 'Verify OTP',
        'send': 'Send OTP',
        'community': 'Community Forum',
      },
      'hi': {
        'dashboard': 'डैशबोर्ड',
        'aiAssistant': 'एआई सहायक',
        'scanCrop': 'फसल स्कैन',
        'schemes': 'योजनाएं',
        'marketPrices': 'मंडी भाव',
        'water': 'सिंचाई',
        'fertilizer': 'उर्वरक',
        'products': 'कृषि स्टोर',
        'cart': 'कार्ट',
        'notifications': 'सूचनाएं',
        'profile': 'प्रोफाइल',
        'logout': 'लॉगआउट',
        'welcome': 'स्वागत है, ',
        'location': 'वर्तमान स्थान',
        'quickActions': 'त्वरित कार्य',
        'saveChanges': 'सुरक्षित करें',
        'countdown': 'ओटीपी पुनः भेजें',
        'verify': 'ओटीपी सत्यापित करें',
        'send': 'ओटीपी भेजें',
        'community': 'सामुदायिक मंच',
      },
      'mr': {
        'dashboard': 'डॅशबोर्ड',
        'aiAssistant': 'एआय सहाय्यक',
        'scanCrop': 'पीक स्कॅन',
        'schemes': 'योजना',
        'marketPrices': 'बाजार भाव',
        'water': 'पाणी नियोजन',
        'fertilizer': 'खत वेळापत्रक',
        'products': 'कृषी दुकान',
        'cart': 'कार्ट',
        'notifications': 'सूचना',
        'profile': 'प्रोफाइल',
        'logout': 'लॉगआउट',
        'welcome': 'स्वागत आहे, ',
        'location': 'सध्याचे ठिकाण',
        'quickActions': 'जलद कृती',
        'saveChanges': 'जतन करा',
        'countdown': 'ओटीपी पुन्हा पाठवा',
        'verify': 'ओटीपी तपासा',
        'send': 'ओटीपी पाठवा',
        'community': 'सामाजिक मंच',
      },
      'ta': {
        'dashboard': 'டாஷ்போர்டு',
        'aiAssistant': 'AI உதவியாளர்',
        'scanCrop': 'பயிர் ஸ்கேன்',
        'schemes': 'திட்டங்கள்',
        'marketPrices': 'சந்தை விலை',
        'water': 'நீர்ப் பாசனம்',
        'fertilizer': 'உர அட்டவணை',
        'products': 'கடை',
        'cart': 'கூடை',
        'notifications': 'அறிவிப்புகள்',
        'profile': 'சுயவிவரம்',
        'logout': 'வெளியேறு',
        'welcome': 'வரவேற்கிறோம், ',
        'location': 'தற்போதைய இடம்',
        'quickActions': 'விரைவான செயல்',
        'saveChanges': 'சேமிக்கவும்',
        'countdown': 'மீண்டும் அனுப்பவும்',
        'verify': 'OTP சரிபார்க்கவும்',
        'send': 'OTP அனுப்பவும்',
        'community': 'சமூக மன்றம்',
      }
    };
    return dict[_language]?[key] ?? dict['en']?[key] ?? key;
  }
}

// ==========================================
// 🚀 SPLASH SCREEN
// ==========================================
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Timer(const Duration(seconds: 2), () {
      final state = Provider.of<AppState>(context, listen: false);
      if (state.token.isNotEmpty) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainShellScreen()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const WelcomeScreen()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.eco, size: 80, color: AppColors.primary),
            const SizedBox(height: 16),
            const Text(
              'AgroAssist AI',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              'Smart Farming, Better Tomorrow',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(color: AppColors.primary),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 👋 WELCOME SCREEN
// ==========================================
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            const Icon(Icons.agriculture, size: 100, color: AppColors.primary),
            const SizedBox(height: 24),
            const Text(
              'Welcome to AgroAssist',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 12),
            const Text(
              'Get direct disease diagnostics, mandis prices, crop planners, and localized weather advice.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: AppColors.textSecondary),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const AuthScreen(initialMode: 'login')),
                  );
                },
                child: const Text('Get Started', style: TextStyle(fontSize: 18, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 🔐 AUTHENTICATION SCREEN
// ==========================================
class AuthScreen extends StatefulWidget {
  final String initialMode;
  const AuthScreen({super.key, required this.initialMode});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late String _mode; // 'login' | 'register' | 'otp' | 'forgot'
  bool _showPassword = false;
  String _error = '';
  String _message = '';
  bool _loading = false;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _otpController = TextEditingController();

  int _otpStep = 1; // 1 = Input phone, 2 = Verify Code
  int _countdown = 0;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    _countdown = 60;
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_countdown > 0) {
          _countdown--;
        } else {
          _countdownTimer?.cancel();
        }
      });
    });
  }

  // Handle standard password Login
  Future<void> _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text,
          'password': _passwordController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        await state.setToken(data['token']);
        if (mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainShellScreen()));
      } else {
        setState(() => _error = data['message'] ?? 'Invalid credentials.');
      }
    } catch (e) {
      setState(() => _error = 'Auth server connection failure.');
    } finally {
      setState(() => _loading = false);
    }
  }

  // Handle Account registration
  Future<void> _handleRegister() async {
    if (_nameController.text.isEmpty ||
        _emailController.text.isEmpty ||
        _phoneController.text.isEmpty ||
        _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Passwords do not match.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': _nameController.text,
          'email': _emailController.text,
          'phone': _phoneController.text,
          'password': _passwordController.text,
          'confirmPassword': _confirmPasswordController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 201) {
        await state.setToken(data['token']);
        if (mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainShellScreen()));
      } else {
        setState(() => _error = data['message'] ?? 'Registration failed.');
      }
    } catch (e) {
      setState(() => _error = 'Registration server error.');
    } finally {
      setState(() => _loading = false);
    }
  }

  // OTP Send request
  Future<void> _handleSendOtp() async {
    if (_phoneController.text.isEmpty) {
      setState(() => _error = 'Please enter phone number.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
      _message = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/otp/send'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'countryCode': '+91',
          'phone': _phoneController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          _otpStep = 2;
          _message = 'OTP code sent successfully.';
        });
        _startCountdown();
      } else {
        setState(() => _error = data['message'] ?? 'Failed to send OTP.');
      }
    } catch (e) {
      setState(() => _error = 'SMS gateway offline.');
    } finally {
      setState(() => _loading = false);
    }
  }

  // OTP Verification request
  Future<void> _handleVerifyOtp() async {
    if (_otpController.text.length != 6) {
      setState(() => _error = 'Please enter 6-digit code.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/otp/verify'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'countryCode': '+91',
          'phone': _phoneController.text,
          'otp': _otpController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        await state.setToken(data['token']);
        if (mounted) Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const MainShellScreen()));
      } else {
        setState(() => _error = data['message'] ?? 'Invalid OTP code.');
      }
    } catch (e) {
      setState(() => _error = 'OTP verification error.');
    } finally {
      setState(() => _loading = false);
    }
  }

  // Password Recovery handler
  Future<void> _handleForgotPassword() async {
    if (_emailController.text.isEmpty) {
      setState(() => _error = 'Please enter your email.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
      _message = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': _emailController.text}),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          _message = 'Reset code sent to your email.';
          _mode = 'reset';
          _otpController.clear();
        });
      } else {
        setState(() => _error = data['message'] ?? 'Forgot password error.');
      }
    } catch (e) {
      setState(() => _error = 'Server connection error.');
    } finally {
      setState(() => _loading = false);
    }
  }

  // Reset Password request
  Future<void> _handleResetPassword() async {
    if (_otpController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final state = Provider.of<AppState>(context, listen: false);
      final res = await http.post(
        Uri.parse('${state.apiUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text,
          'code': _otpController.text,
          'newPassword': _passwordController.text,
        }),
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() {
          _message = 'Password reset successful. Please login.';
          _mode = 'login';
          _passwordController.clear();
          _emailController.clear();
        });
      } else {
        setState(() => _error = data['message'] ?? 'Invalid reset code.');
      }
    } catch (e) {
      setState(() => _error = 'Reset password submission failed.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(_mode == 'login' 
            ? 'Login' 
            : _mode == 'register' 
                ? 'Create Account' 
                : _mode == 'otp' 
                    ? 'OTP Verification' 
                    : 'Forgot Password'),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),
              
              if (_error.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.danger),
                  ),
                  child: Text(_error, style: const TextStyle(color: Colors.redAccent)),
                ),
                const SizedBox(height: 16),
              ],
              
              if (_message.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.success),
                  ),
                  child: Text(_message, style: const TextStyle(color: Colors.greenAccent)),
                ),
                const SizedBox(height: 16),
              ],

              // ----------------------------------------
              // LOGIN MODE
              // ----------------------------------------
              if (_mode == 'login') ...[
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.email),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: !_showPassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock),
                    suffixIcon: IconButton(
                      icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _showPassword = !_showPassword),
                    ),
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => setState(() {
                      _mode = 'forgot';
                      _error = '';
                      _message = '';
                    }),
                    child: const Text('Forgot Password?', style: TextStyle(color: AppColors.secondary)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: _loading ? null : _handleLogin,
                    child: _loading 
                        ? const CircularProgressIndicator(color: Colors.white) 
                        : const Text('Login', style: TextStyle(color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 24),
                const Row(
                  children: [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text('OR'),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      // Trigger Google Login simulation flow
                      state.setToken('google_oauth_simulation_token_2026');
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const MainShellScreen())
                      );
                    },
                    icon: const Icon(Icons.g_mobiledata, size: 30, color: Colors.blueAccent),
                    label: const Text('Continue with Google'),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() {
                      _mode = 'otp';
                      _otpStep = 1;
                      _error = '';
                      _message = '';
                    }),
                    icon: const Icon(Icons.phone),
                    label: const Text('Login with Phone OTP'),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _mode = 'register';
                      _error = '';
                      _message = '';
                    }),
                    child: const Text("Don't have an account? Create one"),
                  ),
                ),
              ],

              // ----------------------------------------
              // REGISTER MODE
              // ----------------------------------------
              if (_mode == 'register') ...[
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    prefixIcon: Icon(Icons.person),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.email),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    prefixIcon: Icon(Icons.phone),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password (min 6 characters)',
                    prefixIcon: Icon(Icons.lock),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Confirm Password',
                    prefixIcon: Icon(Icons.lock_outline),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: _loading ? null : _handleRegister,
                    child: _loading 
                        ? const CircularProgressIndicator(color: Colors.white) 
                        : const Text('Create Account', style: TextStyle(color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _mode = 'login';
                      _error = '';
                      _message = '';
                    }),
                    child: const Text('Already have an account? Login'),
                  ),
                ),
              ],

              // ----------------------------------------
              // OTP MODE
              // ----------------------------------------
              if (_mode == 'otp') ...[
                if (_otpStep == 1) ...[
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      prefixText: '+91 ',
                      prefixIcon: Icon(Icons.phone),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: _loading ? null : _handleSendOtp,
                      child: _loading 
                          ? const CircularProgressIndicator(color: Colors.white) 
                          : Text(state.t('send'), style: const TextStyle(color: Colors.white)),
                    ),
                  ),
                ] else ...[
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 6,
                    style: const TextStyle(letterSpacing: 8, fontSize: 18, fontWeight: FontWeight.bold),
                    decoration: const InputDecoration(
                      labelText: 'Enter 6-Digit OTP',
                      prefixIcon: Icon(Icons.security),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_countdown > 0)
                    Text('${state.t('countdown')} ${_countdown}s', style: const TextStyle(color: AppColors.textSecondary))
                  else
                    TextButton(
                      onPressed: _handleSendOtp,
                      child: const Text('Resend OTP'),
                    ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: _loading ? null : _handleVerifyOtp,
                      child: _loading 
                          ? const CircularProgressIndicator(color: Colors.white) 
                          : Text(state.t('verify'), style: const TextStyle(color: Colors.white)),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton(
                    onPressed: () => setState(() {
                      _mode = 'login';
                      _error = '';
                      _message = '';
                    }),
                    child: const Text('Back to Password Login'),
                  ),
                ),
              ],

              // ----------------------------------------
              // FORGOT PASSWORD
              // ----------------------------------------
              if (_mode == 'forgot') ...[
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Registered Email Address',
                    prefixIcon: Icon(Icons.email),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: _loading ? null : _handleForgotPassword,
                    child: _loading 
                        ? const CircularProgressIndicator(color: Colors.white) 
                        : const Text('Send Reset Code', style: TextStyle(color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton(
                    onPressed: () => setState(() {
                      _mode = 'login';
                      _error = '';
                      _message = '';
                    }),
                    child: const Text('Back to Login'),
                  ),
                ),
              ],

              // ----------------------------------------
              // RESET PASSWORD
              // ----------------------------------------
              if (_mode == 'reset') ...[
                TextField(
                  controller: _otpController,
                  decoration: const InputDecoration(
                    labelText: 'Reset Code',
                    prefixIcon: Icon(Icons.security),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New Password (min 6 characters)',
                    prefixIcon: Icon(Icons.lock),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: _loading ? null : _handleResetPassword,
                    child: _loading 
                        ? const CircularProgressIndicator(color: Colors.white) 
                        : const Text('Save New Password', style: TextStyle(color: Colors.white)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 📱 MAIN BOTTOM NAVIGATION SHELL
// ==========================================
class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    const DashboardTab(),
    const AIChatTab(),
    const ScanTab(),
    const StoreTab(),
    const ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    
    return Scaffold(
      body: SafeArea(child: _tabs[_currentIndex]),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        backgroundColor: Colors.black.withOpacity(0.95),
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.dashboard), label: state.t('dashboard')),
          BottomNavigationBarItem(icon: const Icon(Icons.chat_bubble), label: state.t('aiAssistant')),
          BottomNavigationBarItem(icon: const Icon(Icons.camera_alt), label: state.t('scanCrop')),
          BottomNavigationBarItem(icon: const Icon(Icons.shopping_bag), label: state.t('products')),
          BottomNavigationBarItem(icon: const Icon(Icons.person), label: state.t('profile')),
        ],
      ),
    );
  }
}

// ==========================================
// 🏠 TAB 1: DASHBOARD
// ==========================================
class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  List<dynamic> _latestNotifs = [];

  @override
  void initState() {
    super.initState();
    _fetchDashboardNotifs();
  }

  Future<void> _fetchDashboardNotifs() async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/notifications'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() {
          _latestNotifs = data.length > 2 ? data.sublist(0, 2) : data;
        });
      }
    } catch (e) {
      debugPrint('Dashboard fetch notifications error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final user = state.user;
    final w = state.weather;

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${state.t('welcome')}${user?['name'] ?? 'Farmer'}!',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      const Text('Ready for smart crop care today?', style: TextStyle(color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                Stack(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.notifications, size: 28),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))
                            .then((_) => _fetchDashboardNotifs());
                      },
                    ),
                    if (state.unreadNotifications > 0)
                      Positioned(
                        right: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(color: AppColors.danger, shape: BoxShape.circle),
                          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                          child: Text(
                            '${state.unreadNotifications}',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      )
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Weather Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(state.t('weather'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: AppColors.secondary),
                          const SizedBox(width: 4),
                          Text(state.location['address'], style: const TextStyle(fontSize: 12, color: AppColors.secondary)),
                        ],
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (w != null) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${w['temperature']}°C', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.extrabold, color: Colors.white)),
                            Text('${w['condition']}', style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                          ],
                        ),
                        const Icon(Icons.cloud_queue, size: 60, color: AppColors.secondary),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildWeatherStat(Icons.opacity, 'Humidity', '${w['humidity']}%'),
                        _buildWeatherStat(Icons.air, 'Wind', '${w['windSpeed']} km/h'),
                        _buildWeatherStat(Icons.umbrella, 'Rain Prob', '${w['rainProb']}%'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                      ),
                      child: Text(
                        w['rainProb'] > 50 
                            ? 'High probability of rain. Postpone any fertilizer spraying or pesticide application.'
                            : 'Weather looks clear. Ideal conditions for light irrigation and weeding.',
                        style: const TextStyle(fontSize: 12, color: Colors.greenAccent),
                      ),
                    )
                  ] else ...[
                    const Center(child: CircularProgressIndicator(color: AppColors.primary)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Quick Actions Title
            Text(state.t('quickActions'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 16),

            // Grid of Quick Actions
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.4,
              children: [
                _buildActionCard(Icons.water_drop, 'Irrigation', Colors.teal, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const WaterManagementScreen()));
                }),
                _buildActionCard(Icons.grass, 'Fertilizers', Colors.brown, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const FertilizerScheduleScreen()));
                }),
                _buildActionCard(Icons.assignment, 'Subsidies', Colors.purple, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const GovSchemesScreen()));
                }),
                _buildActionCard(Icons.trending_up, 'Mandi Prices', Colors.orange, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketPricesScreen()));
                }),
                _buildActionCard(Icons.public, state.t('community'), Colors.green, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CommunityScreen()));
                }),
              ],
            ),
            const SizedBox(height: 24),

            // Recent Alerts Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Recent Alerts', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))
                      .then((_) => _fetchDashboardNotifs()),
                  child: const Text('View All', style: TextStyle(color: AppColors.secondary)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            if (_latestNotifs.isNotEmpty)
              Column(
                children: _latestNotifs.map((n) {
                  return Container(
                    margin: const EdgeInsets.bottom(10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.bgCardDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: n['read'] ? AppColors.border : AppColors.secondary.withOpacity(0.3)
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.circle,
                          size: 10,
                          color: n['read'] ? Colors.transparent : AppColors.secondary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 4),
                              Text(n['message'] ?? '', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              )
            else
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(child: Text('No recent alerts.')),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildWeatherStat(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
            Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        )
      ],
    );
  }

  Widget _buildActionCard(IconData icon, String title, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.bgCardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 💬 TAB 2: AI ASSISTANT CHAT
// ==========================================
class AIChatTab extends StatefulWidget {
  const AIChatTab({super.key});

  @override
  State<AIChatTab> createState() => _AIChatTabState();
}

class _AIChatTabState extends State<AIChatTab> {
  final List<Map<String, String>> _messages = [];
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _loading = false;
  Map<String, String>? _errorDetails;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('mobile_chat_history');
    if (saved != null) {
      setState(() {
        _messages.addAll(List<Map<String, String>>.from(
          jsonDecode(saved).map((m) => Map<String, String>.from(m))
        ));
      });
    } else {
      _messages.add({
        'role': 'assistant',
        'content': 'Hello! I am your AgroAssist AI Farming Assistant. Ask me anything about crop care, soil, pests, irrigation, or schemes.'
      });
    }
  }

  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('mobile_chat_history', jsonEncode(_messages));
  }

  void _scrollToBottom() {
    Timer(const Duration(milliseconds: 100), () {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _handleSend() async {
    if (_controller.text.trim().isEmpty || _loading) return;

    final userMsg = _controller.text;
    _controller.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': userMsg});
      _loading = true;
      _errorDetails = null;
    });
    _scrollToBottom();

    final state = Provider.of<AppState>(context, listen: false);

    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/ai/chat'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        },
        body: jsonEncode({'messages': _messages}),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        setState(() {
          _messages.add({'role': 'assistant', 'content': data['content']});
        });
        _saveHistory();
      } else {
        setState(() {
          _errorDetails = {
            'message': data['message'] ?? 'Error communicating with AI Assistant.',
            'detail': data['detail'] ?? 'Ensure your local Ollama instance is configured.'
          };
        });
      }
    } catch (e) {
      setState(() {
        _errorDetails = {
          'message': 'AI service offline.',
          'detail': 'Ensure Ollama is running locally on port 11434 and backend has connectivity.'
        };
      });
    } finally {
      setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  void _clearChat() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear Chat?'),
        content: const Text('Delete all message history?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() {
                _messages.clear();
                _messages.add({
                  'role': 'assistant',
                  'content': 'Hello! Ask me anything about crop care, soil, pests, irrigation, or schemes.'
                });
                _errorDetails = null;
              });
              final prefs = await SharedPreferences.getInstance();
              await prefs.remove('mobile_chat_history');
            },
            child: const Text('Clear', style: TextStyle(color: AppColors.danger)),
          )
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('AI Farming Assistant', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text('Ollama Local LLM', style: TextStyle(fontSize: 12, color: Colors.greenAccent)),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                onPressed: _clearChat,
              )
            ],
          ),
        ),
        const Divider(height: 1),

        // Chat messages body
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_loading ? 1 : 0) + (_errorDetails != null ? 1 : 0),
            itemBuilder: (ctx, idx) {
              if (idx == _messages.length && _loading) {
                return _buildLoadingBubble();
              }
              if (idx == _messages.length + (_loading ? 1 : 0) && _errorDetails != null) {
                return _buildErrorCard();
              }
              
              final msg = _messages[idx];
              final isUser = msg['role'] == 'user';
              
              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  padding: const EdgeInsets.all(14),
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.primary : AppColors.bgCardDark,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isUser ? const Radius.circular(16) : Radius.zero,
                      bottomRight: isUser ? Radius.zero : const Radius.circular(16),
                    ),
                    border: isUser ? null : Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    msg['content'] ?? '',
                    style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.white),
                  ),
                ),
              );
            },
          ),
        ),

        // Chat Input box
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(
                    hintText: 'Ask about crop care, fertilizers, schemes...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(30))),
                    contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              CircleAvatar(
                backgroundColor: AppColors.primary,
                child: IconButton(
                  icon: const Icon(Icons.send, color: Colors.white, size: 18),
                  onPressed: _handleSend,
                ),
              )
            ],
          ),
        )
      ],
    );
  }

  Widget _buildLoadingBubble() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.bgCardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
        ),
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.danger),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.warning_amber_rounded, color: Colors.redAccent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _errorDetails?['message'] ?? 'AI service offline',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.redAccent),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_errorDetails?['detail'] ?? '', style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

// ==========================================
// 📷 TAB 3: CROP DISEASE DETECTION
// ==========================================
class ScanTab extends StatefulWidget {
  const ScanTab({super.key});

  @override
  State<ScanTab> createState() => _ScanTabState();
}

class _ScanTabState extends State<ScanTab> {
  File? _imageFile;
  bool _loading = false;
  String _error = '';
  Map<String, dynamic>? _result;

  final _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    setState(() {
      _error = '';
      _result = null;
    });
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 85);
      if (picked != null) {
        setState(() {
          _imageFile = File(picked.path);
        });
      }
    } catch (e) {
      setState(() => _error = 'Failed to capture or select image.');
    }
  }

  Future<void> _analyze() async {
    if (_imageFile == null || _loading) return;

    setState(() {
      _loading = true;
      _error = '';
      _result = null;
    });

    final state = Provider.of<AppState>(context, listen: false);

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${state.apiUrl}/disease/scan')
      );
      request.headers['Authorization'] = 'Bearer ${state.token}';
      request.files.add(
        await http.MultipartFile.fromPath('image', _imageFile!.path)
      );

      final streamedRes = await request.send();
      final res = await http.Response.fromStream(streamedRes);
      
      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        setState(() {
          _result = data;
        });
      } else {
        setState(() {
          _error = data['message'] ?? 'Image classification failed.';
        });
      }
    } catch (e) {
      setState(() => _error = 'Classifier connection failed.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AI Crop Disease Detection', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text('Take a picture of plant leaf to diagnose disease instantly', style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 20),

            if (_error.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.danger),
                ),
                child: Text(_error, style: const TextStyle(color: Colors.redAccent)),
              ),
              const SizedBox(height: 16),
            ],

            // Photo Capture preview box
            Container(
              height: 260,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: _imageFile != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.file(_imageFile!, fit: BoxFit.cover),
                    )
                  : Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.photo_camera, size: 64, color: AppColors.primary),
                          onPressed: () => _pickImage(ImageSource.camera),
                        ),
                        const Text('Capture Leaf Photo', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 16),
                        const Text('OR'),
                        TextButton(
                          onPressed: () => _pickImage(ImageSource.gallery),
                          child: const Text('Upload from Gallery', style: TextStyle(color: AppColors.secondary)),
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 20),

            if (_imageFile != null && !_loading) ...[
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, height: 48),
                      icon: const Icon(Icons.analytics, color: Colors.white),
                      label: const Text('Diagnose Leaf', style: TextStyle(color: Colors.white)),
                      onPressed: _analyze,
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(height: 48),
                    onPressed: () => setState(() => _imageFile = null),
                    child: const Text('Clear'),
                  )
                ],
              ),
              const SizedBox(height: 24),
            ],

            if (_loading) ...[
              const Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(color: AppColors.primary),
                    SizedBox(height: 12),
                    Text('Analyzing plant dataset tensors...'),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Diagnosis results card
            if (_result != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.bgCardDark,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: _result!['confidenceTooLow'] == true
                    ? Row(
                        children: [
                          const Icon(Icons.shield_alert, size: 40, color: AppColors.secondary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Low Confidence Diagnosis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 4),
                                Text(_result!['message'] ?? ''),
                              ],
                            ),
                          )
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Diagnosis Result', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          const Divider(height: 24),
                          _buildResultRow('CROP', _result!['crop']),
                          const SizedBox(height: 12),
                          _buildResultRow('DIAGNOSIS', _result!['disease']),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _buildResultRow('SEVERITY', _result!['severity']),
                              _buildResultRow('CONFIDENCE', '${_result!['confidence']}%'),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.auto_awesome, color: AppColors.secondary, size: 16),
                                    SizedBox(width: 8),
                                    Text('Treatment Recommendation:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(_result!['recommendation'] ?? '', style: const TextStyle(fontSize: 13, height: 1.4)),
                              ],
                            ),
                          )
                        ],
                      ),
              )
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
      ],
    );
  }
}

// ==========================================
// 🏪 TAB 4: STORE SCREEN
// ==========================================
class StoreTab extends StatefulWidget {
  const StoreTab({super.key});

  @override
  State<StoreTab> createState() => _StoreTabState();
}

class _StoreTabState extends State<StoreTab> {
  List<dynamic> _products = [];
  List<dynamic> _categories = [];
  String _selectedCat = '';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    _fetchProducts();
  }

  Future<void> _fetchCategories() async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.get(Uri.parse('${state.apiUrl}/products/categories'));
      if (res.statusCode == 200) {
        setState(() {
          _categories = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Store categories error: $e');
    }
  }

  Future<void> _fetchProducts() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      String queryUrl = '${state.apiUrl}/products';
      if (_selectedCat.isNotEmpty) {
        queryUrl += '?category=${Uri.encodeComponent(_selectedCat)}';
      }
      final res = await http.get(Uri.parse(queryUrl));
      if (res.statusCode == 200) {
        setState(() {
          _products = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Store products error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agro Store'),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CartScreen())
                ),
              ),
              if (state.cart['items']?.length > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: CircleAvatar(
                    radius: 8,
                    backgroundColor: AppColors.secondary,
                    child: Text(
                      '${state.cart['items'].length}',
                      style: const TextStyle(fontSize: 10, color: Colors.black, fontWeight: FontWeight.bold),
                    ),
                  ),
                )
            ],
          )
        ],
      ),
      body: Column(
        children: [
          // Categories bar horizontal list
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: const Text('All'),
                    selected: _selectedCat == '',
                    selectedColor: AppColors.primary,
                    onSelected: (val) {
                      setState(() => _selectedCat = '');
                      _fetchProducts();
                    },
                  ),
                ),
                ..._categories.map((cat) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(cat),
                      selected: _selectedCat == cat,
                      selectedColor: AppColors.primary,
                      onSelected: (val) {
                        setState(() => _selectedCat = cat);
                        _fetchProducts();
                      },
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Catalog List
          Expanded(
            child: _loading 
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _products.isNotEmpty
                    ? ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _products.length,
                        itemBuilder: (ctx, idx) {
                          final prod = _products[idx];
                          return Card(
                            color: AppColors.bgCardDark,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: AppColors.border),
                            ),
                            margin: const EdgeInsets.bottom(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Picture placeholder
                                Container(
                                  height: 160,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: Colors.black12,
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                    image: prod['image'] != null
                                        ? DecorationImage(
                                            image: NetworkImage(prod['image']),
                                            fit: BoxFit.cover,
                                          )
                                        : null,
                                  ),
                                  child: prod['image'] == null
                                      ? const Icon(Icons.image, size: 48, color: Colors.grey)
                                      : null,
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        prod['name'] ?? '',
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        prod['description'] ?? '',
                                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '₹${prod['price']}',
                                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.extrabold, color: AppColors.secondary),
                                          ),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                            onPressed: prod['availability'] == true
                                                ? () async {
                                                    final res = await state.addToCart(prod['_id']);
                                                    if (mounted) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        SnackBar(
                                                          content: Text(res['success'] 
                                                              ? 'Added ${prod['name']} to cart!' 
                                                              : res['error'] ?? 'Cart failed.'),
                                                          backgroundColor: res['success'] ? AppColors.primary : AppColors.danger,
                                                        ),
                                                      );
                                                    }
                                                  }
                                                : null,
                                            child: const Text('Add to Cart', style: TextStyle(color: Colors.white)),
                                          )
                                        ],
                                      ),
                                      const Divider(height: 24),
                                      Text('Seller: ${prod['store']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      if (prod['location'] != null) ...[
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on, size: 12, color: AppColors.textSecondary),
                                            const SizedBox(width: 4),
                                            Expanded(
                                              child: Text(
                                                prod['location']['address'] ?? '',
                                                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                              ),
                                            )
                                          ],
                                        )
                                      ]
                                    ],
                                  ),
                                )
                              ],
                            ),
                          );
                        },
                      )
                    : const Center(child: Text('No products available.')),
          )
        ],
      ),
    );
  }
}

// ==========================================
// 👤 TAB 5: PROFILE SCREEN
// ==========================================
class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _loading = false;
  String _message = '';

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _experienceController = TextEditingController();
  final _landAreaController = TextEditingController();
  final _addressController = TextEditingController();
  final _districtController = TextEditingController();
  final _stateController = TextEditingController();

  List<String> _selectedCrops = [];

  final List<String> _availableCrops = [
    'Wheat',
    'Rice',
    'Cotton',
    'Tomato',
    'Sugarcane',
    'Maize',
    'Chilli',
    'Groundnut',
    'Potato',
    'Apple'
  ];

  @override
  void initState() {
    super.initState();
    final state = Provider.of<AppState>(context, listen: false);
    final user = state.user;
    if (user != null) {
      _nameController.text = user['name'] ?? '';
      _emailController.text = user['email'] ?? '';
      _experienceController.text = user['farmingExperience']?.toString() ?? '0';
      _landAreaController.text = user['landArea']?.toString() ?? '0';
      _addressController.text = user['location']?['address'] ?? '';
      _districtController.text = user['location']?['district'] ?? '';
      _stateController.text = user['location']?['state'] ?? '';
      _selectedCrops = List<String>.from(user['crops'] ?? []);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _experienceController.dispose();
    _landAreaController.dispose();
    _addressController.dispose();
    _districtController.dispose();
    _stateController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    setState(() {
      _loading = true;
      _message = '';
    });

    final state = Provider.of<AppState>(context, listen: false);

    final payload = {
      'name': _nameController.text,
      'email': _emailController.text,
      'farmingExperience': int.tryParse(_experienceController.text) ?? 0,
      'landArea': double.tryParse(_landAreaController.text) ?? 0.0,
      'crops': _selectedCrops,
      'preferredLanguage': state.language,
      'location': {
        'lat': state.location['lat'],
        'lng': state.location['lng'],
        'address': _addressController.text,
        'state': _stateController.text,
        'district': _districtController.text,
      }
    };

    final res = await state.updateProfile(payload);
    setState(() => _loading = false);

    if (res['success']) {
      setState(() => _message = 'Profile updated successfully!');
      Timer(const Duration(seconds: 3), () {
        if (mounted) setState(() => _message = '');
      });
    } else {
      setState(() => _message = res['error'] ?? 'Profile save failed.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(state.t('profile')),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.danger),
            onPressed: () {
              state.setToken('');
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const WelcomeScreen())
              );
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_message.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  border: Border.all(color: AppColors.primary),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_message, style: const TextStyle(color: Colors.greenAccent)),
              ),
              const SizedBox(height: 16),
            ],

            // User basic input
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Full Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _experienceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Experience (Years)', border: OutlineInputBorder()),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    controller: _landAreaController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Land Area (Acres)', border: OutlineInputBorder()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Language Selector Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Language settings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  DropdownButton<String>(
                    value: state.language,
                    isExpanded: true,
                    onChanged: (lang) {
                      if (lang != null) {
                        state.setLanguage(lang);
                      }
                    },
                    items: const [
                      DropdownMenuItem(value: 'en', child: Text('English')),
                      DropdownMenuItem(value: 'hi', child: Text('हिन्दी (Hindi)')),
                      DropdownMenuItem(value: 'mr', child: Text('मराठी (Marathi)')),
                      DropdownMenuItem(value: 'ta', child: Text('தமிழ் (Tamil)')),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Location manual setup card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Location Coordinates', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _addressController,
                    decoration: const InputDecoration(labelText: 'Address', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _districtController,
                          decoration: const InputDecoration(labelText: 'District', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _stateController,
                          decoration: const InputDecoration(labelText: 'State', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Crop Selections checkboxes
            const Text('My Main Crops', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableCrops.map((cropName) {
                final isSelected = _selectedCrops.includes(cropName);
                return FilterChip(
                  label: Text(cropName),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  onSelected: (val) {
                    setState(() {
                      if (val) {
                        _selectedCrops.add(cropName);
                      } else {
                        _selectedCrops.remove(cropName);
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                onPressed: _loading ? null : _saveProfile,
                child: _loading 
                    ? const CircularProgressIndicator(color: Colors.white) 
                    : Text(state.t('saveChanges'), style: const TextStyle(fontSize: 16, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 🛒 SUB-SCREEN: SHOPPING CART
// ==========================================
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _loading = false;
  String _warning = '';

  double _calculateSubtotal(Map<String, dynamic> cart) {
    double total = 0;
    if (cart['items'] == null) return 0;
    for (var item in cart['items']) {
      final price = (item['productId']?['price'] ?? 0).toDouble();
      total += price * item['quantity'];
    }
    return total;
  }

  Future<void> _handleCheckout() async {
    setState(() {
      _loading = true;
      _warning = '';
    });
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/products/checkout'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      final data = jsonDecode(res.body);
      if (data['paymentConfigRequired'] == true) {
        setState(() => _warning = data['message']);
      }
    } catch (e) {
      setState(() => _warning = 'Checkout initialized failed.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final items = state.cart['items'] ?? [];

    return Scaffold(
      appBar: AppBar(title: const Text('Shopping Cart')),
      body: Column(
        children: [
          if (_warning.isNotEmpty) ...[
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.secondary),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_alert, color: AppColors.secondary, size: 36),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Setup Required', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary)),
                        const SizedBox(height: 4),
                        Text(_warning, style: const TextStyle(fontSize: 12)),
                      ],
                    ),
                  )
                ],
              ),
            )
          ],
          Expanded(
            child: items.isNotEmpty
                ? ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    itemBuilder: (ctx, idx) {
                      final item = items[idx];
                      final prod = item['productId'];
                      if (prod == null) return const SizedBox.shrink();

                      return Card(
                        color: AppColors.bgCardDark,
                        child: ListTile(
                          title: Text(prod['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Qty: ${item['quantity']} • ₹${prod['price']} each'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove, size: 18),
                                onPressed: item['quantity'] > 1 
                                    ? () => state.updateCartQty(prod['_id'], item['quantity'] - 1)
                                    : null,
                              ),
                              IconButton(
                                icon: const Icon(Icons.add, size: 18),
                                onPressed: () => state.updateCartQty(prod['_id'], item['quantity'] + 1),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete, color: AppColors.danger),
                                onPressed: () => state.removeFromCart(prod['_id']),
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  )
                : const Center(child: Text('Your cart is empty.')),
          ),
          if (items.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(
                        '₹${_calculateSubtotal(state.cart).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.extrabold, color: AppColors.secondary),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: _loading ? null : _handleCheckout,
                      child: _loading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Checkout', style: TextStyle(fontSize: 16, color: Colors.white)),
                    ),
                  )
                ],
              ),
            )
        ],
      ),
    );
  }
}

// ==========================================
// 🏛️ SUB-SCREEN: GOVT SCHEMES
// ==========================================
class GovSchemesScreen extends StatefulWidget {
  const GovSchemesScreen({super.key});

  @override
  State<GovSchemesScreen> createState() => _GovSchemesScreenState();
}

class _GovSchemesScreenState extends State<GovSchemesScreen> {
  List<dynamic> _schemes = [];
  Map<String, String> _userStates = {};
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetchSchemes();
    _fetchUserStates();
  }

  Future<void> _fetchSchemes() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      final res = await http.get(Uri.parse('${state.apiUrl}/schemes'));
      if (res.statusCode == 200) {
        setState(() {
          _schemes = jsonDecode(res.body);
        });
      }
    } catch (e) {
      debugPrint('Gov schemes list error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchUserStates() async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/schemes/user-states'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final Map<String, String> statesMap = {};
        for (var item in data) {
          statesMap[item['schemeId']] = item['status'];
        }
        setState(() => _userStates = statesMap);
      }
    } catch (e) {
      debugPrint('Gov schemes states error: $e');
    }
  }

  Future<void> _updateState(String schemeId, String status) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/schemes/update-state'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}'
        },
        body: jsonEncode({'schemeId': schemeId, 'status': status})
      );
      if (res.statusCode == 200) {
        setState(() {
          _userStates[schemeId] = status;
        });
      }
    } catch (e) {
      debugPrint('Update scheme status error: $e');
    }
  }

  Future<void> _openPortalUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open portal link.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Government Schemes')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _schemes.length,
              itemBuilder: (ctx, idx) {
                final scheme = _schemes[idx];
                final status = _userStates[scheme['id']] ?? 'Not Applied';

                return Card(
                  color: AppColors.bgCardDark,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  margin: const EdgeInsets.bottom(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                scheme['name'] ?? '',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                            const SizedBox(width: 8),
                            DropdownButton<String>(
                              value: status,
                              onChanged: (val) {
                                if (val != null) _updateState(scheme['id'], val);
                              },
                              items: const [
                                DropdownMenuItem(value: 'Not Applied', child: Text('Not Applied')),
                                DropdownMenuItem(value: 'Interested', child: Text('Interested')),
                                DropdownMenuItem(value: 'Applied', child: Text('Applied')),
                                DropdownMenuItem(value: 'Completed', child: Text('Completed')),
                              ],
                            )
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(scheme['description'] ?? '', style: const TextStyle(fontSize: 13, height: 1.4)),
                        const SizedBox(height: 12),
                        const Divider(),
                        _buildDetailText('Eligibility:', scheme['eligibility']),
                        _buildDetailText('Benefits:', scheme['benefits']),
                        _buildDetailText('Required Documents:', scheme['requiredDocuments']),
                        const Divider(),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: () => _openPortalUrl(scheme['officialLink'] ?? 'https://pmkisan.gov.in/'),
                          icon: const Icon(Icons.open_in_new, size: 16, color: Colors.white),
                          label: const Text('Apply Now (Official Website)', style: TextStyle(color: Colors.white)),
                        )
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }

  Widget _buildDetailText(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 12, fontFamily: 'Outfit'),
          children: [
            TextSpan(text: '$label ', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
            TextSpan(text: value, style: const TextStyle(color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 💰 SUB-SCREEN: MANDI PRICES
// ==========================================
class MarketPricesScreen extends StatefulWidget {
  const MarketPricesScreen({super.key});

  @override
  State<MarketPricesScreen> createState() => _MarketPricesScreenState();
}

class _MarketPricesScreenState extends State<MarketPricesScreen> {
  List<dynamic> _markets = [];
  List<dynamic> _crops = [];
  String _selectedCrop = '';
  String _sortBy = 'distance';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetchCrops();
    _fetchMarkets();
  }

  Future<void> _fetchCrops() async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.get(Uri.parse('${state.apiUrl}/market/crops'));
      if (res.statusCode == 200) {
        setState(() => _crops = jsonDecode(res.body));
      }
    } catch (e) {
      debugPrint('Market crops load error: $e');
    }
  }

  Future<void> _fetchMarkets() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      String queryUrl = '${state.apiUrl}/market?lat=${state.location['lat']}&lng=${state.location['lng']}&sortBy=$_sortBy';
      if (_selectedCrop.isNotEmpty) {
        queryUrl += '&crop=${Uri.encodeComponent(_selectedCrop)}';
      }
      final res = await http.get(Uri.parse(queryUrl));
      if (res.statusCode == 200) {
        setState(() => _markets = jsonDecode(res.body));
      }
    } catch (e) {
      debugPrint('Market list load error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _getDirections(String directionsUrl) async {
    final Uri url = Uri.parse(directionsUrl);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open map navigation.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mandi Commodity Prices')),
      body: Column(
        children: [
          // Filter Toolbar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedCrop.isEmpty ? null : _selectedCrop,
                    decoration: const InputDecoration(labelText: 'Crop Filter', border: OutlineInputBorder()),
                    onChanged: (val) {
                      setState(() => _selectedCrop = val ?? '');
                      _fetchMarkets();
                    },
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All Crops')),
                      ..._crops.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _sortBy,
                    decoration: const InputDecoration(labelText: 'Sort Mandis', border: OutlineInputBorder()),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _sortBy = val);
                        _fetchMarkets();
                      }
                    },
                    items: const [
                      DropdownMenuItem(value: 'distance', child: Text('Nearest (GPS)')),
                      DropdownMenuItem(value: 'name', child: Text('Mandi Name')),
                    ],
                  ),
                )
              ],
            ),
          ),

          // Markets mandis list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _markets.length,
                    itemBuilder: (ctx, idx) {
                      final mkt = _markets[idx];
                      final prices = mkt['prices'] as List<dynamic>;

                      return Card(
                        color: AppColors.bgCardDark,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.border),
                        ),
                        margin: const EdgeInsets.bottom(16),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      mkt['name'] ?? '',
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ),
                                  if (mkt['distance'] != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.secondary.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Text(
                                        '${mkt['distance']} km',
                                        style: const TextStyle(color: AppColors.secondary, fontSize: 11, fontWeight: FontWeight.bold),
                                      ),
                                    )
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(mkt['address'] ?? '', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              const SizedBox(height: 12),
                              
                              // Mandi commodity rates table
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.black12,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.border.withOpacity(0.3)),
                                ),
                                child: Column(
                                  children: prices.map((p) {
                                    return Padding(
                                      padding: const EdgeInsets.all(10.0),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${p['crop']} (${p['variety']})',
                                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                          ),
                                          Text(
                                            '₹${p['price']} / ${p['unit']}',
                                            style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold, fontSize: 13),
                                          )
                                        ],
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ),
                              const SizedBox(height: 12),
                              
                              Text('Source: ${mkt['source']}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              const SizedBox(height: 12),
                              
                              SizedBox(
                                width: double.infinity,
                                height: 44,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                                  onPressed: () => _getDirections(mkt['directionsUrl'] ?? ''),
                                  icon: const Icon(Icons.navigation, color: Colors.white, size: 16),
                                  label: const Text('Get Directions (Google Maps)', style: TextStyle(color: Colors.white)),
                                ),
                              )
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          )
        ],
      ),
    );
  }
}

// ==========================================
// 💧 SUB-SCREEN: WATER MANAGEMENT
// ==========================================
class WaterManagementScreen extends StatefulWidget {
  const WaterManagementScreen({super.key});

  @override
  State<WaterManagementScreen> createState() => _WaterManagementScreenState();
}

class _WaterManagementScreenState extends State<WaterManagementScreen> {
  List<dynamic> _schedules = [];
  bool _loading = false;
  String _error = '';

  final _cropController = TextEditingController();
  final _fieldSizeController = TextEditingController();
  final _plantingDateController = TextEditingController();
  String _soilType = 'Loamy Soil';
  String _irrigationMethod = 'Drip Irrigation';

  @override
  void initState() {
    super.initState();
    _fetchSchedules();
  }

  @override
  void dispose() {
    _cropController.dispose();
    _fieldSizeController.dispose();
    _plantingDateController.dispose();
    super.dispose();
  }

  Future<void> _fetchSchedules() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/water'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        setState(() => _schedules = jsonDecode(res.body));
      }
    } catch (e) {
      debugPrint('Water schedules load error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createSchedule() async {
    if (_cropController.text.isEmpty || _fieldSizeController.text.isEmpty || _plantingDateController.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/water'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        },
        body: jsonEncode({
          'crop': _cropController.text,
          'fieldSize': double.tryParse(_fieldSizeController.text) ?? 1.0,
          'soilType': _soilType,
          'plantingDate': _plantingDateController.text,
          'irrigationMethod': _irrigationMethod,
        }),
      );
      if (res.statusCode == 201) {
        _cropController.clear();
        _fieldSizeController.clear();
        _plantingDateController.clear();
        _fetchSchedules();
      } else {
        setState(() => _error = 'Failed to create schedule.');
      }
    } catch (e) {
      setState(() => _error = 'Water schedule creation server error.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleReminder(String id, bool currentVal) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.put(
        Uri.parse('${state.apiUrl}/water/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}'
        },
        body: jsonEncode({'remindersEnabled': !currentVal})
      );
      if (res.statusCode == 200) {
        _fetchSchedules();
      }
    } catch (e) {
      debugPrint('Toggle reminder error: $e');
    }
  }

  Future<void> _deleteSchedule(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.delete(
        Uri.parse('${state.apiUrl}/water/$id'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        _fetchSchedules();
      }
    } catch (e) {
      debugPrint('Delete water schedule error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Water Management')),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Advisory Notice Warning
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.greenAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Advisory Recommendations Notice: Predicted frequencies are calculations and guidelines. Review crop details on field directly.',
                        style: TextStyle(fontSize: 11, color: Colors.greenAccent.shade100),
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (_error.isNotEmpty) ...[
                Text(_error, style: const TextStyle(color: AppColors.danger)),
                const SizedBox(height: 12),
              ],

              // Creation Form
              const Text('Add Watering Schedule', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _cropController,
                decoration: const InputDecoration(labelText: 'Crop', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _fieldSizeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Size (Acres)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _soilType,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      onChanged: (val) => setState(() => _soilType = val ?? 'Loamy Soil'),
                      items: const [
                        DropdownMenuItem(value: 'Loamy Soil', child: Text('Loamy')),
                        DropdownMenuItem(value: 'Sandy Soil', child: Text('Sandy')),
                        DropdownMenuItem(value: 'Clay Soil', child: Text('Clay')),
                        DropdownMenuItem(value: 'Black Cotton Soil', child: Text('Black Soil')),
                      ],
                    ),
                  )
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _plantingDateController,
                      decoration: const InputDecoration(labelText: 'Planting Date (YYYY-MM-DD)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _irrigationMethod,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      onChanged: (val) => setState(() => _irrigationMethod = val ?? 'Drip Irrigation'),
                      items: const [
                        DropdownMenuItem(value: 'Drip Irrigation', child: Text('Drip')),
                        DropdownMenuItem(value: 'Sprinkler Irrigation', child: Text('Sprinkler')),
                        DropdownMenuItem(value: 'Flood Irrigation', child: Text('Flood')),
                      ],
                    ),
                  )
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _loading ? null : _createSchedule,
                  child: const Text('Generate Water Schedule', style: TextStyle(color: Colors.white)),
                ),
              ),
              const SizedBox(height: 24),

              // Schedules lists
              const Text('Active Planners', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              _loading && _schedules.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _schedules.isNotEmpty
                      ? Column(
                          children: _schedules.map((s) {
                            final next = DateTime.parse(s['nextWatering']);
                            final bool reminders = s['remindersEnabled'] ?? true;
                            
                            return Card(
                              color: AppColors.bgCardDark,
                              child: ListTile(
                                title: Text('${s['crop']} - ${s['fieldSize']} Acres'),
                                subtitle: Text('Next Watering: ${next.day}/${next.month} ${next.hour}:00'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: Icon(reminders ? Icons.notifications : Icons.notifications_off,
                                          color: reminders ? AppColors.secondary : Colors.grey),
                                      onPressed: () => _toggleReminder(s['_id'], reminders),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete, color: AppColors.danger),
                                      onPressed: () => _deleteSchedule(s['_id']),
                                    )
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        )
                      : const Center(child: Text('No schedules active.')),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 🌱 SUB-SCREEN: FERTILIZER SCHEDULE
// ==========================================
class FertilizerScheduleScreen extends StatefulWidget {
  const FertilizerScheduleScreen({super.key});

  @override
  State<FertilizerScheduleScreen> createState() => _FertilizerScheduleScreenState();
}

class _FertilizerScheduleScreenState extends State<FertilizerScheduleScreen> {
  List<dynamic> _schedules = [];
  bool _loading = false;
  String _error = '';

  final _cropController = TextEditingController();
  final _fieldSizeController = TextEditingController();
  final _plantingDateController = TextEditingController();
  String _growthStage = 'Vegetative Stage';
  String _soilInfo = 'Loamy Soil';

  @override
  void initState() {
    super.initState();
    _fetchSchedules();
  }

  @override
  void dispose() {
    _cropController.dispose();
    _fieldSizeController.dispose();
    _plantingDateController.dispose();
    super.dispose();
  }

  Future<void> _fetchSchedules() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/fertilizer'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        setState(() => _schedules = jsonDecode(res.body));
      }
    } catch (e) {
      debugPrint('Fertilizer schedules load error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _createSchedule() async {
    if (_cropController.text.isEmpty || _fieldSizeController.text.isEmpty || _plantingDateController.text.isEmpty) {
      setState(() => _error = 'Please fill in all fields.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/fertilizer'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        },
        body: jsonEncode({
          'crop': _cropController.text,
          'fieldSize': double.tryParse(_fieldSizeController.text) ?? 1.0,
          'growthStage': _growthStage,
          'soilInfo': _soilInfo,
          'plantingDate': _plantingDateController.text,
        }),
      );
      if (res.statusCode == 201) {
        _cropController.clear();
        _fieldSizeController.clear();
        _plantingDateController.clear();
        _fetchSchedules();
      } else {
        setState(() => _error = 'Failed to create schedule.');
      }
    } catch (e) {
      setState(() => _error = 'Fertilizer schedule creation server error.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _toggleReminder(String id, bool currentVal) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.put(
        Uri.parse('${state.apiUrl}/fertilizer/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}'
        },
        body: jsonEncode({'remindersEnabled': !currentVal})
      );
      if (res.statusCode == 200) {
        _fetchSchedules();
      }
    } catch (e) {
      debugPrint('Toggle reminder error: $e');
    }
  }

  Future<void> _deleteSchedule(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.delete(
        Uri.parse('${state.apiUrl}/fertilizer/$id'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        _fetchSchedules();
      }
    } catch (e) {
      debugPrint('Delete fertilizer schedule error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fertilizer Planner')),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Chemical dosage advisory notice
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.brown.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.brown),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.orangeAccent),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Chemical Application Notice: Fertilizer suggestions are general guidelines. Conduct local soil nutrient tests before applying chemical dosages.',
                        style: TextStyle(fontSize: 11, color: Colors.orangeAccent),
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (_error.isNotEmpty) ...[
                Text(_error, style: const TextStyle(color: AppColors.danger)),
                const SizedBox(height: 12),
              ],

              // Creation Form
              const Text('Add Nutrient Plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _cropController,
                decoration: const InputDecoration(labelText: 'Crop', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _growthStage,
                      decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Growth Stage'),
                      onChanged: (val) => setState(() => _growthStage = val ?? 'Vegetative Stage'),
                      items: const [
                        DropdownMenuItem(value: 'Germination / Seedling', child: Text('Seedling')),
                        DropdownMenuItem(value: 'Vegetative Stage', child: Text('Vegetative')),
                        DropdownMenuItem(value: 'Flowering Stage', child: Text('Flowering')),
                        DropdownMenuItem(value: 'Fruiting / Grain Fill', child: Text('Fruiting')),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _soilInfo,
                      decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Soil Info'),
                      onChanged: (val) => setState(() => _soilInfo = val ?? 'Loamy Soil'),
                      items: const [
                        DropdownMenuItem(value: 'Loamy Soil', child: Text('Loamy')),
                        DropdownMenuItem(value: 'Sandy Soil', child: Text('Sandy')),
                        DropdownMenuItem(value: 'Clay Soil', child: Text('Clay')),
                      ],
                    ),
                  )
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _plantingDateController,
                      decoration: const InputDecoration(labelText: 'Planting Date (YYYY-MM-DD)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _fieldSizeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Acres', border: OutlineInputBorder()),
                    ),
                  )
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _loading ? null : _createSchedule,
                  child: const Text('Generate Fertilizer Plan', style: TextStyle(color: Colors.white)),
                ),
              ),
              const SizedBox(height: 24),

              // Planners List
              const Text('Active Planners', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              _loading && _schedules.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _schedules.isNotEmpty
                      ? Column(
                          children: _schedules.map((s) {
                            final next = DateTime.parse(s['nextApplication']);
                            final bool reminders = s['remindersEnabled'] ?? true;
                            
                            return Card(
                              color: AppColors.bgCardDark,
                              child: ListTile(
                                title: Text('${s['crop']} - ${s['fertilizerType']}'),
                                subtitle: Text('Next Feed: ${next.day}/${next.month}/${next.year}'),
                                trailing: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: Icon(reminders ? Icons.notifications : Icons.notifications_off,
                                          color: reminders ? AppColors.secondary : Colors.grey),
                                      onPressed: () => _toggleReminder(s['_id'], reminders),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.delete, color: AppColors.danger),
                                      onPressed: () => _deleteSchedule(s['_id']),
                                    )
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        )
                      : const Center(child: Text('No nutrient logs active.')),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 🔔 SUB-SCREEN: NOTIFICATIONS HISTORY
// ==========================================
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    final state = Provider.of<AppState>(context, listen: false);
    setState(() => _loading = true);
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/notifications'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        setState(() {
          _notifications = jsonDecode(res.body);
        });
        state.fetchUnreadCount(); // Sync count
      }
    } catch (e) {
      debugPrint('Notifications load error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _markRead(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.put(
        Uri.parse('${state.apiUrl}/notifications/$id/read'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        setState(() {
          _notifications = _notifications.map((n) {
            if (n['_id'] == id) n['read'] = true;
            return n;
          }).toList();
        });
        state.fetchUnreadCount();
      }
    } catch (e) {
      debugPrint('Mark notification read error: $e');
    }
  }

  Future<void> _delete(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.delete(
        Uri.parse('${state.apiUrl}/notifications/$id'),
        headers: {'Authorization': 'Bearer ${state.token}'}
      );
      if (res.statusCode == 200) {
        setState(() {
          _notifications = _notifications.filter((n) => n['_id'] != id);
        });
        state.fetchUnreadCount();
      }
    } catch (e) {
      debugPrint('Delete notification error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alerts Center')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _notifications.isNotEmpty
              ? ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _notifications.length,
                  itemBuilder: (ctx, idx) {
                    final n = _notifications[idx];
                    final bool isUnread = n['read'] == false;

                    return Card(
                      color: AppColors.bgCardDark,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isUnread ? AppColors.secondary.withOpacity(0.3) : AppColors.border
                        ),
                      ),
                      margin: const EdgeInsets.bottom(12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isUnread ? AppColors.secondary.withOpacity(0.1) : Colors.transparent,
                          child: Icon(Icons.notifications, color: isUnread ? AppColors.secondary : Colors.grey),
                        ),
                        title: Text(n['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(n['message'] ?? '', style: const TextStyle(fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(
                              n['category'] ?? '',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                            )
                          ],
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (isUnread)
                              IconButton(
                                icon: const Icon(Icons.check, color: AppColors.primary),
                                onPressed: () => _markRead(n['_id']),
                              ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                              onPressed: () => _delete(n['_id']),
                            )
                          ],
                        ),
                      ),
                    );
                  },
                )
              : const Center(child: Text('No notifications history.')),
    );
  // ==========================================
// 💬 SUB-SCREEN: COMMUNITY FORUM
// ==========================================
class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  List<dynamic> _messages = [];
  bool _loading = false;
  String _activeTab = 'all'; // 'all', 'my', 'replies'
  Timer? _timer;

  final TextEditingController _postController = TextEditingController();
  final Map<String, TextEditingController> _replyControllers = {};
  final Map<String, bool> _expandedReplies = {};

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _fetchMessages());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _postController.dispose();
    for (var c in _replyControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchMessages() async {
    final state = Provider.of<AppState>(context, listen: false);
    if (state.token.isEmpty) return;
    if (_messages.isEmpty) {
      setState(() => _loading = true);
    }
    try {
      final res = await http.get(
        Uri.parse('${state.apiUrl}/community'),
        headers: {'Authorization': 'Bearer ${state.token}'},
      );
      if (res.statusCode == 200) {
        if (mounted) {
          setState(() {
            _messages = jsonDecode(res.body);
          });
        }
      }
    } catch (e) {
      debugPrint('Community load error: $e');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _createPost() async {
    final state = Provider.of<AppState>(context, listen: false);
    final content = _postController.text.trim();
    if (content.isEmpty) return;

    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/community'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        },
        body: jsonEncode({'content': content}),
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        _postController.clear();
        if (mounted) {
          Navigator.pop(context); // Close dialog
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Post published successfully!')),
          );
        }
        _fetchMessages();
      }
    } catch (e) {
      debugPrint('Create post error: $e');
    }
  }

  Future<void> _likePost(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/community/$id/like'),
        headers: {'Authorization': 'Bearer ${state.token}'},
      );
      if (res.statusCode == 200) {
        final updatedMsg = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _messages = _messages.map((m) => m['_id'] == id ? updatedMsg : m).toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Like error: $e');
    }
  }

  Future<void> _sharePost(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/community/$id/share'),
        headers: {'Authorization': 'Bearer ${state.token}'},
      );
      if (res.statusCode == 200) {
        final updatedMsg = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _messages = _messages.map((m) => m['_id'] == id ? updatedMsg : m).toList();
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Share link copied to clipboard!')),
          );
        }
      }
    } catch (e) {
      debugPrint('Share error: $e');
    }
  }

  Future<void> _submitReply(String id) async {
    final state = Provider.of<AppState>(context, listen: false);
    final controller = _replyControllers[id];
    final content = controller?.text.trim() ?? '';
    if (content.isEmpty) return;

    try {
      final res = await http.post(
        Uri.parse('${state.apiUrl}/community/$id/reply'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        },
        body: jsonEncode({'content': content}),
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        controller?.clear();
        final updatedMsg = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _messages = _messages.map((m) => m['_id'] == id ? updatedMsg : m).toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Reply submit error: $e');
    }
  }

  List<dynamic> _getFilteredMessages(Map<String, dynamic>? currentUser) {
    final userId = currentUser?['_id'] ?? currentUser?['id'];
    if (_activeTab == 'my') {
      return _messages.filter((m) => m['userId'] == userId);
    }
    if (_activeTab == 'replies') {
      return _messages.filter((m) => m['userId'] == userId && m['replies'] != null && (m['replies'] as List).isNotEmpty);
    }
    return _messages;
  }

  String _formatTimeAgo(String? dateStr) {
    if (dateStr == null) return 'Recently';
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      return '${diff.inDays}d ago';
    } catch (_) {
      return 'Recently';
    }
  }

  void _showNewPostDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.bgCardDark,
          title: const Text('Create New Forum Post', style: TextStyle(color: Colors.white)),
          content: TextField(
            controller: _postController,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Share farming queries or updates...',
              hintStyle: TextStyle(color: AppColors.textSecondary),
              border: OutlineInputBorder(),
            ),
            style: const TextStyle(color: Colors.white),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: _createPost,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text('Post', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final user = state.user;
    final filtered = _getFilteredMessages(user);

    return Scaffold(
      appBar: AppBar(
        title: Text(state.t('community')),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment, color: AppColors.secondary),
            onPressed: _showNewPostDialog,
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  color: AppColors.bgCardDark,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildTabButton('all', 'All Posts'),
                      _buildTabButton('my', 'My Posts 📝'),
                      _buildTabButton('replies', 'Replies Box 💬'),
                    ],
                  ),
                ),
                Expanded(
                  child: filtered.isNotEmpty
                      ? ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filtered.length,
                          itemBuilder: (ctx, idx) {
                            final msg = filtered[idx];
                            final id = msg['_id'] ?? '';
                            final likesList = msg['likes'] as List? ?? [];
                            final userId = user?['_id'] ?? user?['id'];
                            final hasLiked = likesList.includes(userId);
                            final repliesList = msg['replies'] as List? ?? [];
                            final isExpanded = _expandedReplies[id] ?? false;

                            if (!_replyControllers.containsKey(id)) {
                              _replyControllers[id] = TextEditingController();
                            }

                            return Card(
                              color: AppColors.bgCardDark,
                              margin: const EdgeInsets.bottom(16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: AppColors.primary.withOpacity(0.2),
                                          child: Text(
                                            (msg['userName'] ?? 'F').substring(0, 1).toUpperCase(),
                                            style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                msg['userName'] ?? 'Anonymous Farmer',
                                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                              ),
                                              Text(
                                                '${msg['userLocation'] ?? 'Global Farmer'} · ${_formatTimeAgo(msg['createdAt'])}',
                                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      msg['content'] ?? '',
                                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                                    ),
                                    const SizedBox(height: 12),
                                    const Divider(color: AppColors.border, height: 1),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        TextButton.icon(
                                          icon: Icon(
                                            Icons.star,
                                            size: 18,
                                            color: hasLiked ? AppColors.secondary : AppColors.textSecondary,
                                          ),
                                          label: Text(
                                            '${likesList.length}',
                                            style: TextStyle(color: hasLiked ? AppColors.secondary : AppColors.textSecondary),
                                          ),
                                          onPressed: () => _likePost(id),
                                        ),
                                        TextButton.icon(
                                          icon: Icon(
                                            Icons.mode_comment,
                                            size: 18,
                                            color: isExpanded ? Colors.greenAccent : AppColors.textSecondary,
                                          ),
                                          label: Text(
                                            '${repliesList.length}',
                                            style: TextStyle(color: isExpanded ? Colors.greenAccent : AppColors.textSecondary),
                                          ),
                                          onPressed: () {
                                            setState(() {
                                              _expandedReplies[id] = !isExpanded;
                                            });
                                          },
                                        ),
                                        TextButton.icon(
                                          icon: const Icon(Icons.share, size: 18, color: AppColors.textSecondary),
                                          label: const Text('Share', style: TextStyle(color: AppColors.textSecondary)),
                                          onPressed: () => _sharePost(id),
                                        ),
                                      ],
                                    ),
                                    if (isExpanded) ...[
                                      const SizedBox(height: 12),
                                      const Divider(color: AppColors.border, height: 1),
                                      const SizedBox(height: 10),
                                      if (repliesList.isNotEmpty)
                                        ...repliesList.map((r) {
                                          return Container(
                                            margin: const EdgeInsets.only(bottom: 8),
                                            padding: const EdgeInsets.all(8),
                                            decoration: BoxDecoration(
                                              color: Colors.black.withOpacity(0.2),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Text(
                                                      r['userName'] ?? 'Farmer Reply',
                                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.greenAccent),
                                                    ),
                                                    Text(
                                                      _formatTimeAgo(r['createdAt']),
                                                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Text(r['content'] ?? '', style: const TextStyle(fontSize: 12, color: Colors.white70)),
                                              ],
                                            ),
                                          );
                                        }).toList()
                                      else
                                        const Padding(
                                          padding: EdgeInsets.symmetric(vertical: 8),
                                          child: Text('No replies yet. Start the conversation!', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                        ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: TextField(
                                              controller: _replyControllers[id],
                                              decoration: const InputDecoration(
                                                hintText: 'Write a reply...',
                                                hintStyle: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                                isDense: true,
                                                border: OutlineInputBorder(),
                                              ),
                                              style: const TextStyle(fontSize: 13, color: Colors.white),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          IconButton(
                                            icon: const Icon(Icons.send, color: AppColors.primary),
                                            onPressed: () => _submitReply(id),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        )
                      : const Center(child: Text('No posts found. Start the forum!')),
                ),
              ],
            ),
    );
  }

  Widget _buildTabButton(String tab, String label) {
    final bool isSelected = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

// Simple dynamic array helper
extension ListFilter<E> on List<E> {
  List<E> filter(bool Function(E element) test) {
    final List<E> result = [];
    for (var element in this) {
      if (test(element)) {
        result.add(element);
      }
    }
    return result;
  }
}

extension ListIncludes<E> on List<E> {
  bool includes(E element) {
    return contains(element);
  }
}
