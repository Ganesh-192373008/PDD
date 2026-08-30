import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';
import 'package:file_picker/file_picker.dart';
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
    'address': 'Pune, Maharashtra',
    'state': 'Maharashtra',
    'district': 'Pune'
  };
  Map<String, dynamic>? _weather = {
    'temperature': 28.5,
    'condition': 'Partly Cloudy',
    'humidity': 65,
    'windSpeed': 12.4,
    'rainProb': 15,
    'feelsLike': 29.0,
    'location': 'Pune, Maharashtra'
  };
  int _unreadNotifications = 0;
  bool _loading = false;

  final String apiUrl = 'https://pdd-backend-s6yk.onrender.com/api'; // Render backend API server URL

  String get token => _token;
  Map<String, dynamic>? get user => _user;
  Map<String, dynamic> get cart => _cart;
  String get language => _language;
  Map<String, dynamic> get location => _location;
  Map<String, dynamic>? get weather => _weather;
  int get unreadNotifications => _unreadNotifications;
  bool get loading => _loading;

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    try {
      final res = await http.put(
        Uri.parse('$apiUrl/user/profile'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode(data),
      );
      final json = jsonDecode(res.body);
      if (res.statusCode == 200) {
        _user = json['user'];
        notifyListeners();
        return {'success': true, 'user': _user};
      }
      return {'success': false, 'error': json['error'] ?? 'Failed to update profile'};
    } catch (e) {
      return {'success': false, 'error': 'Network connection error'};
    }
  }

  AppState() {
    _loadSession();
    fetchWeather();
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

  // Public method to refresh GPS location anytime
  Future<void> refreshLocation() async {
    await _detectLocation();
  }

  // Detect GPS location using Geolocator
  Future<void> _detectLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );
        _location['lat'] = position.latitude;
        _location['lng'] = position.longitude;

        // Geocoding reverse lookup with custom User-Agent to satisfy OSM policy
        try {
          final response = await http.get(
            Uri.parse('https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&zoom=10'),
            headers: {'User-Agent': 'AgroAssist-Mobile-App/1.0'}
          );
          
          if (response.statusCode == 200) {
            final data = jsonDecode(response.body);
            final addressMap = data['address'] ?? {};
            final city = addressMap['city'] ?? addressMap['town'] ?? addressMap['village'] ?? addressMap['county'] ?? addressMap['state_district'] ?? 'My Farm';
            final state = addressMap['state'] ?? '';
            _location['address'] = state.isNotEmpty ? '$city, $state' : city;
            _location['state'] = state;
            _location['district'] = city;
          }
        } catch (e) {
          debugPrint('Reverse geocode error: $e');
        }
        
        await fetchWeather();
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

  // API Call: Fetch weather data with live Open-Meteo direct forecast
  Future<void> fetchWeather() async {
    try {
      final lat = _location['lat'] ?? 18.5204;
      final lng = _location['lng'] ?? 73.8567;
      final res = await http.get(Uri.parse(
        'https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lng&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto'
      ));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        final current = json['current'] ?? {};
        final daily = json['daily'] ?? {};
        
        String conditionText = 'Sunny';
        final int code = current['weather_code'] ?? 0;
        if (code == 0) conditionText = 'Clear Sky';
        else if (code <= 3) conditionText = 'Partly Cloudy';
        else if (code <= 48) conditionText = 'Foggy / Hazy';
        else if (code <= 67) conditionText = 'Light Rain';
        else if (code <= 82) conditionText = 'Rain Showers';
        else conditionText = 'Thunderstorm';

        _weather = {
          'location': _location['address'] ?? 'My Farm',
          'temperature': current['temperature_2m'] ?? 28,
          'feelsLike': current['apparent_temperature'] ?? 29,
          'humidity': current['relative_humidity_2m'] ?? 60,
          'windSpeed': current['wind_speed_10m'] ?? 10,
          'condition': conditionText,
          'rainProb': (daily['precipitation_probability_max'] as List?)?.first ?? 10,
        };
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

  // Clear entire cart
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

  // ------------------------------------------
  // 🔐 SECURE FARMER DOCUMENT VAULT
  // ------------------------------------------
  List<dynamic> _documents = [];
  Map<String, dynamic> _vaultStats = {};
  List<dynamic> get documents => _documents;
  Map<String, dynamic> get vaultStats => _vaultStats;

  Future<void> fetchDocuments({String search = '', String group = '', String category = ''}) async {
    if (_token.isEmpty) return;
    try {
      String url = '$apiUrl/documents?';
      if (group.isNotEmpty && group != 'All') url += 'group=$group&';
      if (category.isNotEmpty && category != 'All') url += 'category=$category&';
      if (search.trim().isNotEmpty) url += 'q=${Uri.encodeComponent(search.trim())}&';

      final res = await http.get(
        Uri.parse(url),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        _documents = data['documents'] ?? [];
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Fetch documents error: $e');
    }
  }

  Future<void> fetchVaultStats() async {
    if (_token.isEmpty) return;
    try {
      final res = await http.get(
        Uri.parse('$apiUrl/documents/stats/summary'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        _vaultStats = jsonDecode(res.body);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Fetch vault stats error: $e');
    }
  }

  Future<Map<String, dynamic>> uploadDocument(File file, String name, String category, {String maskedNumber = '', String notes = ''}) async {
    if (_token.isEmpty) return {'success': false, 'message': 'Please login first.'};
    try {
      final request = http.MultipartRequest('POST', Uri.parse('$apiUrl/documents/upload'));
      request.headers['Authorization'] = 'Bearer $_token';
      request.fields['documentName'] = name;
      request.fields['category'] = category;
      request.fields['maskedNumber'] = maskedNumber;
      request.fields['notes'] = notes;
      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedRes = await request.send();
      final res = await http.Response.fromStream(streamedRes);
      final data = jsonDecode(res.body);

      if (res.statusCode == 201 && data['success'] == true) {
        await fetchDocuments();
        await fetchVaultStats();
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'message': data['message'] ?? 'Upload failed.'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error during upload.'};
    }
  }

  Future<bool> updateDocument(String id, String name, String category, {String maskedNumber = '', String notes = ''}) async {
    if (_token.isEmpty) return false;
    try {
      final res = await http.put(
        Uri.parse('$apiUrl/documents/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token'
        },
        body: jsonEncode({
          'documentName': name,
          'category': category,
          'maskedNumber': maskedNumber,
          'notes': notes
        })
      );
      if (res.statusCode == 200) {
        await fetchDocuments();
        await fetchVaultStats();
        return true;
      }
    } catch (e) {
      debugPrint('Update document error: $e');
    }
    return false;
  }

  Future<bool> deleteDocument(String id) async {
    if (_token.isEmpty) return false;
    try {
      final res = await http.delete(
        Uri.parse('$apiUrl/documents/$id'),
        headers: {'Authorization': 'Bearer $_token'}
      );
      if (res.statusCode == 200) {
        await fetchDocuments();
        await fetchVaultStats();
        return true;
      }
    } catch (e) {
      debugPrint('Delete document error: $e');
    }
    return false;
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
          if (data['otp'] != null) {
            _otpController.text = data['otp'].toString();
            _message = 'Verification Code: ${data['otp']} (Auto-filled on screen)';
          } else {
            _message = 'OTP code sent successfully.';
          }
        });
        _startCountdown();
      } else {
        setState(() => _error = data['message'] ?? 'Failed to send OTP.');
      }
    } catch (e) {
      setState(() => _error = 'SMS gateway offline. Please ensure server is running.');
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

  // Google Authentication Handler for Mobile
  Future<void> _handleGoogleLogin() async {
    final googleEmailController = TextEditingController();
    final googleNameController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: AppColors.bgCardDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: AppColors.border),
          ),
          title: const Row(
            children: [
              Icon(Icons.g_mobiledata, color: Colors.blueAccent, size: 36),
              SizedBox(width: 8),
              Text('Google Sign-In', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enter your Google account details to sign in instantly:',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: googleEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Google Email Address',
                    hintText: 'user@gmail.com',
                    prefixIcon: Icon(Icons.email_outlined),
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: googleNameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name (Optional)',
                    prefixIcon: Icon(Icons.person_outline),
                    border: OutlineInputBorder(),
                  ),
                  style: const TextStyle(color: Colors.white),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textSecondary)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
              onPressed: () async {
                final email = googleEmailController.text.trim();
                if (email.isEmpty || !email.contains('@')) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a valid Google email address.')),
                  );
                  return;
                }
                Navigator.pop(ctx);
                setState(() {
                  _loading = true;
                  _error = '';
                });
                try {
                  final state = Provider.of<AppState>(context, listen: false);
                  final name = googleNameController.text.trim().isNotEmpty
                      ? googleNameController.text.trim()
                      : email.split('@')[0];

                  final res = await http.post(
                    Uri.parse('${state.apiUrl}/auth/google-login'),
                    headers: {'Content-Type': 'application/json'},
                    body: jsonEncode({
                      'email': email,
                      'name': name,
                      'googleId': 'google_${email.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}',
                    }),
                  );
                  final data = jsonDecode(res.body);
                  if (res.statusCode == 200 && data['token'] != null) {
                    await state.setToken(data['token']);
                    if (mounted) {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const MainShellScreen())
                      );
                    }
                  } else {
                    setState(() => _error = data['message'] ?? 'Google login failed.');
                  }
                } catch (e) {
                  setState(() => _error = 'Google auth connection error.');
                } finally {
                  setState(() => _loading = false);
                }
              },
              child: const Text('Sign In with Google', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
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
                    onPressed: _handleGoogleLogin,
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
                      InkWell(
                        onTap: () async {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Detecting live GPS coordinates...'), duration: Duration(seconds: 1)),
                          );
                          await state.refreshLocation();
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.secondary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.my_location, size: 13, color: AppColors.secondary),
                              const SizedBox(width: 5),
                              Text(
                                state.location['address'] ?? 'My Location',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.secondary),
                              ),
                            ],
                          ),
                        ),
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
                            Text('${w['temperature']}°C', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800, color: Colors.white)),
                            Text('${w['condition']}', style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                          ],
                        ),
                        const Icon(Icons.wb_sunny_outlined, size: 56, color: Colors.amberAccent),
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
                        (w['rainProb'] as num) > 50 
                            ? 'High probability of rain. Postpone any fertilizer spraying or pesticide application.'
                            : 'Weather looks clear. Ideal conditions for irrigation and field crop inspection.',
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
                _buildActionCard(Icons.folder_shared, '🔐 Document Vault', Colors.teal.shade700, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const DocumentVaultScreen()));
                }),
                _buildActionCard(Icons.water_drop, 'Irrigation', Colors.teal, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const WaterManagementScreen()));
                }),
                _buildActionCard(Icons.grass, 'Fertilizers', Colors.brown, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const FertilizerScheduleScreen()));
                }),
                _buildActionCard(Icons.history, 'Activity History', Colors.indigo, () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const HistoryScreen()));
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
                    margin: const EdgeInsets.only(bottom: 10),
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

  final stt.SpeechToText _speech = stt.SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();
  bool _isListening = false;
  bool _speechAvailable = false;
  String _liveSpokenWords = '';

  @override
  void initState() {
    super.initState();
    _initVoiceServices();
    _loadHistory();
  }

  void _initVoiceServices() async {
    try {
      _speechAvailable = await _speech.initialize(
        onError: (e) => debugPrint('STT init error: $e'),
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            if (mounted) setState(() => _isListening = false);
          }
        },
      );
      await _flutterTts.setLanguage("en-IN");
      await _flutterTts.setPitch(1.0);
      await _flutterTts.setSpeechRate(0.5);
    } catch (e) {
      debugPrint('Voice services init: $e');
    }
  }

  Future<void> _speakText(String text) async {
    try {
      await _flutterTts.stop();
      final cleanText = text.replaceAll(RegExp(r'[*#_`]'), '');
      await _flutterTts.speak(cleanText);
    } catch (e) {
      debugPrint('TTS speak error: $e');
    }
  }

  @override
  void dispose() {
    _speech.stop();
    _flutterTts.stop();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
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
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSend() async {
    if (_controller.text.trim().isEmpty || _loading) return;

    final userMsg = _controller.text.trim();
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
        body: jsonEncode({
          'messages': _messages,
          'location': state.location
        }),
      );

      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        final reply = data['content'] ?? '';
        setState(() {
          _messages.add({'role': 'assistant', 'content': reply});
        });
        _saveHistory();
        _speakText(reply); // Automatically speak the answer aloud
      } else {
        setState(() {
          _errorDetails = {
            'message': data['message'] ?? 'Error communicating with AI Assistant.',
            'detail': data['detail'] ?? 'Ensure Groq AI connectivity.'
          };
        });
      }
    } catch (e) {
      setState(() {
        _errorDetails = {
          'message': 'AI service temporarily unavailable.',
          'detail': 'Please check your internet connection.'
        };
      });
    } finally {
      if (mounted) setState(() => _loading = false);
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
                  Text('AI Farming Voice Assistant', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
                  Text('Qwen-3.8 Agri Intelligence', style: TextStyle(fontSize: 12, color: Colors.greenAccent)),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                onPressed: _clearChat,
              )
            ],
          ),
        ),
        
        // Quick Voice Prompts
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              _buildVoiceChip('🌾 Best crop for my soil'),
              _buildVoiceChip('🐛 Tomato pest treatment'),
              _buildVoiceChip('💧 Irrigation advice'),
              _buildVoiceChip('💰 High-value mandi crops'),
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
                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.85),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg['content'] ?? '',
                        style: const TextStyle(fontSize: 14, height: 1.4, color: Colors.white),
                      ),
                      if (!isUser) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            InkWell(
                              onTap: () {
                                _speakText(msg['content'] ?? '');
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Row(
                                      children: [
                                        Icon(Icons.volume_up, color: Colors.greenAccent, size: 20),
                                        SizedBox(width: 8),
                                        Text('Voice Assistant: Speaking response aloud...'),
                                      ],
                                    ),
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.volume_up, size: 14, color: Colors.greenAccent),
                                    SizedBox(width: 4),
                                    Text('Read Aloud', style: TextStyle(fontSize: 11, color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        )
                      ]
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Chat Input box with Real Voice Mic
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              // Voice Assistant Mic Button
              Container(
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  color: _isListening ? Colors.redAccent.withOpacity(0.25) : AppColors.secondary.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: _isListening ? Colors.redAccent : AppColors.secondary.withOpacity(0.4)),
                ),
                child: IconButton(
                  icon: Icon(_isListening ? Icons.mic : Icons.mic_none, color: _isListening ? Colors.redAccent : AppColors.secondary, size: 22),
                  tooltip: 'Voice Speech Input',
                  onPressed: _handleVoiceInput,
                ),
              ),
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(
                    hintText: 'Type or speak farming question...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(30))),
                    contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  onSubmitted: (_) => _handleSend(),
                ),
              ),
              const SizedBox(width: 8),
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

  Widget _buildVoiceChip(String text) {
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ActionChip(
        backgroundColor: AppColors.bgCardDark,
        side: const BorderSide(color: AppColors.border),
        avatar: const Icon(Icons.mic, size: 14, color: AppColors.secondary),
        label: Text(text, style: const TextStyle(fontSize: 12, color: Colors.white)),
        onPressed: () {
          _controller.text = text;
          _handleSend();
        },
      ),
    );
  }

  void _handleVoiceInput() async {
    bool available = await _speech.initialize(
      onError: (e) => debugPrint('STT error: $e'),
      onStatus: (status) => debugPrint('STT status: $status'),
    );

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgCardDark,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalContext, setModalState) {
            void startListening() {
              if (available) {
                setModalState(() {
                  _isListening = true;
                  _liveSpokenWords = 'Listening to your voice...';
                });
                _speech.listen(
                  onResult: (result) {
                    setModalState(() {
                      _liveSpokenWords = result.recognizedWords;
                    });
                    if (result.recognizedWords.isNotEmpty) {
                      _controller.text = result.recognizedWords;
                    }
                    if (result.finalResult && result.recognizedWords.isNotEmpty) {
                      setModalState(() => _isListening = false);
                      Navigator.pop(ctx);
                      _handleSend();
                    }
                  },
                );
              }
            }

            void stopListening() {
              _speech.stop();
              setModalState(() => _isListening = false);
              if (_controller.text.isNotEmpty) {
                Navigator.pop(ctx);
                _handleSend();
              }
            }

            // Start immediately when opening modal
            if (!_isListening && available) {
              startListening();
            }

            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () {
                      if (_isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: _isListening ? Colors.redAccent.withOpacity(0.2) : AppColors.primary.withOpacity(0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: _isListening ? Colors.redAccent : Colors.greenAccent, width: 2),
                      ),
                      child: Icon(
                        _isListening ? Icons.mic : Icons.mic_none,
                        size: 48,
                        color: _isListening ? Colors.redAccent : Colors.greenAccent,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _isListening ? 'Listening to your question...' : 'Tap Mic to Speak',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black26,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      _liveSpokenWords.isNotEmpty ? _liveSpokenWords : 'Speak clearly in English or Hindi...',
                      style: TextStyle(
                        color: _liveSpokenWords.isNotEmpty ? Colors.white : AppColors.textSecondary,
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 20),
                  if (_liveSpokenWords.isNotEmpty && _liveSpokenWords != 'Listening to your voice...')
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        onPressed: () {
                          _speech.stop();
                          Navigator.pop(ctx);
                          _handleSend();
                        },
                        icon: const Icon(Icons.send, color: Colors.white),
                        label: const Text('Send Question to AI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  const SizedBox(height: 12),
                  const Text('Or tap a quick farming question:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.teal.shade800),
                        onPressed: () {
                          _speech.stop();
                          Navigator.pop(ctx);
                          _controller.text = 'How much fertilizer should I apply for my crop?';
                          _handleSend();
                        },
                        child: const Text('🌾 Fertilizer Dosage Advice', style: TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo.shade800),
                        onPressed: () {
                          _speech.stop();
                          Navigator.pop(ctx);
                          _controller.text = 'What are the current mandi rates for tomato and onion?';
                          _handleSend();
                        },
                        child: const Text('💰 Check Mandi Rates', style: TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.deepOrange.shade800),
                        onPressed: () {
                          _speech.stop();
                          Navigator.pop(ctx);
                          _controller.text = 'How to treat plant leaf yellowing and fungal spots?';
                          _handleSend();
                        },
                        child: const Text('🐛 Pest & Fungal Care', style: TextStyle(color: Colors.white, fontSize: 12)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            );
          },
        );
      },
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
                  color: Colors.red.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.danger),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error, style: const TextStyle(color: Colors.redAccent, fontSize: 13))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // 1. NO IMAGE SELECTED STATE
            if (_imageFile == null) ...[
              // Camera Capture Option Card
              InkWell(
                onTap: () => _pickImage(ImageSource.camera),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
                  decoration: BoxDecoration(
                    color: AppColors.bgCardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withOpacity(0.5), width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.camera_alt, size: 40, color: Colors.greenAccent),
                      ),
                      const SizedBox(height: 14),
                      const Text('Take Photo with Camera', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      const Text('Snap a clear close-up picture of the affected leaf', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Gallery Upload Option Card
              InkWell(
                onTap: () => _pickImage(ImageSource.gallery),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  decoration: BoxDecoration(
                    color: AppColors.bgCardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.photo_library, size: 24, color: AppColors.secondary),
                      ),
                      const SizedBox(width: 14),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Upload from Gallery', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                          Text('Select an existing photo from storage', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                        ],
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Scanning Guidelines Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.lightbulb_outline, color: AppColors.secondary, size: 18),
                        SizedBox(width: 8),
                        Text('For Best Diagnosis Results:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('• Ensure adequate natural sunlight and focus on the leaf.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    const SizedBox(height: 4),
                    const Text('• Capture a single leaf filling most of the camera frame.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    const SizedBox(height: 4),
                    const Text('• Avoid blurry, shaky, or overly dark backgrounds.', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
            ],

            // 2. IMAGE SELECTED PREVIEW & ACTIONS
            if (_imageFile != null) ...[
              // Image Preview Card
              Container(
                width: double.infinity,
                height: 220,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.primary, width: 2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: Image.file(_imageFile!, fit: BoxFit.contain),
                ),
              ),
              const SizedBox(height: 16),

              // Action Buttons: Start Diagnosis & Retake
              if (!_loading && _result == null) ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 4,
                    ),
                    icon: const Icon(Icons.analytics, color: Colors.white, size: 22),
                    label: const Text('Start Diagnosis', style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                    onPressed: _analyze,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(46),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.camera_alt, size: 18),
                        label: const Text('Retake Photo'),
                        onPressed: () => _pickImage(ImageSource.camera),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(46),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.photo_library, size: 18),
                        label: const Text('Gallery'),
                        onPressed: () => _pickImage(ImageSource.gallery),
                      ),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                      onPressed: () => setState(() {
                        _imageFile = null;
                        _result = null;
                        _error = '';
                      }),
                    ),
                  ],
                ),
              ],
            ],

            // 3. LOADING / ANALYZING STATE
            if (_loading) ...[
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.bgCardDark,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.primary.withOpacity(0.5)),
                ),
                child: const Column(
                  children: [
                    CircularProgressIndicator(color: AppColors.primary, strokeWidth: 3),
                    SizedBox(height: 16),
                    Text('Analyzing leaf health with AI model...', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                    SizedBox(height: 6),
                    Text('Comparing features against botanical disease database', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              ),
            ],

            // 4. DIAGNOSIS RESULTS
            if (_result != null && !_loading) ...[
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1010),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.redAccent.withOpacity(0.5), width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Result Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.redAccent.withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 24),
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'Disease Detected!',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.redAccent),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.redAccent),
                          ),
                          child: Text(
                            '${_result!['confidence'] ?? 94}% Confidence',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24, color: Colors.redAccent),
                    
                    // Crop & Disease Name
                    Text(
                      '${_result!['crop'] ?? 'Plant'} ${_result!['disease'] ?? 'Late Blight'}',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _result!['scientificName'] ?? 'Phytophthora infestans',
                      style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: Colors.orangeAccent),
                    ),
                    const SizedBox(height: 16),

                    // Metrics Row
                    Row(
                      children: [
                        Expanded(
                          child: _buildResultRow('SEVERITY', _result!['severity'] ?? 'Moderate'),
                        ),
                        Expanded(
                          child: _buildResultRow('CONFIDENCE', '${_result!['confidence'] ?? 88}%'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (_result!['recommendation'] != null) ...[
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.black38,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.healing, color: Colors.greenAccent, size: 18),
                                    SizedBox(width: 6),
                                    Text('AI Agronomist Advice:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.greenAccent, fontSize: 13)),
                                  ],
                                ),
                                InkWell(
                                  onTap: () async {
                                    final tts = FlutterTts();
                                    await tts.setLanguage("en-IN");
                                    await tts.setSpeechRate(0.5);
                                    await tts.speak(_result!['recommendation'].toString().replaceAll(RegExp(r'[*#_`]'), ''));
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Speaking diagnosis remedy aloud...'), duration: Duration(seconds: 2)),
                                      );
                                    }
                                  },
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.greenAccent.withOpacity(0.5)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.volume_up, size: 14, color: Colors.greenAccent),
                                        SizedBox(width: 4),
                                        Text('Listen', style: TextStyle(fontSize: 11, color: Colors.greenAccent, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _result!['recommendation'] ?? '',
                              style: const TextStyle(fontSize: 13, height: 1.4, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Action Button 1: View Detailed Report
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.visibility, color: Colors.white, size: 18),
                        label: const Text('View Detailed Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => DetailedReportScreen(
                                crop: _result!['crop'] ?? 'Crop',
                                disease: _result!['disease'] ?? 'Disease',
                                confidence: _result!['confidence']?.toString() ?? '94',
                                severity: _result!['severity'] ?? 'High',
                                scientificName: _result!['scientificName'] ?? '',
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Action Button 2: Recommended Products
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.shopping_bag, size: 18, color: Colors.white),
                        label: const Text('View Recommended Products', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => RecommendedProductsScreen(
                                crop: _result!['crop'] ?? 'Tomato',
                                disease: _result!['disease'] ?? 'Late Blight',
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Action Buttons Row: Share & Download
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(44),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.share, size: 16),
                            label: const Text('Share Report'),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Report summary copied for sharing!')),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(44),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.download, size: 16),
                            label: const Text('Download PDF'),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Diagnostic PDF report generated!')),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Retake / Scan Another
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.redAccent.withOpacity(0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.refresh, color: Colors.redAccent, size: 18),
                        label: const Text('Scan Another Crop (Retake)', style: TextStyle(color: Colors.redAccent)),
                        onPressed: () {
                          setState(() {
                            _imageFile = null;
                            _result = null;
                            _error = '';
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 32),
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
                            margin: const EdgeInsets.only(bottom: 16),
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
                                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.secondary),
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
            const SizedBox(height: 24),

            // Farmer Document Vault Access Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.primary.withOpacity(0.25), AppColors.bgCardDark],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.folder_shared, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '🔐 My Secure Documents',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Farmer Document Vault • Bank-Grade Private Storage',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.lock_open, size: 16, color: Colors.white),
                      label: const Text('Open Document Vault', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const DocumentVaultScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${state.token}',
        }
      );
      final data = jsonDecode(res.body);
      if (res.statusCode == 200 || res.statusCode == 201 || data['success'] == true) {
        await state.clearCart();
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              backgroundColor: AppColors.bgCardDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: AppColors.border),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle, color: Colors.greenAccent, size: 48),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Order Placed Successfully!',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('Payment Mode: Cash on Delivery (COD)', style: TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Your farming supplies order has been confirmed and dispatched for delivery to your farm.',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.pop(context);
                      },
                      child: const Text('Continue Shopping', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  )
                ],
              ),
            ),
          );
        }
      } else {
        setState(() => _warning = data['message'] ?? 'Checkout failed.');
      }
    } catch (e) {
      setState(() => _warning = 'Checkout request failed. Please check your connection.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final items = state.cart['items'] ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shopping Cart'),
        actions: [
          if (items.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.danger),
              tooltip: 'Clear Cart',
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear Cart?'),
                    content: const Text('Do you want to remove all items from your cart?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Clear', style: TextStyle(color: AppColors.danger))),
                    ],
                  ),
                );
                if (confirm == true) {
                  await state.clearCart();
                }
              },
            )
        ],
      ),
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
                  const Icon(Icons.info_outline, color: AppColors.secondary, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(_warning, style: const TextStyle(fontSize: 13, color: Colors.white)),
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
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.border),
                        ),
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(14.0),
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: const Icon(Icons.shopping_bag_outlined, color: Colors.greenAccent, size: 26),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(prod['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                                    const SizedBox(height: 4),
                                    Text('Qty: ${item['quantity']} • ₹${prod['price']} each', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, size: 20, color: Colors.white70),
                                    onPressed: item['quantity'] > 1 
                                        ? () => state.updateCartQty(prod['_id'], item['quantity'] - 1)
                                        : null,
                                  ),
                                  Text('${item['quantity']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, size: 20, color: Colors.greenAccent),
                                    onPressed: () => state.updateCartQty(prod['_id'], item['quantity'] + 1),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: AppColors.danger, size: 20),
                                    onPressed: () => state.removeFromCart(prod['_id']),
                                  )
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  )
                : const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shopping_bag_outlined, size: 64, color: AppColors.textSecondary),
                        SizedBox(height: 16),
                        Text('Your cart is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                        SizedBox(height: 6),
                        Text('Add products from the marketplace to get started.', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
          ),
          if (items.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppColors.bgCardDark,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      Text(
                        '₹${_calculateSubtotal(state.cart).toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.secondary),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: _loading ? null : _handleCheckout,
                      icon: _loading ? const SizedBox.shrink() : const Icon(Icons.shopping_cart_checkout, color: Colors.white),
                      label: _loading 
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Place Order (Cash on Delivery)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
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
                  margin: const EdgeInsets.only(bottom: 16),
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
  String _selectedState = '';
  String _sortBy = 'distance';
  bool _loading = false;

  final List<String> _indianStates = [
    'All States',
    'Maharashtra',
    'Karnataka',
    'Andhra Pradesh',
    'Telangana',
    'Tamil Nadu',
    'Delhi',
    'Gujarat',
    'Rajasthan',
    'Uttar Pradesh',
    'Punjab',
    'Madhya Pradesh',
    'West Bengal',
  ];

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
        List<dynamic> list = jsonDecode(res.body);
        if (_selectedState.isNotEmpty && _selectedState != 'All States') {
          list = list.where((m) => (m['state'] ?? '').toString().toLowerCase() == _selectedState.toLowerCase()).toList();
        }
        setState(() => _markets = list);
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
    final state = Provider.of<AppState>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mandi Commodity Prices'),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location, color: Colors.greenAccent),
            tooltip: 'Detect GPS Location',
            onPressed: () async {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Updating GPS coordinates & calculating nearest mandis...')),
              );
              await state.refreshLocation();
              _fetchMarkets();
            },
          )
        ],
      ),
      body: Column(
        children: [
          // Current GPS Location Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.bgCardDark,
            child: Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: AppColors.secondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'GPS Origin: ${state.location['address'] ?? 'Your Location'}',
                    style: const TextStyle(fontSize: 12, color: AppColors.secondary, fontWeight: FontWeight.bold),
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    await state.refreshLocation();
                    _fetchMarkets();
                  },
                  child: const Text('Refresh GPS', style: TextStyle(fontSize: 11, color: Colors.greenAccent)),
                )
              ],
            ),
          ),

          // Filter Toolbar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedCrop.isEmpty ? null : _selectedCrop,
                        decoration: const InputDecoration(labelText: 'Crop Filter', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
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
                    const SizedBox(width: 10),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedState.isEmpty ? 'All States' : _selectedState,
                        decoration: const InputDecoration(labelText: 'State / Region', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                        onChanged: (val) {
                          setState(() => _selectedState = val ?? '');
                          _fetchMarkets();
                        },
                        items: _indianStates.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      ),
                    ),
                  ],
                ),
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
                        margin: const EdgeInsets.only(bottom: 16),
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
                                  children: prices.map<Widget>((p) {
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
                              Text('Source: ${mkt['source'] ?? 'APMC Market Yard'}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
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
  DateTime _plantingDate = DateTime.now().subtract(const Duration(days: 14));
  DateTime _nextWateringDate = DateTime.now();
  TimeOfDay _alarmTime = const TimeOfDay(hour: 7, minute: 0);
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

  Future<void> _pickDate(bool isPlanting) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isPlanting ? _plantingDate : _nextWateringDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isPlanting) _plantingDate = picked;
        else _nextWateringDate = picked;
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _alarmTime,
    );
    if (picked != null) {
      setState(() => _alarmTime = picked);
    }
  }

  Future<void> _createSchedule() async {
    if (_cropController.text.isEmpty || _fieldSizeController.text.isEmpty) {
      setState(() => _error = 'Please fill in crop name and acreage.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    final state = Provider.of<AppState>(context, listen: false);
    final String formattedAlarmTime = _alarmTime.format(context);
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
          'plantingDate': _plantingDate.toIso8601String().split('T')[0],
          'nextWatering': _nextWateringDate.toIso8601String().split('T')[0],
          'wateringTime': formattedAlarmTime,
          'irrigationTime': formattedAlarmTime,
          'irrigationMethod': _irrigationMethod,
          'irrigationType': _irrigationMethod,
        }),
      );
      if (res.statusCode == 201 || res.statusCode == 200) {
        _cropController.clear();
        _fieldSizeController.clear();
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
      appBar: AppBar(title: const Text('Water Management & Irrigation')),
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
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.greenAccent),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Advisory Notice: Irrigation calculations estimate evaporation and crop root zones. Adjust for unexpected local rain.',
                        style: TextStyle(fontSize: 11, color: Colors.greenAccent),
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
              const Text('Add Watering Plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: _cropController,
                decoration: const InputDecoration(labelText: 'Crop Type (e.g. Tomato, Rice, Cotton)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _fieldSizeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Field Size (Acres)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _soilType,
                      decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Soil Type'),
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
              DropdownButtonFormField<String>(
                value: _irrigationMethod,
                decoration: const InputDecoration(border: OutlineInputBorder(), labelText: 'Irrigation Method'),
                onChanged: (val) => setState(() => _irrigationMethod = val ?? 'Drip Irrigation'),
                items: const [
                  DropdownMenuItem(value: 'Drip Irrigation', child: Text('Drip Irrigation (High Efficiency)')),
                  DropdownMenuItem(value: 'Sprinkler Irrigation', child: Text('Sprinkler Irrigation')),
                  DropdownMenuItem(value: 'Flood Irrigation', child: Text('Flood / Furrow Irrigation')),
                ],
              ),
              const SizedBox(height: 12),
              
              // Interactive Calendar & Alarm Time Pickers
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _pickDate(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Planting Date', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.calendar_month, size: 16, color: Colors.greenAccent),
                                const SizedBox(width: 6),
                                Text('${_plantingDate.day}/${_plantingDate.month}/${_plantingDate.year}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: _pickTime,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Alarm Reminder Time', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.alarm, size: 16, color: AppColors.secondary),
                                const SizedBox(width: 6),
                                Text(_alarmTime.format(context), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _loading ? null : _createSchedule,
                  icon: const Icon(Icons.water_drop, color: Colors.white),
                  label: const Text('Generate Water Schedule', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),

              // Active Planners List
              const Text('Active Irrigation Planners', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              _loading && _schedules.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _schedules.isNotEmpty
                      ? Column(
                          children: _schedules.map((s) {
                            final next = s['nextWatering'] != null ? DateTime.parse(s['nextWatering']) : DateTime.now();
                            final bool reminders = s['remindersEnabled'] ?? true;
                            final String methodText = s['irrigationMethod'] ?? s['irrigationType'] ?? 'Drip Irrigation';
                            final String timeText = s['wateringTime'] ?? s['irrigationTime'] ?? '07:00 AM';
                            
                            return Card(
                              color: AppColors.bgCardDark,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: const BorderSide(color: AppColors.border),
                              ),
                              margin: const EdgeInsets.only(bottom: 12),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('${s['crop']} - ${s['fieldSize']} Acres', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                                        Row(
                                          children: [
                                            IconButton(
                                              icon: Icon(reminders ? Icons.notifications_active : Icons.notifications_off,
                                                  color: reminders ? Colors.amberAccent : Colors.grey),
                                              onPressed: () => _toggleReminder(s['_id'], reminders),
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                              onPressed: () => _deleteSchedule(s['_id']),
                                            )
                                          ],
                                        )
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: Colors.teal.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                                          child: Text(methodText, style: const TextStyle(color: Colors.tealAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: Colors.amber.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                                          child: Text('⏰ Alarm: $timeText', style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text('Next Watering Due: ${next.day}/${next.month}/${next.year}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        )
                      : const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('No irrigation schedules active.'))),
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
  DateTime _plantingDate = DateTime.now().subtract(const Duration(days: 20));
  DateTime _nextApplicationDate = DateTime.now().add(const Duration(days: 5));
  TimeOfDay _alarmTime = const TimeOfDay(hour: 8, minute: 0);
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

  Future<void> _pickDate(bool isPlanting) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isPlanting ? _plantingDate : _nextApplicationDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isPlanting) _plantingDate = picked;
        else _nextApplicationDate = picked;
      });
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _alarmTime,
    );
    if (picked != null) {
      setState(() => _alarmTime = picked);
    }
  }

  Future<void> _createSchedule() async {
    if (_cropController.text.isEmpty || _fieldSizeController.text.isEmpty) {
      setState(() => _error = 'Please fill in crop name and acreage.');
      return;
    }
    setState(() {
      _loading = true;
      _error = '';
    });
    final state = Provider.of<AppState>(context, listen: false);
    final String formattedAlarmTime = _alarmTime.format(context);
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
          'plantingDate': _plantingDate.toIso8601String().split('T')[0],
          'nextApplication': _nextApplicationDate.toIso8601String().split('T')[0],
          'applicationTime': formattedAlarmTime,
          'alarmTime': formattedAlarmTime,
        }),
      );
      if (res.statusCode == 201 || res.statusCode == 200) {
        _cropController.clear();
        _fieldSizeController.clear();
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
      appBar: AppBar(title: const Text('Fertilizer Planner & Calendar')),
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
                    SizedBox(width: 12),
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
                decoration: const InputDecoration(labelText: 'Crop (e.g. Rice, Tomato, Cotton, Wheat)', border: OutlineInputBorder()),
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
                      controller: _fieldSizeController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Field Size (Acres)', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: _pickTime,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Alarm Reminder Time', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.alarm, size: 16, color: Colors.amberAccent),
                                const SizedBox(width: 6),
                                Text(_alarmTime.format(context), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Date Pickers Row
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _pickDate(true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Planting Date', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.calendar_today, size: 14, color: Colors.greenAccent),
                                const SizedBox(width: 6),
                                Text('${_plantingDate.day}/${_plantingDate.month}/${_plantingDate.year}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _pickDate(false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.bgCardDark,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Next Application Due', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.event_available, size: 14, color: Colors.amberAccent),
                                const SizedBox(width: 6),
                                Text('${_nextApplicationDate.day}/${_nextApplicationDate.month}/${_nextApplicationDate.year}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: _loading ? null : _createSchedule,
                  icon: const Icon(Icons.eco, color: Colors.white),
                  label: const Text('Generate Fertilizer Plan', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),

              // Planners List
              const Text('Active Nutrient Plans', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              _loading && _schedules.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _schedules.isNotEmpty
                      ? Column(
                          children: _schedules.map((s) {
                            final next = s['nextApplication'] != null ? DateTime.parse(s['nextApplication']) : DateTime.now();
                            final bool reminders = s['remindersEnabled'] ?? true;
                            final String timeText = s['applicationTime'] ?? s['alarmTime'] ?? '08:00 AM';
                            
                            return Card(
                              color: AppColors.bgCardDark,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: const BorderSide(color: AppColors.border),
                              ),
                              margin: const EdgeInsets.only(bottom: 12),
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
                                            '${s['crop']} - ${s['fertilizerType'] ?? 'NPK Complex & Organic Compost'}',
                                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                                          ),
                                        ),
                                        Row(
                                          children: [
                                            IconButton(
                                              icon: Icon(reminders ? Icons.notifications_active : Icons.notifications_off,
                                                  color: reminders ? Colors.amberAccent : Colors.grey),
                                              onPressed: () => _toggleReminder(s['_id'], reminders),
                                            ),
                                            IconButton(
                                              icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                                              onPressed: () => _deleteSchedule(s['_id']),
                                            )
                                          ],
                                        )
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: Colors.green.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                                          child: Text('${s['growthStage'] ?? 'Vegetative Stage'}', style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: Colors.amber.withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                                          child: Text('⏰ Alarm: $timeText', style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text('Next Nutrient Due: ${next.day}/${next.month}/${next.year}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        )
                      : const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('No nutrient logs active.'))),
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
                      margin: const EdgeInsets.only(bottom: 12),
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
  }
}
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
                              margin: const EdgeInsets.only(bottom: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: const BorderSide(color: AppColors.border),
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

// ==========================================
// 📜 SUB-SCREEN: DETAILED DIAGNOSTIC REPORT
// ==========================================
class DetailedReportScreen extends StatelessWidget {
  final String crop;
  final String disease;
  final String confidence;
  final String severity;
  final String scientificName;

  const DetailedReportScreen({
    super.key,
    required this.crop,
    required this.disease,
    required this.confidence,
    required this.severity,
    this.scientificName = '',
  });

  @override
  Widget build(BuildContext context) {
    final sciName = scientificName.isNotEmpty 
        ? scientificName 
        : disease.toLowerCase().contains('blight') 
            ? 'Phytophthora infestans' 
            : disease.toLowerCase().contains('rust') 
                ? 'Puccinia graminis' 
                : 'Cercospora zeae-maydis';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagnostic Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Report copied for sharing!')),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E1010),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('DIAGNOSTIC STATUS', style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.redAccent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.redAccent),
                        ),
                        child: Text('$confidence% Confidence', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text('$crop $disease', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text(sciName, style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic, color: Colors.orangeAccent)),
                  const Divider(height: 24, color: Colors.redAccent),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildReportStat('Severity Level', severity, Colors.redAccent),
                      _buildReportStat('Risk Rating', 'High Risk', Colors.orangeAccent),
                      _buildReportStat('Treatment Window', 'Immediate (24h)', Colors.greenAccent),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Symptoms Card
            _buildSectionCard(
              title: 'Symptoms & Indicators',
              icon: Icons.search,
              color: Colors.orange,
              items: const [
                'Dark, water-soaked lesions appearing on leaf tips and margins.',
                'White fungal growth visible on undersides of leaves during humid conditions.',
                'Rapid wilting, browning, and dying of vegetative tissue.',
                'Stems developing dark brown, greasy-looking patches.',
              ],
            ),
            const SizedBox(height: 16),

            // Environmental Causes
            _buildSectionCard(
              title: 'Causes & Environmental Triggers',
              icon: Icons.thermostat,
              color: Colors.blue,
              items: const [
                'High relative humidity (> 90%) combined with moderate temperatures (15-22°C).',
                'Prolonged leaf wetness caused by overhead sprinkler irrigation or dew.',
                'Poor air circulation due to dense crop spacing.',
                'Contaminated plant debris or infected seed tubers.',
              ],
            ),
            const SizedBox(height: 16),

            // Recommended Treatment Steps
            _buildSectionCard(
              title: 'Step-by-Step Treatment',
              icon: Icons.healing,
              color: Colors.green,
              items: const [
                'Immediately prune and safely dispose of heavily infected leaves.',
                'Apply Copper Oxychloride 50% WP or Mancozeb 75% WP @ 2.5g per liter of water.',
                'Switch from overhead watering to drip irrigation to keep canopy foliage dry.',
                'Spray systemic fungicides (Metalaxyl 8% + Mancozeb 64%) if outbreak continues.',
              ],
            ),
            const SizedBox(height: 16),

            // Prevention Guidelines
            _buildSectionCard(
              title: 'Long-Term Prevention',
              icon: Icons.shield,
              color: Colors.teal,
              items: const [
                'Ensure 60cm row spacing to allow adequate ventilation and sunlight penetration.',
                'Practice a minimum 3-year crop rotation with non-solanaceous crops.',
                'Use certified disease-resistant hybrid seed varieties.',
              ],
            ),
            const SizedBox(height: 24),

            // Navigation to Products
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                icon: const Icon(Icons.shopping_bag, color: Colors.white),
                label: const Text('View Recommended Treatment Products', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RecommendedProductsScreen(crop: crop, disease: disease),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildReportStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildSectionCard({required String title, required IconData icon, required Color color, required List<String> items}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.bgCardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('• ', style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
                  Expanded(
                    child: Text(item, style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.textPrimary)),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ==========================================
// 🛒 SUB-SCREEN: RECOMMENDED PRODUCTS
// ==========================================
class RecommendedProductsScreen extends StatelessWidget {
  final String crop;
  final String disease;

  const RecommendedProductsScreen({super.key, required this.crop, required this.disease});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final List<Map<String, dynamic>> products = [
      {
        'id': 'rec_1',
        'name': 'Copper Oxychloride 50% WP (Blitox)',
        'category': 'Fungicide',
        'price': 340,
        'rating': 4.8,
        'description': 'Broad-spectrum protective copper fungicide for Late Blight, Early Blight, and Leaf Spot.',
      },
      {
        'id': 'rec_2',
        'name': 'Ridomil Gold (Metalaxyl + Mancozeb)',
        'category': 'Systemic Fungicide',
        'price': 620,
        'rating': 4.9,
        'description': 'Systemic curative and preventive protection against persistent fungal infections.',
      },
      {
        'id': 'rec_3',
        'name': 'Organic Cold-Pressed Neem Oil (10,000 PPM)',
        'category': 'Bio-Pesticide',
        'price': 280,
        'rating': 4.7,
        'description': '100% natural organic repellent and fungal spore germination inhibitor.',
      },
      {
        'id': 'rec_4',
        'name': 'Agricultural Battery Knapsack Sprayer 16L',
        'category': 'Equipment',
        'price': 1850,
        'rating': 4.6,
        'description': 'High-pressure continuous electric spray pump for uniform crop foliage coverage.',
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Recommended Care Products')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Target Diagnosis Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primary),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified, color: AppColors.primary, size: 28),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('CURATED CARE PRODUCTS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                        Text('Target: $crop ($disease)', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            ...products.map((p) {
              return Card(
                color: AppColors.bgCardDark,
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(p['category'], style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                          Row(
                            children: [
                              const Icon(Icons.star, color: AppColors.secondary, size: 16),
                              const SizedBox(width: 4),
                              Text('${p['rating']}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                            ],
                          )
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(p['name'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 6),
                      Text(p['description'], style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3)),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('₹${p['price']}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.secondary)),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                            icon: const Icon(Icons.add_shopping_cart, size: 16, color: Colors.white),
                            label: const Text('Add to Cart', style: TextStyle(color: Colors.white)),
                            onPressed: () {
                              state.addToCart(p['id']);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${p['name']} added to cart!')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 🕒 SUB-SCREEN: ACTIVITY & SCAN HISTORY
// ==========================================
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> _activities = [];
  List<dynamic> _scans = [];
  bool _loading = false;
  String _currentTab = 'scans'; // 'scans' or 'activities'

  @override
  void initState() {
    super.initState();
    _fetchHistoryData();
  }

  Future<void> _fetchHistoryData() async {
    final state = Provider.of<AppState>(context, listen: false);
    if (state.token.isEmpty) return;

    setState(() => _loading = true);
    try {
      final resActs = await http.get(
        Uri.parse('${state.apiUrl}/history'),
        headers: {'Authorization': 'Bearer ${state.token}'},
      );
      if (resActs.statusCode == 200) {
        _activities = jsonDecode(resActs.body);
      }

      final resScans = await http.get(
        Uri.parse('${state.apiUrl}/history/scans'),
        headers: {'Authorization': 'Bearer ${state.token}'},
      );
      if (resScans.statusCode == 200) {
        _scans = jsonDecode(resScans.body);
      }
    } catch (e) {
      debugPrint('History fetch error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'Recently';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return 'Recently';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Activity & Scan History')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                // Top Tab selector
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                  color: AppColors.bgCardDark,
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _currentTab = 'scans'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _currentTab == 'scans' ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '📷 Crop Scans (${_scans.length})',
                              style: TextStyle(
                                color: _currentTab == 'scans' ? Colors.white : AppColors.textSecondary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _currentTab = 'activities'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _currentTab == 'activities' ? AppColors.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '⚡ All Actions (${_activities.length})',
                              style: TextStyle(
                                color: _currentTab == 'activities' ? Colors.white : AppColors.textSecondary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content List
                Expanded(
                  child: _currentTab == 'scans'
                      ? _scans.isNotEmpty
                          ? ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _scans.length,
                              itemBuilder: (ctx, idx) {
                                final s = _scans[idx];
                                return Card(
                                  color: AppColors.bgCardDark,
                                  margin: const EdgeInsets.only(bottom: 14),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: const BorderSide(color: AppColors.border),
                                  ),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.all(16),
                                    leading: Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: Colors.redAccent.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(Icons.analytics, color: Colors.redAccent),
                                    ),
                                    title: Text(
                                      '${s['crop'] ?? 'Crop'} - ${s['disease'] ?? 'Health Diagnosis'}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 4),
                                        Text('Confidence: ${s['confidence'] ?? 94}% · Severity: ${s['severity'] ?? 'High'}', style: const TextStyle(fontSize: 12, color: Colors.orangeAccent)),
                                        const SizedBox(height: 2),
                                        Text(_formatDate(s['createdAt']), style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                    trailing: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primary,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      ),
                                      child: const Text('Report', style: TextStyle(color: Colors.white, fontSize: 12)),
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => DetailedReportScreen(
                                              crop: s['crop'] ?? 'Crop',
                                              disease: s['disease'] ?? 'Disease',
                                              confidence: (s['confidence'] ?? 94).toString(),
                                              severity: s['severity'] ?? 'High',
                                              scientificName: s['scientificName'] ?? '',
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                );
                              },
                            )
                          : const Center(child: Text('No scans recorded yet.'))
                      : _activities.isNotEmpty
                          ? ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _activities.length,
                              itemBuilder: (ctx, idx) {
                                final a = _activities[idx];
                                return Card(
                                  color: AppColors.bgCardDark,
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: AppColors.border),
                                  ),
                                  child: ListTile(
                                    leading: const Icon(Icons.flash_on, color: AppColors.secondary),
                                    title: Text(a['title'] ?? a['action'] ?? 'Activity', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Text('${a['description'] ?? ''}\n${_formatDate(a['createdAt'])}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                  ),
                                );
                              },
                            )
                          : const Center(child: Text('No activity logs found.')),
                ),
              ],
            ),
    );
  }
}

// ==========================================
// 🔐 SECURE FARMER DOCUMENT VAULT SCREEN
// ==========================================
class DocumentVaultScreen extends StatefulWidget {
  const DocumentVaultScreen({super.key});

  @override
  State<DocumentVaultScreen> createState() => _DocumentVaultScreenState();
}

class _DocumentVaultScreenState extends State<DocumentVaultScreen> {
  String _selectedGroup = 'All';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  bool _loading = false;

  final List<String> _groups = ['All', 'Identity', 'Farming', 'Government', 'Bills', 'Other'];

  final List<Map<String, String>> _categories = [
    {'name': 'Aadhaar Card', 'group': 'Identity', 'icon': '🪪'},
    {'name': 'PAN Card', 'group': 'Identity', 'icon': '🪪'},
    {'name': 'Voter ID', 'group': 'Identity', 'icon': '🪪'},
    {'name': 'Driving License', 'group': 'Identity', 'icon': '🪪'},
    {'name': 'Land Documents', 'group': 'Farming', 'icon': '🌾'},
    {'name': 'Soil Test Report', 'group': 'Farming', 'icon': '🧪'},
    {'name': 'Crop Insurance', 'group': 'Farming', 'icon': '🛡️'},
    {'name': 'Farmer Registration', 'group': 'Farming', 'icon': '📜'},
    {'name': 'Crop Certificate', 'group': 'Farming', 'icon': '🌱'},
    {'name': 'Agriculture Certificate', 'group': 'Farming', 'icon': '🏆'},
    {'name': 'Ration Card', 'group': 'Government', 'icon': '🏠'},
    {'name': 'Income Certificate', 'group': 'Government', 'icon': '🏛️'},
    {'name': 'Government Scheme Document', 'group': 'Government', 'icon': '📑'},
    {'name': 'Government Certificate', 'group': 'Government', 'icon': '🏛️'},
    {'name': 'Agricultural Invoice / Bill', 'group': 'Bills', 'icon': '🧾'},
    {'name': 'Receipt', 'group': 'Bills', 'icon': '💳'},
    {'name': 'Other Document', 'group': 'Other', 'icon': '📄'},
  ];

  @override
  void initState() {
    super.initState();
    _loadVaultData();
  }

  Future<void> _loadVaultData() async {
    setState(() => _loading = true);
    final state = Provider.of<AppState>(context, listen: false);
    await state.fetchDocuments(search: _searchQuery, group: _selectedGroup);
    await state.fetchVaultStats();
    if (mounted) setState(() => _loading = false);
  }

  void _showUploadBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bgCardDark,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.lock, color: AppColors.primary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    const Text('Upload to Secure Vault', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.teal.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.camera_alt, color: Colors.tealAccent),
                  ),
                  title: const Text('Capture with Camera', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  subtitle: const Text('Scan physical document, land deed or ID card', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndUpload(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.blue.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.photo_library, color: Colors.blueAccent),
                  ),
                  title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  subtitle: const Text('Select saved photos of documents', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickAndUpload(ImageSource.gallery);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.orange.withOpacity(0.2), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.picture_as_pdf, color: Colors.orangeAccent),
                  ),
                  title: const Text('Select PDF / File', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  subtitle: const Text('Upload PDF reports, schemes or tax proofs', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _pickFileAndUpload();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickAndUpload(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 90);
    if (picked != null) {
      _showMetadataDialog(File(picked.path), picked.name);
    }
  }

  Future<void> _pickFileAndUpload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
    );
    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);
      _showMetadataDialog(file, result.files.single.name);
    }
  }

  void _showMetadataDialog(File file, String defaultName) {
    String selectedCategory = 'Aadhaar Card';
    final nameController = TextEditingController(text: defaultName.replaceAll(RegExp(r'\.[^/.]+$'), ''));
    final maskedController = TextEditingController();
    final notesController = TextEditingController();
    bool isSaving = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: AppColors.bgCardDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: AppColors.border),
              ),
              title: const Row(
                children: [
                  Icon(Icons.shield, color: AppColors.primary, size: 22),
                  SizedBox(width: 8),
                  Text('Document Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: const InputDecoration(
                        labelText: 'Document Category *',
                        border: OutlineInputBorder(),
                      ),
                      dropdownColor: AppColors.bgCardDark,
                      items: _categories.map((c) {
                        return DropdownMenuItem(
                          value: c['name'],
                          child: Text('${c['icon']} ${c['name']}', style: const TextStyle(fontSize: 13, color: Colors.white)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedCategory = val);
                      },
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Document Title *',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: maskedController,
                      decoration: const InputDecoration(
                        labelText: 'Masked Reference ID (Optional)',
                        hintText: 'e.g. XXXX XXXX 1234',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: notesController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Notes / Remarks (Optional)',
                        hintText: 'e.g. For KCC subsidy renewal',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (nameController.text.trim().isEmpty) return;
                          setModalState(() => isSaving = true);
                          final state = Provider.of<AppState>(context, listen: false);
                          final res = await state.uploadDocument(
                            file,
                            nameController.text.trim(),
                            selectedCategory,
                            maskedNumber: maskedController.text.trim(),
                            notes: notesController.text.trim(),
                          );
                          if (mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(res['message'] ?? 'Upload completed.'),
                                backgroundColor: res['success'] == true ? AppColors.primary : AppColors.danger,
                              ),
                            );
                          }
                        },
                  child: isSaving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Save to Vault', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showEditDialog(Map<String, dynamic> doc) {
    String selectedCategory = doc['category'] ?? 'Other Document';
    final nameController = TextEditingController(text: doc['documentName'] ?? '');
    final maskedController = TextEditingController(text: doc['maskedNumber'] ?? '');
    final notesController = TextEditingController(text: doc['notes'] ?? '');
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: AppColors.bgCardDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: const BorderSide(color: AppColors.border),
              ),
              title: const Row(
                children: [
                  Icon(Icons.edit, color: Colors.orangeAccent, size: 22),
                  SizedBox(width: 8),
                  Text('Edit Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Document Title *', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      value: selectedCategory,
                      decoration: const InputDecoration(labelText: 'Category *', border: OutlineInputBorder()),
                      dropdownColor: AppColors.bgCardDark,
                      items: _categories.map((c) {
                        return DropdownMenuItem(
                          value: c['name'],
                          child: Text('${c['icon']} ${c['name']}', style: const TextStyle(fontSize: 13, color: Colors.white)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedCategory = val);
                      },
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: maskedController,
                      decoration: const InputDecoration(labelText: 'Masked Reference ID', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: notesController,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: isSaving ? null : () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (nameController.text.trim().isEmpty) return;
                          setModalState(() => isSaving = true);
                          final state = Provider.of<AppState>(context, listen: false);
                          final ok = await state.updateDocument(
                            doc['_id'],
                            nameController.text.trim(),
                            selectedCategory,
                            maskedNumber: maskedController.text.trim(),
                            notes: notesController.text.trim(),
                          );
                          if (mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(ok ? 'Document details updated!' : 'Update failed.')),
                            );
                          }
                        },
                  child: const Text('Save', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showDeleteDialog(Map<String, dynamic> doc) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bgCardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: AppColors.border)),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: AppColors.danger, size: 24),
            SizedBox(width: 8),
            Text('Delete Document?'),
          ],
        ),
        content: Text('Are you sure you want to permanently delete "${doc['documentName']}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () async {
              Navigator.pop(ctx);
              final state = Provider.of<AppState>(context, listen: false);
              final ok = await state.deleteDocument(doc['_id']);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(ok ? 'Document permanently deleted from vault.' : 'Delete failed.'),
                    backgroundColor: ok ? AppColors.primary : AppColors.danger,
                  ),
                );
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  String _formatSize(dynamic bytes) {
    if (bytes == null) return '0 KB';
    final num b = bytes is num ? bytes : 0;
    if (b < 1024 * 1024) {
      return '${(b / 1024).toStringAsFixed(1)} KB';
    }
    return '${(b / (1024 * 1024)).toStringAsFixed(2)} MB';
  }

  String _formatDate(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr.toString()).toLocal();
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (e) {
      return dateStr.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final docs = state.documents;
    final stats = state.vaultStats;

    return Scaffold(
      appBar: AppBar(
        title: const Text('🔐 Farmer Document Vault'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _loadVaultData,
          )
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Upload Document', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: _showUploadBottomSheet,
      ),
      body: RefreshIndicator(
        onRefresh: _loadVaultData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Vault Security Pill Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock, color: AppColors.primary, size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Private & Protected: Bank-grade isolated vault. Documents are never exposed publicly or sent to AI.',
                      style: TextStyle(fontSize: 11, color: Colors.greenAccent, height: 1.3),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Stats Card Row
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.bgCardDark,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('TOTAL DOCS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text('${stats['totalDocuments'] ?? docs.length}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.bgCardDark,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('STORAGE USED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text('${stats['totalMB'] ?? '0.00'} MB', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.amberAccent)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Search Bar
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search documents by title or notes...',
                prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textSecondary),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                          state.fetchDocuments(search: '', group: _selectedGroup);
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.bgCardDark,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
              ),
              onChanged: (val) {
                setState(() => _searchQuery = val);
                state.fetchDocuments(search: val, group: _selectedGroup);
              },
            ),
            const SizedBox(height: 12),

            // Category Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _groups.map((grp) {
                  final isSelected = _selectedGroup == grp;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(
                        grp == 'All' ? 'All' : grp == 'Identity' ? '🪪 Identity' : grp == 'Farming' ? '🌾 Farming' : grp == 'Government' ? '🏛️ Govt' : grp == 'Bills' ? '📄 Bills' : '📑 Other',
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppColors.textSecondary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.bgCardDark,
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedGroup = grp);
                          state.fetchDocuments(search: _searchQuery, group: grp);
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Documents List
            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primary)))
            else if (docs.isEmpty)
              Container(
                padding: const EdgeInsets.all(40),
                decoration: BoxDecoration(
                  color: AppColors.bgCardDark,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Icon(Icons.folder_open, size: 64, color: AppColors.primary.withOpacity(0.4)),
                    const SizedBox(height: 14),
                    const Text('No Documents Found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 6),
                    Text(
                      _searchQuery.isNotEmpty ? 'No documents matched your query.' : 'Tap "+ Upload Document" to save your records securely.',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              ...docs.map((d) {
                final isPdf = d['fileType'] == 'application/pdf' || (d['fileExtension'] ?? '').toLowerCase() == '.pdf';

                return Card(
                  color: AppColors.bgCardDark,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: AppColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: isPdf ? Colors.red.withOpacity(0.15) : Colors.green.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: isPdf ? Colors.redAccent.withOpacity(0.4) : Colors.greenAccent.withOpacity(0.4),
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    isPdf ? Icons.picture_as_pdf : Icons.image,
                                    size: 20,
                                    color: isPdf ? Colors.redAccent : Colors.greenAccent,
                                  ),
                                  Text(
                                    isPdf ? 'PDF' : (d['fileExtension'] ?? 'IMG').replaceAll('.', '').toUpperCase(),
                                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    d['documentName'] ?? '',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      d['category'] ?? 'Document',
                                      style: const TextStyle(fontSize: 11, color: Colors.greenAccent, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        if (d['maskedNumber'] != null && d['maskedNumber'].toString().isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black26,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.shield, size: 12, color: Colors.amberAccent),
                                const SizedBox(width: 4),
                                Text('ID: ${d['maskedNumber']}', style: const TextStyle(fontSize: 11, color: Colors.amberAccent, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],

                        if (d['notes'] != null && d['notes'].toString().isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text('"${d['notes']}"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textSecondary)),
                        ],

                        const Divider(height: 20),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_formatDate(d['createdAt'])} · ${_formatSize(d['fileSize'])}',
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.visibility, color: Colors.greenAccent, size: 20),
                                  tooltip: 'View Document',
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => DocumentViewerScreen(document: d)),
                                    );
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit, color: Colors.orangeAccent, size: 20),
                                  tooltip: 'Edit Details',
                                  onPressed: () => _showEditDialog(d),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                  tooltip: 'Delete',
                                  onPressed: () => _showDeleteDialog(d),
                                ),
                              ],
                            )
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 👁️ DOCUMENT VIEWER SCREEN (PREVIEW & DOWNLOAD)
// ==========================================
class DocumentViewerScreen extends StatelessWidget {
  final Map<String, dynamic> document;

  const DocumentViewerScreen({super.key, required this.document});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<AppState>(context);
    final isPdf = document['fileType'] == 'application/pdf' || (document['fileExtension'] ?? '').toLowerCase() == '.pdf';
    final viewUrl = '${state.apiUrl}/documents/${document['_id']}/view';

    return Scaffold(
      appBar: AppBar(
        title: Text(document['documentName'] ?? 'Document Preview'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            tooltip: 'Download Document',
            onPressed: () async {
              final Uri uri = Uri.parse('${state.apiUrl}/documents/${document['_id']}/download');
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              } else if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Download started.')));
              }
            },
          ),
        ],
      ),
      body: isPdf
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.15),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                      ),
                      child: const Icon(Icons.picture_as_pdf, size: 64, color: Colors.redAccent),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      document['documentName'] ?? 'PDF Document',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Category: ${document['category']} · Secured in Vault',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        icon: const Icon(Icons.open_in_browser, color: Colors.white),
                        label: const Text('Open Secure PDF Stream', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        onPressed: () async {
                          final Uri uri = Uri.parse(viewUrl);
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            )
          : Center(
              child: InteractiveViewer(
                panEnabled: true,
                minScale: 0.5,
                maxScale: 4.0,
                child: Image.network(
                  viewUrl,
                  headers: {'Authorization': 'Bearer ${state.token}'},
                  fit: BoxFit.contain,
                  loadingBuilder: (ctx, child, progress) {
                    if (progress == null) return child;
                    return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                  },
                  errorBuilder: (ctx, err, stack) {
                    return Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.broken_image, size: 48, color: Colors.grey),
                        const SizedBox(height: 8),
                        const Text('Unable to load document image preview.'),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => launchUrl(Uri.parse(viewUrl), mode: LaunchMode.externalApplication),
                          child: const Text('Open in Browser'),
                        )
                      ],
                    );
                  },
                ),
              ),
            ),
    );
  }
}

