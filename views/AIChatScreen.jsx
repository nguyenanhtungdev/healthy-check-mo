import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

const PRIMARY = "#6366f1";
const SECONDARY = "#8b5cf6";
const SUCCESS = "#10b981";
const TEXT_PRIMARY = "#1f2937";
const TEXT_SECONDARY = "#6b7280";
const BACKGROUND = "#f9fafb";
const BORDER_COLOR = "#e5e7eb";

const AIChatScreen = () => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollViewRef = useRef(null);

  // Typing indicator animation
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Format AI message with markdown-like styling
  const renderFormattedText = (text) => {
    const lines = text.split("\n");
    const elements = [];

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine === "") {
        elements.push(
          <View key={`space-${lineIndex}`} style={styles.lineBreak} />
        );
        return;
      }

      // Numbered list: **1. text** or 1. text
      const numberedMatch = trimmedLine.match(
        /^\*{0,2}(\d+)\.\s*(.+?)(\*{0,2})$/
      );
      if (numberedMatch) {
        const content = numberedMatch[2]
          .replace(/^\*{1,2}/, "")
          .replace(/\*{1,2}$/, "");
        elements.push(
          <View key={`num-${lineIndex}`} style={styles.listItem}>
            <Text style={styles.listNumber}>{numberedMatch[1]}.</Text>
            <Text style={styles.listText}>{content}</Text>
          </View>
        );
        return;
      }

      // Bullet list: * text or • text
      const bulletMatch = trimmedLine.match(/^[•*]\s*(.+)$/);
      if (bulletMatch) {
        const content = bulletMatch[1]
          .replace(/^\*{1,2}/, "")
          .replace(/\*{1,2}$/, "");
        elements.push(
          <View key={`bullet-${lineIndex}`} style={styles.listItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listText}>{content}</Text>
          </View>
        );
        return;
      }

      // Regular text with bold formatting: **text**
      if (trimmedLine.includes("**")) {
        const parts = trimmedLine.split("**");
        const textElements = parts.map((part, i) => {
          if (i % 2 === 1 && part.trim() !== "") {
            return (
              <Text key={`bold-${lineIndex}-${i}`} style={styles.boldText}>
                {part}
              </Text>
            );
          }
          return part;
        });
        elements.push(
          <Text key={`line-${lineIndex}`} style={styles.messageText}>
            {textElements}
          </Text>
        );
        return;
      }

      // Regular text
      elements.push(
        <Text key={`line-${lineIndex}`} style={styles.messageText}>
          {trimmedLine}
        </Text>
      );
    });

    return elements;
  };

  const createSession = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        setIsLoadingHistory(false);
        return null;
      }

      const response = await fetch(`${config.API_BASE}/api/ai/session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Save session_id to AsyncStorage
        await AsyncStorage.setItem("ai_chat_session_id", data.session_id);
        return data.session_id;
      } else {
        console.error("Failed to create session:", response.status);
        return null;
      }
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    }
  };

  const loadChatHistory = async (sid, page = 1, append = false) => {
    try {
      const token = await getToken();
      if (!token) return;

      const limit = 4;
      const response = await fetch(
        `${config.API_BASE}/api/ai/history/${sid}?page=${page}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map((msg) => ({
            id: msg.id,
            type: msg.sender === "user" ? "user" : "ai",
            text: msg.message,
            timestamp: new Date(msg.createdAt),
          }));

          if (append) {
            // Prepend older messages to the beginning, avoiding duplicates
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMessages = formattedMessages.filter(
                (msg) => !existingIds.has(msg.id)
              );
              return [...newMessages, ...prev];
            });
          } else {
            setMessages(formattedMessages);
          }

          // Check if there are more messages
          setHasMore(data.messages.length === limit);
        } else {
          if (!append) {
            // Show welcome message if no history
            setMessages([
              {
                id: "welcome",
                type: "ai",
                text: "Xin chào! Tôi là trợ lý sức khỏe AI. Tôi có thể giúp bạn:\n\n• Tạo lịch tập luyện cá nhân hóa\n• Tư vấn chế độ dinh dưỡng\n• Lên kế hoạch meal plan\n• Tư vấn sức khỏe gia đình\n\nBạn cần tôi giúp gì?",
                timestamp: new Date(),
              },
            ]);
          }
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      if (!append) {
        setIsLoadingHistory(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || isLoadingMore || !sessionId) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await loadChatHistory(sessionId, nextPage, true);
  };

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;

    // Check if scrolled to top (with 50px threshold)
    if (contentOffset.y <= 50 && hasMore && !isLoadingMore) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    const initSession = async () => {
      // Try to load existing session_id from AsyncStorage
      const savedSessionId = await AsyncStorage.getItem("ai_chat_session_id");

      let sid = savedSessionId;

      // If no saved session, create new one
      if (!sid) {
        sid = await createSession();
      }

      if (sid) {
        setSessionId(sid);
        setCurrentPage(1);
        setHasMore(true);
        await loadChatHistory(sid, 1, false);
      } else {
        setIsLoadingHistory(false);
      }
    };
    initSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoading) {
      // Animated typing dots
      const createDotAnimation = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animation1 = createDotAnimation(dot1Anim, 0);
      const animation2 = createDotAnimation(dot2Anim, 150);
      const animation3 = createDotAnimation(dot3Anim, 300);

      animation1.start();
      animation2.start();
      animation3.start();

      return () => {
        animation1.stop();
        animation2.stop();
        animation3.stop();
        dot1Anim.setValue(0);
        dot2Anim.setValue(0);
        dot3Anim.setValue(0);
      };
    }
  }, [isLoading]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getToken = async () => {
    try {
      const tokenKeys = ["token", "accessToken", "authToken", "authorization"];
      for (const key of tokenKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) return token;
      }

      const accStr = await AsyncStorage.getItem("account");
      if (accStr) {
        const acc = JSON.parse(accStr);
        return acc?.token || acc?.accessToken;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${config.API_BASE}/api/ai/ask/${sessionId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: userMessage.text,
          }),
        }
      );

      if (response.ok) {
        const responseText = await response.text();

        // Parse JSON và lấy nội dung thuần túy
        let aiResponseText = responseText;
        try {
          const parsed = JSON.parse(responseText);
          // Lấy giá trị từ trường "response" nếu có
          aiResponseText = parsed.response || responseText;
        } catch (e) {
          // Nếu không parse được JSON, dùng text gốc
          aiResponseText = responseText;
        }

        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: aiResponseText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        const errorText = await response.text();
        console.error("AI API Error:", response.status, errorText);

        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);

        Alert.alert("Lỗi", `Không thể kết nối AI (${response.status})`);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        text: "Xin lỗi, không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      Alert.alert("Lỗi", "Không thể kết nối đến AI");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12; // Convert to 12-hour format
    return `${displayHours}:${minutes} ${period}`;
  };

  const renderSuggestions = () => {
    const suggestions = [
      "Tạo lịch chạy bộ 5km trong 14 ngày",
      "Tư vấn chế độ ăn giảm cân",
      "Lên kế hoạch meal plan 1 tuần",
      "Bài tập cardio tại nhà",
    ];

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Gợi ý câu hỏi:</Text>
        <View style={styles.suggestionsGrid}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => setInputText(suggestion)}
            >
              <Ionicons name="bulb-outline" size={14} color={PRIMARY} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[PRIMARY, SECONDARY]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitleGroup}>
            <Ionicons name="sparkles" size={28} color="#fff" />
            <View>
              <Text style={styles.headerTitle}>Trợ lý AI</Text>
              <Text style={styles.headerSubtitle}>
                Tư vấn sức khỏe & dinh dưỡng
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
              <Text style={styles.loadingText}>Đang tải lịch sử chat...</Text>
            </View>
          ) : (
            <>
              {isLoadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
                </View>
              )}
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrapper,
                    message.type === "user"
                      ? styles.userMessageWrapper
                      : styles.aiMessageWrapper,
                  ]}
                >
                  {message.type === "ai" && (
                    <View style={styles.aiAvatar}>
                      <Ionicons name="sparkles" size={16} color={PRIMARY} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      message.type === "user"
                        ? styles.userMessageBubble
                        : styles.aiMessageBubble,
                    ]}
                  >
                    {message.type === "user" ? (
                      <Text style={styles.userMessageText}>{message.text}</Text>
                    ) : (
                      <View style={styles.aiMessageContent}>
                        {renderFormattedText(message.text)}
                      </View>
                    )}
                    <Text
                      style={[
                        styles.messageTime,
                        message.type === "user"
                          ? styles.userMessageTime
                          : styles.aiMessageTime,
                      ]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}

              {isLoading && (
                <View style={styles.aiMessageWrapper}>
                  <View style={styles.aiAvatar}>
                    <Ionicons name="sparkles" size={16} color={PRIMARY} />
                  </View>
                  <View style={styles.typingIndicator}>
                    <Animated.View
                      style={[
                        styles.typingDot,
                        {
                          opacity: dot1Anim,
                          transform: [
                            {
                              translateY: dot1Anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.typingDot,
                        {
                          opacity: dot2Anim,
                          transform: [
                            {
                              translateY: dot2Anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.typingDot,
                        {
                          opacity: dot3Anim,
                          transform: [
                            {
                              translateY: dot3Anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -8],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {messages.length === 1 && renderSuggestions()}
            </>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={
              !sessionId ? "Đang khởi tạo..." : "Nhập câu hỏi của bạn..."
            }
            placeholderTextColor={TEXT_SECONDARY}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading && !isLoadingHistory && sessionId !== null}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || !sessionId) &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading || !sessionId}
          >
            <Ionicons
              name={isLoading ? "hourglass-outline" : "send"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  userMessageWrapper: {
    justifyContent: "flex-end",
  },
  aiMessageWrapper: {
    justifyContent: "flex-start",
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${PRIMARY}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 16,
    padding: 12,
  },
  userMessageBubble: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_PRIMARY,
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#fff",
  },
  aiMessageContent: {
    gap: 4,
  },
  boldText: {
    fontWeight: "700",
    color: TEXT_PRIMARY,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    color: PRIMARY,
    fontWeight: "700",
    marginRight: 8,
    minWidth: 12,
  },
  listNumber: {
    fontSize: 15,
    lineHeight: 22,
    color: PRIMARY,
    fontWeight: "700",
    marginRight: 8,
    minWidth: 20,
  },
  listText: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  lineBreak: {
    height: 6,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  userMessageTime: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  aiMessageTime: {
    color: TEXT_SECONDARY,
  },
  typingIndicator: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignSelf: "flex-start",
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TEXT_SECONDARY,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  suggestionsGrid: {
    gap: 8,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: BACKGROUND,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT_PRIMARY,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: TEXT_SECONDARY,
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
});

export default AIChatScreen;
