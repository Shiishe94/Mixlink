import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messageApi, authApi } from '../../src/services/api';
import { Message } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { format, isToday, isYesterday } from 'date-fns';
import { goBack } from '../../src/utils/navigation';
import { fr } from 'date-fns/locale';
import { NEON_COLORS } from '../../src/components/NeonBackground';

export default function ChatScreen() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket for real-time messages
  const connectWebSocket = useCallback(() => {
    if (!user?.id) return;

    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullWsUrl = `${wsUrl}/ws/${user.id}`;

    console.log('Connecting to WebSocket:', fullWsUrl);

    try {
      wsRef.current = new WebSocket(fullWsUrl);

      wsRef.current.onopen = () => {
        console.log('Chat WebSocket connected');
        setWsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Chat WebSocket message:', data);

          if (data.type === 'new_message' && data.message) {
            // Only add if the message is from/to our conversation partner
            if (data.message.sender_id === partnerId || data.message.receiver_id === partnerId) {
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
              // Scroll to bottom
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        setWsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('Chat WebSocket disconnected');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [user?.id, partnerId]);

  useEffect(() => {
    loadMessages();
    connectWebSocket();

    // Fallback: Poll every 10 seconds in case WebSocket fails
    const interval = setInterval(loadMessages, 10000);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [partnerId, connectWebSocket]);

  const loadMessages = async () => {
    try {
      const res = await messageApi.getMessages(partnerId!);
      setMessages(res.data);
      
      // Get partner info from conversations
      const convRes = await messageApi.getConversations();
      const partner = convRes.data.find((c: any) => c.partner_id === partnerId);
      if (partner) {
        setPartnerInfo({
          name: partner.partner_name,
          image: partner.partner_image,
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await messageApi.send({
        receiver_id: partnerId!,
        content: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm');
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  const renderMessages = () => {
    let lastDate = '';
    return messages.map((message, index) => {
      const messageDate = message.created_at.split('T')[0];
      const showDateHeader = messageDate !== lastDate;
      lastDate = messageDate;

      const isMe = message.sender_id === user?.id;

      return (
        <View key={message.id}>
          {showDateHeader && (
            <View style={styles.dateHeader}>
              <Text style={styles.dateHeaderText}>
                {formatDateHeader(message.created_at)}
              </Text>
            </View>
          )}
          <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
            <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
              <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                {message.content}
              </Text>
              <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                {formatMessageTime(message.created_at)}
              </Text>
            </View>
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              {partnerInfo?.image ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${partnerInfo.image}` }}
                  style={styles.headerAvatarImage}
                />
              ) : (
                <Ionicons name="person" size={20} color="#636E72" />
              )}
              {/* Online indicator */}
              <View style={[styles.onlineIndicator, wsConnected && styles.onlineIndicatorActive]} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {partnerInfo?.name || 'Conversation'}
              </Text>
              <Text style={styles.headerStatus}>
                {wsConnected ? 'En direct' : 'Hors ligne'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.wsStatusDot, wsConnected && styles.wsStatusDotConnected]} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color="#636E72" />
              <Text style={styles.emptyText}>Commencez la conversation</Text>
            </View>
          ) : (
            renderMessages()
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Votre message..."
            placeholderTextColor="#636E72"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#636E72',
    borderWidth: 2,
    borderColor: '#0c0c0c',
  },
  onlineIndicatorActive: {
    backgroundColor: '#00B894',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#636E72',
  },
  wsStatusDotConnected: {
    backgroundColor: '#00B894',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 16,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#636E72',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  messageContainerMe: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleMe: {
    backgroundColor: '#6C5CE7',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#636E72',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2D3436',
  },
});
