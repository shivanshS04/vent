import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as LegacyFileSystem from "expo-file-system/legacy";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

const RECORDING_DIR = "file:///data/user/0/host.exp.exponent/files/";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function HeatmapScreen() {
  const [entriesByDay, setEntriesByDay] = useState<{ [date: string]: any[] }>(
    {}
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [days, setDays] = useState<string[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadEntries();
    const daysArr = [];
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const date = new Date(year, month, d);
      daysArr.push(getDateKey(date));
    }
    setDays(daysArr);
    // Auto-select today's date
    const todayKey = getDateKey(new Date());
    setSelectedDate(todayKey);
  }, [month, year]);

  async function loadEntries() {
    const files = await LegacyFileSystem.readDirectoryAsync(RECORDING_DIR);
    const entries: { [date: string]: any[] } = {};
    files.forEach((f: string) => {
      const match = f.match(/^(recording|textentry)-(\d+)\.(caf|txt)$/);
      if (match) {
        const timestamp = Number(match[2]);
        const date = new Date(timestamp);
        const key = getDateKey(date);
        if (!entries[key]) entries[key] = [];
        entries[key].push({
          uri: RECORDING_DIR + f,
          name: f,
          type: match[1],
          timestamp,
        });
      }
    });
    setEntriesByDay(entries);
  }

  function getIntensity(count: number, max: number) {
    if (max === 0) return "#e5e7eb";
    const intensity = Math.min(1, count / max);
    // interpolate from light blue to deep blue
    const color = `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
    return color;
  }

  const maxEntries = Math.max(...days.map((d) => entriesByDay[d]?.length || 0));

  function renderDayBox(date: string) {
    const count = entriesByDay[date]?.length || 0;
    return (
      <TouchableOpacity
        key={date}
        style={[
          styles.dayBox,
          {
            backgroundColor: getIntensity(count, maxEntries),
            borderWidth: selectedDate === date ? 3 : 0,
            borderColor: selectedDate === date ? "#2563eb" : "transparent",
          },
        ]}
        onPress={() => setSelectedDate(date)}
        activeOpacity={0.8}
      >
        <ThemedText
          style={[
            styles.dayText,
            selectedDate === date && { color: "#2563eb" },
          ]}
        >
          {new Date(date).getDate()}
        </ThemedText>
      </TouchableOpacity>
    );
  }

  function renderEntry({ item }: { item: any }) {
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
    <View style={styles.container}>
      <ThemedText style={styles.heatmapTitle}>Monthly Entries</ThemedText>
      <View style={styles.heatmapGrid}>{days.map(renderDayBox)}</View>
      {selectedDate && (
        <>
          <FlatList
            data={entriesByDay[selectedDate] || []}
            keyExtractor={(item) => item.name}
            renderItem={renderEntry}
            style={styles.entriesList}
            ListEmptyComponent={
              <ThemedText
                style={{ textAlign: "center", color: "#888", marginTop: 12 }}
              >
                No entries for this day.
              </ThemedText>
            }
          />
        </>
      )}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 0,
    paddingTop: 8,
  },
  heatmapTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    color: "#222",
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  dayBox: {
    width: 44,
    height: 44,
    margin: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
  },
  dayText: {
    fontSize: 20,
    color: "#222",
    fontWeight: "600",
  },
  entriesList: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  recordingItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recordingName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    marginRight: 8,
    fontWeight: "500",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  audioButton: {
    backgroundColor: "#e0e7ff",
    borderRadius: 16,
    padding: 7,
  },
  textEntryItem: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },
  textEntryName: {
    fontSize: 16,
    color: "#065f46",
    fontWeight: "600",
    marginBottom: 4,
  },
  textEntryContent: {
    fontSize: 17,
    color: "#222",
  },
});
