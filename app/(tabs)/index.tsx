// DO NOT import FormData! Use the global FormData provided by React Native/Expo.

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TODAY_KEY = `notes-${new Date().toISOString().slice(0, 10)}`;
const BASE_URL = "http://localhost:3000"; // or your cloudflare tunnel URL

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getTodayStart = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  };

  // Load all entries (text and transcribed) for today
  const loadEntries = useCallback(async () => {
    let notesRaw = await AsyncStorage.getItem(TODAY_KEY);
    let notes: any[] = [];
    try {
      notes = notesRaw ? JSON.parse(notesRaw) : [];
      if (!Array.isArray(notes)) notes = [];
    } catch {
      notes = [];
    }
    // Sort by timestamp descending
    notes = notes
      .filter((n) => n.timestamp >= getTodayStart())
      .sort((a, b) => b.timestamp - a.timestamp);
    setRecordings(notes);
  }, []);

  useEffect(() => {
    loadEntries();
    return () => {
      if (recording) {
        recording.getStatusAsync().then((status) => {
          if (status.isRecording) {
            recording.stopAndUnloadAsync();
          }
        });
      }
    };
  }, [recording, loadEntries]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }

  // Assuming you have access to:
  // - recording, setRecording, setIsRecording, loadEntries (from state/props)
  // - AsyncStorage (imported)
  // - getDateKey (utility function for YYYY-MM-DD)

  async function stopRecording() {
    if (!recording) return;

    // --- Define TODAY_KEY based on the date utility ---
    const TODAY_KEY = `notes-${new Date().toISOString().slice(0, 10)}`;

    // Set audio mode back to normal
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    });

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Safety check: ensure a URI was created
      if (!uri) {
        throw new Error("Recording URI could not be retrieved.");
      }

      let transcription = "";

      // --- Transcription API Call ---
      try {
        const formData = new FormData();

        // IMPORTANT: Use the M4A type, which is the default for high quality Expo recordings
        formData.append("audio", {
          uri,
          name: `recording-${Date.now()}.m4a`, // Changed to .m4a
          type: "audio/m4a", // Changed to audio/m4a or audio/mp4
        } as any);

        const response = await fetch(
          `https://drive-panels-align-permits.trycloudflare.com/transcribe`,
          {
            method: "POST",
            body: formData,
            // Note: RN/Expo handles the 'Content-Type': 'multipart/form-data' header
            // when you pass a FormData object, so no need to explicitly set it.
          }
        );

        if (response.ok) {
          const data = await response.json();
          transcription = data.text || "";
        } else {
          console.error(
            "API response not OK:",
            response.status,
            await response.text()
          );
          transcription = "Transcription failed: Server error.";
        }
      } catch (apiError) {
        console.error("API Fetch Error:", apiError);
        transcription = "Transcription failed: Network/Processing error.";
      }

      // --- Save entry in AsyncStorage ---
      let notesRaw = await AsyncStorage.getItem(TODAY_KEY);
      let notes: any[] = [];
      try {
        notes = notesRaw ? JSON.parse(notesRaw) : [];
        if (!Array.isArray(notes)) notes = [];
      } catch {
        notes = [];
      }

      notes.push({
        type: "voice",
        uri,
        transcription, // Save the transcription result (even if it's the error message)
        timestamp: Date.now(),
      });

      await AsyncStorage.setItem(TODAY_KEY, JSON.stringify(notes));

      // Reload entries in your HeatmapScreen to update the list
      loadEntries();
    } catch (err) {
      console.error("Failed to stop or save recording", err);
    } finally {
      // Ensure state is always reset, regardless of success or failure
      setRecording(null);
      setIsRecording(false);
    }
  }

  async function saveTextEntry() {
    try {
      if (!text.trim()) return;
      let notesRaw = await AsyncStorage.getItem(TODAY_KEY);
      let notes: any[] = [];
      try {
        notes = notesRaw ? JSON.parse(notesRaw) : [];
        if (!Array.isArray(notes)) notes = [];
      } catch {
        notes = [];
      }
      notes.push({
        type: "text",
        text: text.trim(),
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(TODAY_KEY, JSON.stringify(notes));
      setText("");
      loadEntries();
    } catch (err) {
      console.error("Failed to save text entry", err);
    }
  }

  async function submitNotes() {
    try {
      setLoading(true);
      setAnalysis(null);
      let notesRaw = await AsyncStorage.getItem(TODAY_KEY);
      let notes: any[] = [];
      try {
        notes = notesRaw ? JSON.parse(notesRaw) : [];
        if (!Array.isArray(notes)) notes = [];
      } catch {
        notes = [];
      }
      // Combine all text and transcribed entries
      const entries = notes
        .filter((n) => n.timestamp >= getTodayStart())
        .map((n) => (n.type === "text" ? n.text : n.transcription))
        .filter(Boolean);
      if (!entries.length) {
        setAnalysis({ error: "No entries for today." });
        setLoading(false);
        return;
      }
      const response = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!response.ok) {
        setAnalysis({ error: "Server error: " + response.status });
        setLoading(false);
        return;
      }
      const data = await response.json();
      setAnalysis(data);
      setLoading(false);
    } catch (err: any) {
      setAnalysis({ error: "Failed to analyze entries. " + err?.message });
      setLoading(false);
    }
  }

  async function removeEntry(item: any) {
    let notesRaw = await AsyncStorage.getItem(TODAY_KEY);
    let notes: any[] = [];
    try {
      notes = notesRaw ? JSON.parse(notesRaw) : [];
      if (!Array.isArray(notes)) notes = [];
    } catch {
      notes = [];
    }
    notes = notes.filter((n: any) => n.timestamp !== item.timestamp);
    await AsyncStorage.setItem(TODAY_KEY, JSON.stringify(notes));
    loadEntries();
  }

  function renderRecording({ item }: { item: any }) {
    if (item.type === "text") {
      return (
        <View style={styles.textEntryItem}>
          <Ionicons
            name="document-text"
            size={20}
            color="#10b981"
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.textEntryName}>
              {new Date(item.timestamp).toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.textEntryContent}>{item.text}</ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => removeEntry(item)}
            style={styles.removeButton}
          >
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      );
    }
    // Voice transcription
    return (
      <View style={styles.recordingItem}>
        <View style={styles.recordingInfo}>
          <Ionicons
            name="mic"
            size={20}
            color="#3b82f6"
            style={{ marginRight: 8 }}
          />
          <ThemedText style={styles.recordingName}>
            {new Date(item.timestamp).toLocaleString()}
          </ThemedText>
        </View>
        <ThemedText style={styles.textEntryContent}>
          {item.transcription}
        </ThemedText>
        <TouchableOpacity
          onPress={() => removeEntry(item)}
          style={styles.removeButton}
        >
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.contentContainer}>
      <View style={styles.voiceInputContainer}>
        <TouchableOpacity
          style={styles.recordButtonWrapper}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={32}
              color="#fff"
            />
          </View>
          <ThemedText style={styles.recordButtonLabel}>
            {isRecording ? "Stop & Save" : "Tap to Record"}
          </ThemedText>
        </TouchableOpacity>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your thoughts..."
          placeholderTextColor="#888"
          multiline
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
        />
      </View>
      <TouchableOpacity style={styles.blackButton} onPress={saveTextEntry}>
        <ThemedText style={styles.blackButtonText}>Save Text Entry</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.blackButton, { marginBottom: 12 }]}
        onPress={submitNotes}
      >
        <ThemedText style={styles.blackButtonText}>Submit & Analyze</ThemedText>
      </TouchableOpacity>
      {loading && (
        <ThemedText
          style={{ color: "#222", textAlign: "center", marginVertical: 8 }}
        >
          Analyzing...
        </ThemedText>
      )}
      <ThemedText style={styles.sectionTitle}>Today&apos;s Entries</ThemedText>
      <FlatList
        data={recordings}
        keyExtractor={(item) => String(item.timestamp) + (item.type || "")}
        renderItem={renderRecording}
        style={styles.recordingsList}
        ListEmptyComponent={
          <ThemedText style={{ textAlign: "center", color: "#888" }}>
            No entries yet today.
          </ThemedText>
        }
      />
      {analysis && (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginVertical: 16,
          }}
        >
          {analysis.error ? (
            <ThemedText style={{ color: "red" }}>{analysis.error}</ThemedText>
          ) : (
            <>
              <ThemedText style={{ fontWeight: "bold", fontSize: 18 }}>
                Analysis
              </ThemedText>
              <ThemedText style={{ marginTop: 8 }}>
                {analysis.analysis}
              </ThemedText>
              <ThemedText
                style={{
                  marginTop: 8,
                  color: analysis.nature === "negative" ? "red" : "green",
                }}
              >
                Nature: {analysis.nature}
              </ThemedText>
              <ThemedText style={{ marginTop: 8, color: "#888" }}>
                {new Date(analysis.timestamp).toLocaleString()}
              </ThemedText>
              {analysis.transcription && (
                <ThemedText style={{ marginTop: 8, color: "#555" }}>
                  What you said: {analysis.transcription}
                </ThemedText>
              )}
            </>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    backgroundColor: "#f3f4f6",
  },
  voiceInputContainer: {
    alignItems: "center",
    marginBottom: 24,
    padding: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    shadowColor: "transparent",
    elevation: 0,
  },
  recordButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  recordButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 6,
    borderWidth: 3,
    borderColor: "#222",
    transitionDuration: "200ms",
  },
  recordButtonActive: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  recordButtonLabel: {
    color: "#222",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    minHeight: 90,
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    backgroundColor: "#f7f7f7",
    color: "#222",
    borderWidth: 1.5,
    borderColor: "#222",
    marginBottom: 0,
    fontWeight: "500",
  },
  blackButton: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  blackButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#222",
    textAlign: "center",
  },
  recordingsList: {
    marginBottom: 24,
  },
  recordingItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recordingName: {
    fontSize: 17,
    color: "#333",
    flex: 1,
    marginRight: 10,
    fontWeight: "500",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  audioButton: {
    backgroundColor: "#e0e7ff",
    borderRadius: 20,
    padding: 10,
  },
  textEntryItem: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  textEntryName: {
    fontSize: 15,
    color: "#065f46",
    fontWeight: "600",
    marginBottom: 4,
  },
  textEntryContent: {
    fontSize: 16,
    color: "#222",
  },
  removeButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
});
