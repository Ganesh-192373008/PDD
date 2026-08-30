import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext();

// Translation dictionary for multilingual support
export const translations = {
  en: {
    dashboard: 'Dashboard',
    aiAssistant: 'AI Assistant',
    community: 'Community',
    scanCrop: 'Scan Crop',
    schemes: 'Govt Schemes',
    marketPrices: 'Market Prices',
    water: 'Water Irrigation',
    fertilizer: 'Fertilizers',
    products: 'Products Store',
    cart: 'Shopping Cart',
    notifications: 'Notifications',
    profile: 'My Profile',
    logout: 'Logout',
    welcome: 'Welcome back,',
    location: 'Current Location',
    weather: 'Current Weather',
    quickActions: 'Quick Actions',
    language: 'Preferred Language',
    experience: 'Farming Experience',
    landArea: 'Land Area',
    phone: 'Phone Number',
    email: 'Email Address',
    saveChanges: 'Save Changes',
    loading: 'Loading...',
    detectingLocation: 'Detecting your GPS location...',
    locationDenied: 'Location permission denied. You can select your location manually in settings.',
    cartTotal: 'Cart Total',
    checkout: 'Proceed to Checkout',
    clearCart: 'Clear Cart',
    viewProducts: 'View Products',
    emptyCart: 'Your cart is empty.',
    tempPlaceholder: 'Configure payment gateway on the server to proceed.',
    otpCountdown: 'Resend OTP in',
    verifyOtp: 'Verify OTP',
    sendOtp: 'Send OTP',
    enterOtp: 'Enter 6-digit OTP',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    aiAssistant: 'एआई सहायक',
    community: 'समुदाय',
    scanCrop: 'फसल स्कैन करें',
    schemes: 'सरकारी योजनाएं',
    marketPrices: 'मंडी भाव',
    water: 'सिंचाई प्रबंधन',
    fertilizer: 'उर्वरक अनुसूची',
    products: 'उत्पाद स्टोर',
    cart: 'शॉपिंग कार्ट',
    notifications: 'सूचनाएं',
    profile: 'मेरी प्रोफाइल',
    logout: 'लॉगआउट',
    welcome: 'स्वागत है,',
    location: 'वर्तमान स्थान',
    weather: 'वर्तमान मौसम',
    quickActions: 'त्वरित कार्रवाई',
    language: 'पसंदीदा भाषा',
    experience: 'खेती का अनुभव',
    landArea: 'भूमि क्षेत्र',
    phone: 'फ़ोन नंबर',
    email: 'ईमेल पता',
    saveChanges: 'बदलाव सहेजें',
    loading: 'लोड हो रहा है...',
    detectingLocation: 'जीपीएस स्थान का पता लगाया जा रहा है...',
    locationDenied: 'स्थान अनुमति अस्वीकृत। आप सेटिंग्स में मैन्युअल रूप से स्थान चुन सकते हैं।',
    cartTotal: 'कुल कार्ट मूल्य',
    checkout: 'चेकआउट करें',
    clearCart: 'कार्ट खाली करें',
    viewProducts: 'उत्पाद देखें',
    emptyCart: 'आपका कार्ट खाली है।',
    tempPlaceholder: 'भुगतान प्रक्रिया के लिए सर्वर पर गेटवे कॉन्फ़िगर करें।',
    otpCountdown: 'ओटीपी पुनः भेजें',
    verifyOtp: 'ओटीपी सत्यापित करें',
    sendOtp: 'ओटीपी भेजें',
    enterOtp: '6-अंकीय ओटीपी दर्ज करें',
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    aiAssistant: 'एआय सहाय्यक',
    community: 'समुदाय',
    scanCrop: 'पीक स्कॅन करा',
    schemes: 'शासकीय योजना',
    marketPrices: 'बाजार भाव',
    water: 'पाणी व्यवस्थापन',
    fertilizer: 'खत वेळापत्रक',
    products: 'कृषी उत्पादने',
    cart: 'शॉपिंग कार्ट',
    notifications: 'अधिसुचना',
    profile: 'माझी प्रोफाइल',
    logout: 'लॉगआउट',
    welcome: 'स्वागत आहे,',
    location: 'सध्याचे ठिकाण',
    weather: 'सध्याचे हवामान',
    quickActions: 'त्वरित कृती',
    language: 'पसंतीची भाषा',
    experience: 'शेतीचा अनुभव',
    landArea: 'शेत जमीन क्षेत्र',
    phone: 'फोन नंबर',
    email: 'ईमेल पत्ता',
    saveChanges: 'बदलाव जतन करा',
    loading: 'लोड होत आहे...',
    detectingLocation: 'जीपीएस लोकेशन शोधत आहे...',
    locationDenied: 'लोकेशन परवानगी नाकारली. आपण प्रोफाइलमध्ये स्वतःचे ठिकाण निवडू शकता.',
    cartTotal: 'एकूण कार्ट मूल्य',
    checkout: 'खरेदी करा',
    clearCart: 'कार्ट रिकामे करा',
    viewProducts: 'उत्पादने पहा',
    emptyCart: 'तुमची कार्ट रिकामी आहे.',
    tempPlaceholder: 'व्यवहार पूर्ण करण्यासाठी सर्वरवर पेमेंट गेटवे कॉन्फिगर करा.',
    otpCountdown: 'ओटीपी पुन्हा पाठवा',
    verifyOtp: 'ओटीपी सत्यापित करा',
    sendOtp: 'ओटीपी पाठवा',
    enterOtp: '६ अंकी ओटीपी प्रविष्ट करा',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    aiAssistant: 'AI விவசாய உதவியாளர்',
    community: 'சமூகம்',
    scanCrop: 'பயிர் ஸ்கேன்',
    schemes: 'அரசு திட்டங்கள்',
    marketPrices: 'சந்தை விலைகள்',
    water: 'நீர் மேலாண்மை',
    fertilizer: 'உர அட்டவணை',
    products: 'விவசாய பொருட்கள்',
    cart: 'கூடை',
    notifications: 'அறிவிப்புகள்',
    profile: 'என் சுயவிவரம்',
    logout: 'வெளியேறு',
    welcome: 'வரவேற்கிறோம்,',
    location: 'தற்போதைய இருப்பிடம்',
    weather: 'தற்போதைய வானிலை',
    quickActions: 'விரைவான செயல்கள்',
    language: 'விரும்பும் மொழி',
    experience: 'விவசாய அனுபவம்',
    landArea: 'நிலப்பரப்பு',
    phone: 'தொலைபேசி எண்',
    email: 'மின்னஞ்சல் முகவரி',
    saveChanges: 'மாற்றங்களை சேமி',
    loading: 'ஏற்றப்படுகிறது...',
    detectingLocation: 'ஜிபிஎஸ் இருப்பிடம் கண்டறியப்படுகிறது...',
    locationDenied: 'இருப்பிட அனுமதி மறுக்கப்பட்டது. சுயவிவரத்தில் கைமுறையாக இருப்பிடத்தைத் தேர்வு செய்யலாம்.',
    cartTotal: 'மொத்த விலை',
    checkout: 'பணம் செலுத்தவும்',
    clearCart: 'கூடையை காலியாக்கு',
    viewProducts: 'பொருட்களைப் பார்க்க',
    emptyCart: 'உங்கள் கூடை காலியாக உள்ளது.',
    tempPlaceholder: 'பணம் செலுத்துவதற்கு சர்வரில் அமைப்புகளை உள்ளமைக்கவும்.',
    otpCountdown: 'மீண்டும் அனுப்பவும்',
    verifyOtp: 'சரிபார்க்கவும்',
    sendOtp: 'OTP அனுப்பவும்',
    enterOtp: '6 இலக்க OTP குறியீட்டை உள்ளிடவும்',
  }
};

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ items: [] });
  const [language, setLanguage] = useState('en');
  const [location, setLocation] = useState({ lat: 18.5204, lng: 73.8567, address: 'Pune, Maharashtra' });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'https://pdd-backend-s6yk.onrender.com/api';

  // Load user profile if token exists
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
      fetchCart();
      fetchUnreadNotificationsCount();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setCart({ items: [] });
      setUnreadNotifications(0);
    }
  }, [token]);

  // Request GPS geolocation on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // Update weather whenever location details change
  useEffect(() => {
    fetchWeather();
  }, [location.lat, location.lng, user?.location?.lat, user?.location?.lng, user?.location?.address]);

  // Background Alarm / Notification Monitoring System
  useEffect(() => {
    if (!token) return;

    // Track triggered alarms to prevent multiple notifications in the same minute
    const triggeredAlarms = new Set();

    const checkAlarms = async () => {
      try {
        const now = new Date();
        const currentDateStr = now.toLocaleDateString();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        // 1. Check Water Irrigation Schedules
        const waterRes = await fetch(`${API_URL}/water`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (waterRes.ok) {
          const waterSchedules = await waterRes.json();
          for (const schedule of waterSchedules) {
            if (!schedule.remindersEnabled || !schedule.nextWatering) continue;
            
            const nextWaterDate = new Date(schedule.nextWatering);
            const isTodayOrPast = now >= nextWaterDate || currentDateStr === nextWaterDate.toLocaleDateString();
            const schedTime = schedule.wateringTime || '08:00';
            
            const alarmKey = `water_${schedule._id}_${currentDateStr}_${schedTime}`;
            
            if (isTodayOrPast && currentTimeStr === schedTime && !triggeredAlarms.has(alarmKey)) {
              triggeredAlarms.add(alarmKey);
              
              // Trigger persistent DB Notification
              await fetch(`${API_URL}/notifications`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: '💧 Irrigation Reminder',
                  message: `It is now time (${schedTime}) to irrigate your ${schedule.crop} crop (${schedule.irrigationMethod || 'Drip'}).`,
                  category: 'Water Schedule'
                })
              });
              
              // Play a sound
              playAlarmSound();

              // Update count
              fetchUnreadNotificationsCount();

              // Browser System Notification
              if (Notification.permission === 'granted') {
                new Notification('💧 Crop Irrigation Alarm', {
                  body: `Time to water your ${schedule.crop}!`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }

        // 2. Check Fertilizer Schedules
        const fertRes = await fetch(`${API_URL}/fertilizer`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fertRes.ok) {
          const fertSchedules = await fertRes.json();
          for (const schedule of fertSchedules) {
            if (!schedule.remindersEnabled || !schedule.nextApplication) continue;
            
            const nextFertDate = new Date(schedule.nextApplication);
            const isTodayOrPast = now >= nextFertDate || currentDateStr === nextFertDate.toLocaleDateString();
            const schedTime = schedule.applicationTime || '08:00';
            
            const alarmKey = `fert_${schedule._id}_${currentDateStr}_${schedTime}`;
            
            if (isTodayOrPast && currentTimeStr === schedTime && !triggeredAlarms.has(alarmKey)) {
              triggeredAlarms.add(alarmKey);
              
              // Trigger persistent DB Notification
              await fetch(`${API_URL}/notifications`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  title: '🌱 Fertilizer Reminder',
                  message: `It is now time (${schedTime}) to apply ${schedule.fertilizerType} to your ${schedule.crop} (Growth Stage: ${schedule.growthStage}).`,
                  category: 'Fertilizer Schedule'
                })
              });

              // Play a sound
              playAlarmSound();

              // Update count
              fetchUnreadNotificationsCount();

              // Browser System Notification
              if (Notification.permission === 'granted') {
                new Notification('🌱 Fertilizer Application Alarm', {
                  body: `Time to apply fertilizer to your ${schedule.crop}!`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error running alarm checks:', err);
      }
    };

    const playAlarmSound = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 523.25; // C5 note
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1.2); // Beep for 1.2 seconds
      } catch (e) {
        console.warn('AudioContext beep failed:', e);
      }
    };

    // Request Notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Run immediately, then check every 30 seconds
    checkAlarms();
    const interval = setInterval(checkAlarms, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Call reverse geocoding using keyless OpenStreetMap API to get real city name
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
            const data = await res.json();
            const address = data.address.city || data.address.town || data.address.suburb || data.address.county || 'Detected Location';
            const state = data.address.state || '';
            const district = data.address.state_district || '';
            
            setLocation({ lat, lng, address: `${address}, ${state}`, state, district });
          } catch (e) {
            setLocation({ lat, lng, address: 'Detected Location' });
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Keep Pune, Maharashtra defaults
        }
      );
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.preferredLanguage) setLanguage(data.preferredLanguage);
        if (data.location && (data.location.lat || data.location.address)) {
          setLocation({
            lat: data.location.lat || 18.5204,
            lng: data.location.lng || 73.8567,
            address: data.location.address || '',
            state: data.location.state || '',
            district: data.location.district || ''
          });
        }
      } else {
        // Token expired or invalid
        setToken('');
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
  };

  const fetchWeather = async () => {
    try {
      const activeLat = user?.location?.lat || location.lat || '18.5204';
      const activeLng = user?.location?.lng || location.lng || '73.8567';
      const activeCity = user?.location?.address || location.address || 'Pune, Maharashtra';

      const res = await fetch(`${API_URL}/weather?lat=${activeLat}&lon=${activeLng}&city=${encodeURIComponent(activeCity)}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.error('Error fetching weather:', e);
    }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_URL}/products/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error('Error fetching cart:', e);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifications(data.count);
      }
    } catch (e) {
      console.error('Error fetching notifications count:', e);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        if (data.preferredLanguage) setLanguage(data.preferredLanguage);
        if (data.location && (data.location.lat || data.location.address)) {
          setLocation({
            lat: data.location.lat || 18.5204,
            lng: data.location.lng || 73.8567,
            address: data.location.address || '',
            state: data.location.state || '',
            district: data.location.district || ''
          });
        }
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (e) {
      return { success: false, error: 'Server connection error.' };
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      if (!token) return { success: false, error: 'Please login to add items to cart.' };
      const res = await fetch(`${API_URL}/products/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, quantity })
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        return { success: true };
      }
    } catch (e) {
      console.error('Add to cart error:', e);
    }
    return { success: false, error: 'Failed to add item to cart.' };
  };

  const updateCartQuantity = async (productId, quantity) => {
    try {
      const res = await fetch(`${API_URL}/products/cart/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error('Update cart error:', e);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/products/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error('Remove from cart error:', e);
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch(`${API_URL}/products/cart`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCart({ items: [] });
      }
    } catch (e) {
      console.error('Clear cart error:', e);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <AppContext.Provider value={{
      token,
      setToken,
      user,
      setUser,
      cart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      language,
      setLanguage,
      location,
      setLocation,
      detectLocation,
      weather,
      fetchWeather,
      loading,
      setLoading,
      unreadNotifications,
      setUnreadNotifications,
      fetchUnreadNotificationsCount,
      updateProfile,
      t,
      API_URL
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
