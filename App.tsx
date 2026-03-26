import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, 
  FlatList, Alert, Modal, Share, Dimensions, KeyboardAvoidingView, Platform, Linking, Picker 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar } from 'react-native-calendars';
import { format, addMonths, subMonths, isToday } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import MockAdBanner from './components/MockAdBanner';
import BookingCard from './components/BookingCard';
import { Booking } from './types';
import { storage } from './utils/storage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const { width } = Dimensions.get('window');

function DashboardScreen({ navigation, bookings, refreshBookings }: { 
  navigation: any; 
  bookings: Booking[]; 
  refreshBookings: () => void;
}) {
  const totalBookings = bookings.length;
  const totalEarnings = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const pendingPayments = bookings.filter(b => b.status === 'pending').length;
  const pendingAmount = bookings
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + (b.totalAmount - b.advancePaid), 0);

  const upcoming = [...bookings]
    .filter(b => new Date(b.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const currentMonth = format(new Date(), 'MMMM');
  const currentMonthBookings = bookings.filter(b => {
    const d = new Date(b.date);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  });
  const monthEarnings = currentMonthBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>Smart Booking</Text>
          <Text style={styles.subtitle}>Manager</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Rewards')}>
          <Ionicons name="gift-outline" size={26} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalBookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{totalEarnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingPayments}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Monthly Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{currentMonth} Overview</Text>
          <View style={styles.monthCard}>
            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>Bookings this month</Text>
              <Text style={styles.monthValue}>{currentMonthBookings.length}</Text>
            </View>
            <View style={styles.monthRow}>
              <Text style={styles.monthLabel}>Earnings this month</Text>
              <Text style={styles.monthValue}>₹{monthEarnings}</Text>
            </View>
          </View>
        </View>

        {/* Upcoming */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BookingsList')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          
          {upcoming.length > 0 ? (
            upcoming.map(booking => (
              <TouchableOpacity 
                key={booking.id} 
                onPress={() => navigation.navigate('BookingDetails', { booking })}
              >
                <BookingCard booking={booking} onPress={() => {}} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No upcoming bookings</Text>
            </View>
          )}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      <MockAdBanner />

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddBooking')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function CalendarScreen({ bookings, navigation }: { bookings: Booking[]; navigation: any }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    const marks: any = {};
    bookings.forEach(booking => {
      const dateKey = booking.date;
      if (!marks[dateKey]) {
        marks[dateKey] = { 
          marked: true, 
          dotColor: '#3b82f6',
          customStyles: {
            container: {
              backgroundColor: '#dbeafe',
            }
          }
        };
      }
    });
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: '#3b82f6',
    };
    setMarkedDates(marks);
  }, [bookings, selectedDate]);

  const dayBookings = bookings.filter(b => b.date === selectedDate);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Calendar</Text>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          current={format(new Date(), 'yyyy-MM-dd')}
          markedDates={markedDates}
          onDayPress={(day: any) => {
            setSelectedDate(day.dateString);
          }}
          theme={{
            todayTextColor: '#3b82f6',
            arrowColor: '#3b82f6',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
          style={styles.calendar}
        />
      </View>

      <View style={styles.selectedDateHeader}>
        <Text style={styles.selectedDate}>
          {format(new Date(selectedDate), 'EEEE, MMMM dd')}
        </Text>
        <Text style={styles.bookingCount}>{dayBookings.length} bookings</Text>
      </View>

      <FlatList
        data={dayBookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BookingDetails', { booking: item })}>
            <BookingCard booking={item} onPress={() => {}} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={42} color="#e2e8f0" />
            <Text style={styles.emptyText}>No bookings on this day</Text>
            <TouchableOpacity 
              style={styles.addForDateBtn}
              onPress={() => navigation.navigate('AddBooking', { initialDate: selectedDate })}
            >
              <Text style={styles.addForDateText}>Add booking for this date</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <MockAdBanner size="small" />
    </SafeAreaView>
  );
}

function AddBookingScreen({ navigation, onSave }: { 
  navigation: any; 
  onSave: (booking: Booking) => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [programType, setProgramType] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [displayDate, setDisplayDate] = useState(format(new Date(), 'dd MMMM yyyy'));
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [location, setLocation] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [advancePaid, setAdvancePaid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [programSuggestions, setProgramSuggestions] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState('6');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempPeriod, setTempPeriod] = useState('PM');
  const [currentEditingTime, setCurrentEditingTime] = useState<'start' | 'end'>('start');

  const SUGGESTIONS = [
    'Birthday', 'Wedding', 'Party', 'Engagement', 'Sagai', 'Faldan',
    'Mata Pujan', 'Ganga Mai', 'Spot DJ', 'Mahila Sangeet',
    'Shri Ganesh Visarjan', 'Mata Ji Visarjan', 'Barat', 'Raily'
  ];

  const handleDateSelect = (selectedDate: any) => {
    const dateStr = selectedDate.dateString;
    setDate(dateStr);
    setDisplayDate(format(new Date(dateStr), 'dd MMMM yyyy'));
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!customerName || !phone || !programType || !location || !totalAmount) {
      Alert.alert('Missing Info', 'Please fill all required fields');
      return;
    }

    // Time validation
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    if (end <= start) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    setIsSaving(true);

    const newBooking: Booking = {
      id: 'booking_' + Date.now(),
      customerName,
      phone,
      programType,
      date,
      startTime,
      endTime,
      location,
      totalAmount: parseInt(totalAmount),
      advancePaid: parseInt(advancePaid) || 0,
      status: parseInt(advancePaid || '0') >= parseInt(totalAmount || '0') ? 'paid' : 'pending',
    };

    await storage.addBooking(newBooking);
    onSave(newBooking);

    // Simulate interstitial ad
    Alert.alert(
      'Ad Playing', 
      'Interstitial Ad would play here (ca-app-pub-3927448561170931/1392237863)',
      [{
        text: 'Close Ad',
        onPress: () => {
          setIsSaving(false);
          navigation.goBack();
          
          // WhatsApp message simulation
          const remaining = parseInt(totalAmount) - (parseInt(advancePaid) || 0);
          const message = `Hello ${customerName},\n\nYour booking is confirmed.\n\nProgram: ${programType}\nDate: ${date}\nTime: ${startTime} - ${endTime}\nLocation: ${location}\n\nTotal Amount: ₹${totalAmount}\nAdvance Paid: ₹${advancePaid || 0}\nRemaining: ₹${remaining}\n\nThank you 🙏`;
          
          Alert.alert(
            'Booking Saved!', 
            'Would you like to send confirmation on WhatsApp?',
            [
              { text: 'Cancel' },
              { 
                text: 'Send WhatsApp', 
                onPress: () => sendWhatsApp(phone, message) 
              }
            ]
          );
        }
      }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e2937" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>New Booking</Text>
          <View style={{width: 30}} />
        </View>

        <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="John Doe"
            />

            <Text style={styles.formLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />

            <Text style={styles.formLabel}>Program Type *</Text>
            <View style={styles.programInputContainer}>
              <TextInput
                style={styles.input}
                value={programType}
                onChangeText={(text) => {
                  setProgramType(text);
                  const filtered = SUGGESTIONS.filter(s => 
                    s.toLowerCase().includes(text.toLowerCase())
                  );
                  setProgramSuggestions(filtered.length > 0 ? filtered : SUGGESTIONS.slice(0, 8));
                  setShowSuggestions(text.length > 0);
                }}
                placeholder="Enter program type"
                onFocus={() => {
                  setProgramSuggestions(SUGGESTIONS);
                  setShowSuggestions(true);
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              />
              {showSuggestions && programSuggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  {programSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setProgramType(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.formLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateDisplay}>{displayDate}</Text>
              <Ionicons name="calendar-outline" size={22} color="#3b82f6" />
            </TouchableOpacity>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Start Time</Text>
                <TouchableOpacity 
                  style={styles.timeSelector}
                  onPress={() => Alert.alert('Time Picker', 'Clock-style time picker would open here (12-hour with AM/PM). Current: ' + startTime)}
                >
                  <Text style={styles.timeDisplay}>{startTime}</Text>
                  <Ionicons name="time-outline" size={22} color="#3b82f6" />
                </TouchableOpacity>
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>End Time</Text>
                <TouchableOpacity 
                  style={styles.timeSelector}
                  onPress={() => Alert.alert('Time Picker', 'Clock-style time picker would open here (12-hour with AM/PM). Current: ' + endTime)}
                >
                  <Text style={styles.timeDisplay}>{endTime}</Text>
                  <Ionicons name="time-outline" size={22} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.formLabel}>Location *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Venue name or address"
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Total Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="25000"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.formLabel}>Advance Paid (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={advancePaid}
                  onChangeText={setAdvancePaid}
                  placeholder="5000"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.saveButtonText}>
              {isSaving ? 'SAVING...' : 'SAVE BOOKING'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Calendar
                current={date}
                markedDates={{
                  [date]: { selected: true, selectedColor: '#3b82f6' }
                }}
                onDayPress={handleDateSelect}
                theme={{
                  selectedDayBackgroundColor: '#3b82f6',
                  todayTextColor: '#3b82f6',
                  arrowColor: '#3b82f6',
                }}
                style={styles.calendarInModal}
              />
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const sendWhatsApp = async (phone: string, message: string) => {
  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
    
    // For demo purposes
    Alert.alert(
      'WhatsApp', 
      'Opening WhatsApp with pre-filled message...',
      [{ text: 'OK' }]
    );
    
    // In real app would use Linking.openURL(url)
  } catch (e) {
    Alert.alert('Error', 'Could not open WhatsApp');
  }
};

function BookingDetailsScreen({ route, navigation, onDelete, onUpdate }: {
  route: any;
  navigation: any;
  onDelete: (id: string) => void;
  onUpdate: (booking: Booking) => void;
}) {
  const { booking } = route.params;
  const remaining = booking.totalAmount - booking.advancePaid;
  const [localBooking, setLocalBooking] = useState(booking);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const toggleStatus = () => {
    const newStatus = localBooking.status === 'paid' ? 'pending' : 'paid';
    const updated = { ...localBooking, status: newStatus };
    setLocalBooking(updated);
    onUpdate(updated);
    setShowStatusModal(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Booking',
      'Are you sure you want to delete this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(booking.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleGenerateBill = () => {
    navigation.navigate('BillGenerator', { booking: localBooking });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e2937" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Booking Details</Text>
        <TouchableOpacity onPress={() => setShowStatusModal(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.detailsScroll}>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailName}>{localBooking.customerName}</Text>
            <View style={[styles.statusBadgeDetail, localBooking.status === 'paid' ? styles.paidBadge : styles.pendingBadge]}>
              <Text style={localBooking.status === 'paid' ? styles.paidTextDetail : styles.pendingTextDetail}>
                {localBooking.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{localBooking.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{format(new Date(localBooking.date), 'dd MMMM yyyy')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{localBooking.startTime} — {localBooking.endTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{localBooking.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="gift-outline" size={20} color="#64748b" />
            <Text style={styles.infoText}>{localBooking.programType}</Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabelBig}>Total Amount</Text>
            <Text style={styles.amountBig}>₹{localBooking.totalAmount}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabelBig}>Advance Paid</Text>
            <Text style={styles.advanceBig}>₹{localBooking.advancePaid}</Text>
          </View>
          <View style={[styles.amountRow, styles.remainingRow]}>
            <Text style={styles.amountLabelBig}>Remaining Balance</Text>
            <Text style={styles.remainingBig}>₹{remaining}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleGenerateBill}>
            <Ionicons name="document-text-outline" size={22} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Generate Bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('EditBooking', { booking: localBooking })}>
            <Ionicons name="create-outline" size={22} color="#3b82f6" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.deleteAction]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MockAdBanner size="small" adUnitId="ca-app-pub-3927448561170931/9405491657" />

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            <TouchableOpacity style={styles.modalOption} onPress={toggleStatus}>
              <Text>Mark as {localBooking.status === 'paid' ? 'Pending' : 'Paid'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatusModal(false)}>
              <Text style={{ color: '#ef4444' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function BillGeneratorScreen({ route, navigation }: { route: any; navigation: any }) {
  const { booking } = route.params;
  const remaining = booking.totalAmount - booking.advancePaid;

  const invoiceDate = format(new Date(), 'dd/MM/yyyy');

  const handleShare = async () => {
    const message = `📄 *INVOICE - Smart Booking Manager*\n\n` +
      `Customer: ${booking.customerName}\n` +
      `Phone: ${booking.phone}\n` +
      `Program: ${booking.programType}\n` +
      `Date: ${format(new Date(booking.date), 'dd MMM yyyy')}\n` +
      `Time: ${booking.startTime} - ${booking.endTime}\n` +
      `Location: ${booking.location}\n\n` +
      `Total Amount: *₹${booking.totalAmount}*\n` +
      `Advance Paid: ₹${booking.advancePaid}\n` +
      `Remaining: *₹${remaining}*\n\n` +
      `Thank you for choosing us! 🙏`;

    await Clipboard.setStringAsync(message);
    Alert.alert('Copied!', 'Invoice copied to clipboard. You can share it on WhatsApp.');
  };

  const handleDownloadPDF = () => {
    Alert.alert(
      'Reward Required', 
      'Watch a rewarded ad to unlock PDF download?',
      [
        { text: 'Cancel' },
        { 
          text: 'Watch Ad', 
          onPress: () => {
            Alert.alert('Ad Played', 'Thank you! PDF download unlocked (demo)', [
              { text: 'Download', onPress: () => Alert.alert('PDF Saved', 'Bill saved to downloads (demo)') }
            ]);
          } 
        }
      ]
    );
  };

  const handleSendWhatsApp = async () => {
    const message = `Hello ${booking.customerName},\n\nYour booking is confirmed.\n\nProgram: ${booking.programType}\nDate: ${format(new Date(booking.date), 'dd MMM yyyy')}\nTime: ${booking.startTime} - ${booking.endTime}\nLocation: ${booking.location}\n\nTotal Amount: ₹${booking.totalAmount}\nAdvance Paid: ₹${booking.advancePaid}\nRemaining: ₹${remaining}\n\nThank you 🙏`;
    
    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = booking.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    try {
      await Linking.openURL(whatsappUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp. Make sure it is installed.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e2937" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Invoice</Text>
        <View />
      </View>

      <View style={styles.invoiceContainer}>
        <View style={styles.invoice}>
          <View style={styles.invoiceHeader}>
            <Text style={styles.companyName}>SMART BOOKING</Text>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceDate}>Date: {invoiceDate}</Text>
          </View>

          <View style={styles.invoiceDivider} />

          <View style={styles.invoiceInfo}>
            <View>
              <Text style={styles.label}>Billed To</Text>
              <Text style={styles.invoiceValue}>{booking.customerName}</Text>
              <Text style={styles.invoiceValueSmall}>{booking.phone}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.label}>Event</Text>
              <Text style={styles.invoiceValue}>{booking.programType}</Text>
            </View>
          </View>

          <View style={styles.invoiceDetails}>
            <View style={styles.detailLine}>
              <Text style={styles.detailKey}>Date</Text>
              <Text style={styles.detailVal}>{format(new Date(booking.date), 'dd MMM yyyy')}</Text>
            </View>
            <View style={styles.detailLine}>
              <Text style={styles.detailKey}>Time</Text>
              <Text style={styles.detailVal}>{booking.startTime} - {booking.endTime}</Text>
            </View>
            <View style={styles.detailLine}>
              <Text style={styles.detailKey}>Venue</Text>
              <Text style={styles.detailVal}>{booking.location}</Text>
            </View>
          </View>

          <View style={styles.invoiceTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{booking.totalAmount}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Advance Paid</Text>
              <Text style={styles.totalValueSub}>₹{booking.advancePaid}</Text>
            </View>
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalLabel}>Remaining</Text>
              <Text style={styles.finalValue}>₹{remaining}</Text>
            </View>
          </View>

          <Text style={styles.thankYou}>Thank you for your business! 🙏</Text>
        </View>
      </View>

      <View style={styles.billActions}>
        <TouchableOpacity style={styles.billBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={20} color="white" />
          <Text style={styles.billBtnText}>Share Invoice</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.billBtn, styles.whatsappBtn]} onPress={handleSendWhatsApp}>
          <Ionicons name="logo-whatsapp" size={22} color="white" />
          <Text style={styles.billBtnText}>Send via WhatsApp</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.billBtn, styles.pdfBtn]} onPress={handleDownloadPDF}>
          <Ionicons name="download-outline" size={20} color="white" />
          <Text style={styles.billBtnText}>Download PDF</Text>
        </TouchableOpacity>
      </View>

      <MockAdBanner size="small" />
    </SafeAreaView>
  );
}

function RewardsScreen() {
  const [watchedAds, setWatchedAds] = useState(0);

  const watchRewardedAd = () => {
    Alert.alert(
      'Rewarded Ad', 
      'Playing rewarded ad (ca-app-pub-3927448561170931/5722498562)\n\nYou will get premium access for 24 hours after watching.',
      [
        {
          text: 'Watch Ad',
          onPress: () => {
            setWatchedAds(prev => prev + 1);
            Alert.alert('Success!', 'Premium features unlocked for today! 🎉\n\nYou can now download PDFs without limits.');
          }
        },
        { text: 'Cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Rewards & Ads</Text>
      </View>

      <ScrollView contentContainerStyle={styles.rewardsContent}>
        <View style={styles.rewardCard}>
          <Ionicons name="trophy-outline" size={64} color="#eab308" />
          <Text style={styles.rewardTitle}>Watch Ads to Earn</Text>
          <Text style={styles.rewardDesc}>Watch rewarded videos to unlock PDF downloads and remove ads temporarily</Text>
          
          <TouchableOpacity style={styles.rewardButton} onPress={watchRewardedAd}>
            <Ionicons name="play-circle" size={22} color="white" />
            <Text style={styles.rewardButtonText}>WATCH VIDEO AD (Rewarded)</Text>
          </TouchableOpacity>
          
          <Text style={styles.adWatched}>Ads watched today: {watchedAds}</Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 How rewards work</Text>
          <Text style={styles.tipText}>• 1 ad = 3 free PDF downloads</Text>
          <Text style={styles.tipText}>• 3 ads = Remove all ads for 48 hours</Text>
          <Text style={styles.tipText}>• Ads support free use of the app</Text>
        </View>

        <MockAdBanner />
      </ScrollView>
    </SafeAreaView>
  );
}

function MyBookingsScreen({ bookings, navigation, onDelete, refreshBookings }: {
  bookings: Booking[];
  navigation: any;
  onDelete: (id: string) => void;
  refreshBookings: () => void;
}) {
  const [filteredBookings, setFilteredBookings] = useState(bookings);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    let filtered = [...bookings];
    
    if (filter === 'upcoming') {
      filtered = filtered.filter(b => new Date(b.date) >= new Date());
    } else if (filter === 'past') {
      filtered = filtered.filter(b => new Date(b.date) < new Date());
    }
    
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setFilteredBookings(filtered);
  }, [bookings, filter]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Bookings</Text>
      </View>

      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]} 
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, filter === 'upcoming' && styles.filterTabTextActive]}>Upcoming</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filter === 'past' && styles.filterTabActive]} 
          onPress={() => setFilter('past')}
        >
          <Text style={[styles.filterTabText, filter === 'past' && styles.filterTabTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BookingDetails', { booking: item })}>
            <BookingCard booking={item} onPress={() => {}} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { marginTop: 60 }]}>
            <Ionicons name="bookmarks-outline" size={54} color="#cbd5e1" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
        contentContainerStyle={{ padding: 16 }}
      />
      
      <MockAdBanner size="small" />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadBookings = useCallback(async () => {
    const loaded = await storage.getBookings();
    setBookings(loaded);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      loadBookings();
    }
  }, [fontsLoaded, loadBookings, refreshKey]);

  const refreshBookings = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSaveBooking = (newBooking: Booking) => {
    setBookings(prev => [...prev, newBooking]);
  };

  const handleUpdateBooking = (updated: Booking) => {
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    storage.updateBooking(updated);
  };

  const handleDeleteBooking = async (id: string) => {
    await storage.deleteBooking(id);
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  if (!fontsLoaded) {
    return null;
  }

  const HomeTabs = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Calendar') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Rewards') iconName = focused ? 'gift' : 'gift-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen name="Dashboard">
        {props => <DashboardScreen {...props} bookings={bookings} refreshBookings={refreshBookings} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar">
        {props => <CalendarScreen {...props} bookings={bookings} />}
      </Tab.Screen>
      <Tab.Screen name="Bookings">
        {props => (
          <MyBookingsScreen 
            {...props} 
            bookings={bookings} 
            onDelete={handleDeleteBooking}
            refreshBookings={refreshBookings}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Rewards" component={RewardsScreen} />
    </Tab.Navigator>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        
        <Stack.Screen name="AddBooking">
          {props => <AddBookingScreen {...props} onSave={handleSaveBooking} />}
        </Stack.Screen>
        
        <Stack.Screen name="BookingDetails">
          {props => (
            <BookingDetailsScreen 
              {...props} 
              onDelete={handleDeleteBooking} 
              onUpdate={handleUpdateBooking} 
            />
          )}
        </Stack.Screen>
        
        <Stack.Screen name="BillGenerator" component={BillGeneratorScreen} />
      </Stack.Navigator>
      
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: -4,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e2937',
  },
  backBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e40af',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e2937',
  },
  seeAll: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  monthCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  monthLabel: {
    fontSize: 15,
    color: '#475569',
  },
  monthValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2937',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: 'white',
    borderRadius: 16,
    marginTop: 10,
  },
  emptyText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  calendarContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  calendar: {
    borderRadius: 12,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedDate: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e2937',
  },
  bookingCount: {
    fontSize: 15,
    color: '#3b82f6',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  programInputContainer: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 8,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  dateDisplay: {
    fontSize: 16,
    color: '#1e2937',
    fontWeight: '500',
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  timeDisplay: {
    fontSize: 16,
    color: '#1e2937',
    fontWeight: '500',
  },
  datePickerModal: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 80,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  calendarInModal: {
    borderRadius: 12,
    margin: 8,
  },
  modalCloseButton: {
    backgroundColor: '#f1f5f9',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  detailsScroll: {
    flex: 1,
  },
  detailCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
  },
  statusBadgeDetail: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  paidBadge: {
    backgroundColor: '#ecfdf5',
  },
  pendingBadge: {
    backgroundColor: '#fefce8',
  },
  paidTextDetail: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },
  pendingTextDetail: {
    color: '#ca8a04',
    fontWeight: '700',
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    gap: 14,
  },
  infoText: {
    fontSize: 16,
    color: '#334155',
  },
  amountSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  amountLabelBig: {
    fontSize: 16,
    color: '#475569',
  },
  amountBig: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1e40af',
  },
  advanceBig: {
    fontSize: 21,
    fontWeight: '700',
    color: '#15803d',
  },
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 18,
    marginTop: 4,
  },
  remainingBig: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b91c1c',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  deleteAction: {
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  deleteText: {
    color: '#ef4444',
  },
  invoiceContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  invoice: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  invoiceHeader: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 15,
    letterSpacing: 3,
    fontWeight: '700',
    color: '#334155',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e2937',
    marginVertical: 2,
    letterSpacing: -1,
  },
  invoiceDate: {
    color: '#64748b',
    fontSize: 13,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 22,
  },
  invoiceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 3,
  },
  invoiceValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  invoiceValueSmall: {
    fontSize: 14,
    color: '#64748b',
  },
  invoiceDetails: {
    marginTop: 26,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  detailKey: {
    color: '#64748b',
  },
  detailVal: {
    fontWeight: '500',
  },
  invoiceTotals: {
    marginTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  totalLabel: {
    fontSize: 15,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '700',
  },
  totalValueSub: {
    fontSize: 17,
    color: '#64748b',
  },
  finalTotal: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 8,
  },
  finalLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  finalValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1e40af',
  },
  thankYou: {
    textAlign: 'center',
    marginTop: 32,
    color: '#64748b',
    fontStyle: 'italic',
  },
  billActions: {
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  billBtn: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  pdfBtn: {
    backgroundColor: '#10b981',
  },
  billBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancel: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  rewardsContent: {
    padding: 20,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 24,
  },
  rewardTitle: {
    fontSize: 21,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  rewardDesc: {
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24,
  },
  rewardButton: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: '100%',
  },
  rewardButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  adWatched: {
    marginTop: 22,
    color: '#64748b',
    fontSize: 13,
  },
  tipBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
  },
  tipTitle: {
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 12,
  },
  tipText: {
    color: '#0c4a6e',
    marginBottom: 6,
    lineHeight: 20,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#f0f9ff',
  },
  filterTabText: {
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#0369a1',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 20,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 16,
    color: '#334155',
  },
});
