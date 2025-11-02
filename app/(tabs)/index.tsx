import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as LegacyFileSystem from "expo-file-system/legacy";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Use a fallback directory string for local storage
const RECORDING_DIR = "file:///data/user/0/host.exp.exponent/files/";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    loadRecordings();
    return () => {
      if (recording) {
        recording.getStatusAsync().then((status) => {
          if (status.isRecording) {
            recording.stopAndUnloadAsync();
          }
        });
      }
    };
  }, [recording]);

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

  async function stopRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        const fileName = `recording-${Date.now()}.caf`;
        const newPath = RECORDING_DIR + fileName;
        await LegacyFileSystem.moveAsync({ from: uri, to: newPath });
        await saveRecordingMeta(newPath);
        loadRecordings();
      }
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error("Failed to stop recording", err);
      setRecording(null);
      setIsRecording(false);
    }
  }

  async function saveRecordingMeta(path: string) {
    // Optionally save metadata for recordings
  }

  async function loadRecordings() {
    try {
      const files = await LegacyFileSystem.readDirectoryAsync(RECORDING_DIR);
      const entries = files
        .filter(
          (f: string) =>
            f.startsWith("recording-") || f.startsWith("textentry-")
        )
        .map((f: string) => {
          const match = f.match(/^(recording|textentry)-(\d+)\.(caf|txt)$/);
          return match
            ? {
                uri: RECORDING_DIR + f,
                name: f,
                type: match[1],
                timestamp: Number(match[2]),
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => b!.timestamp - a!.timestamp);
      setRecordings(entries);
    } catch {
      setRecordings([]);
    }
  }

  async function saveTextEntry() {
    try {
      if (!text.trim()) return;
      const fileName = `textentry-${Date.now()}.txt`;
      const filePath = RECORDING_DIR + fileName;
      await LegacyFileSystem.writeAsStringAsync(filePath, text.trim());
      setText("");
      loadRecordings();
    } catch (err) {
      console.error("Failed to save text entry", err);
    }
  }

  function renderRecording({ item }: { item: any }) {
    if (item.type === "textentry") {
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
            <TextEntryContent uri={item.uri} />
          </View>
        </View>
      );
    }
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
        <AudioPlayer uri={item.uri} />
      </View>
    );
  }

  return (
    <ThemedView style={styles.contentContainer}>
      <View style={styles.voiceInputContainer}>
        <TouchableOpacity
          style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={36}
            color="#fff"
          />
          <ThemedText style={styles.voiceLabel}>
            {isRecording ? "Stop & Save" : "Tap to Record"}
          </ThemedText>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Type your thoughts..."
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={setText}
      />
      <TouchableOpacity style={styles.submitButton} onPress={saveTextEntry}>
        <ThemedText style={styles.submitButtonText}>Save Text Entry</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.sectionTitle}>Today&apos;s Entries</ThemedText>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.name}
        renderItem={renderRecording}
        style={styles.recordingsList}
        ListEmptyComponent={
          <ThemedText style={{ textAlign: "center", color: "#888" }}>
            No entries yet today.
          </ThemedText>
        }
      />
    </ThemedView>
  );
}

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function playSound() {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) setIsPlaying(false);
      });
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying) setIsPlaying(false);
      });
    }
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  }

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={styles.audioControls}>
      <TouchableOpacity
        onPress={isPlaying ? stopSound : playSound}
        style={styles.audioButton}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={24}
          color="#3b82f6"
        />
      </TouchableOpacity>
    </View>
  );
}

function TextEntryContent({ uri }: { uri: string }) {
  const [content, setContent] = useState("");
  useEffect(() => {
    LegacyFileSystem.readAsStringAsync(uri)
      .then(setContent)
      .catch(() => setContent("[Error loading text]"));
  }, [uri]);
  return <ThemedText style={styles.textEntryContent}>{content}</ThemedText>;
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
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  voiceButtonActive: {
    backgroundColor: "#ef4444",
  },
  voiceLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 16,
  },
  input: {
    minHeight: 100,
    borderRadius: 16,
    padding: 18,
    fontSize: 17,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 18,
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
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
});
