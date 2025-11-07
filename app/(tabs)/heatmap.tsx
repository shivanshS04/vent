import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

// Utility function to get the number of days in a month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Utility function to get the date key (YYYY-MM-DD)
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
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Function to load entries from AsyncStorage for the current month
  async function loadEntries() {
    let entries: { [date: string]: any[] } = {};
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const date = new Date(year, month, d);
      const key = `notes-${date.toISOString().slice(0, 10)}`;
      try {
        const notesRaw = await AsyncStorage.getItem(key);
        let notes: any[] = [];
        try {
          notes = notesRaw ? JSON.parse(notesRaw) : [];
          if (!Array.isArray(notes)) notes = [];
        } catch {
          notes = [];
        }
        if (notes.length) {
          entries[date.toISOString().slice(0, 10)] = notes.sort(
            (a, b) => b.timestamp - a.timestamp // Sort descending by timestamp
          );
        }
      } catch {}
    }
    setEntriesByDay(entries);

    // Update days array for the heatmap
    const daysArr = [];
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const date = new Date(year, month, d);
      daysArr.push(getDateKey(date));
    }
    setDays(daysArr);
  }

  useEffect(() => {
    loadEntries();
    // Auto-select today's date if it's in the current month/year
    const todayKey = getDateKey(new Date());
    if (
      new Date(todayKey).getMonth() === month &&
      new Date(todayKey).getFullYear() === year
    ) {
      setSelectedDate(todayKey);
    } else {
      // Clear selected date if navigating to a different month
      setSelectedDate("");
    }

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [month, year]); // Re-run effect when month or year changes

  /**
   * Deletes an entry from local state and AsyncStorage.
   * @param dateKey The date string (YYYY-MM-DD) of the entry.
   * @param entryToDelete The entry object to delete (used for matching by timestamp/uri/text).
   */
  async function handleDeleteEntry(dateKey: string, entryToDelete: any) {
    // 1. Update AsyncStorage
    const storageKey = `notes-${dateKey}`;
    try {
      const notesRaw = await AsyncStorage.getItem(storageKey);
      let notes: any[] = [];
      try {
        notes = notesRaw ? JSON.parse(notesRaw) : [];
      } catch {
        notes = [];
      }

      // Filter out the entry to delete. A combination of timestamp and type/uri/text is used for unique identification.
      const updatedNotes = notes.filter(
        (entry) =>
          !(
            entry.timestamp === entryToDelete.timestamp &&
            entry.type === entryToDelete.type &&
            (entry.uri === entryToDelete.uri ||
              entry.text === entryToDelete.text)
          )
      );

      if (updatedNotes.length > 0) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedNotes));
      } else {
        await AsyncStorage.removeItem(storageKey);
      }

      // 2. Update local state (entriesByDay)
      setEntriesByDay((prevEntries) => {
        const newEntries = { ...prevEntries };
        if (updatedNotes.length > 0) {
          newEntries[dateKey] = updatedNotes.sort(
            (a, b) => b.timestamp - a.timestamp
          );
        } else {
          delete newEntries[dateKey]; // Remove the day if no entries are left
        }
        return newEntries;
      });

      // Stop audio playback if the deleted entry was playing
      if (entryToDelete.type === "voice" && playingUri === entryToDelete.uri) {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingUri(null);
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      // Optional: Show an alert to the user
    }
  }

  async function handlePlayPause(uri: string) {
    if (playingUri === uri) {
      // Pause
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlayingUri(null);
      }
      return;
    }
    // Stop previous
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    // Play new
    const { sound } = await Audio.Sound.createAsync({ uri });
    soundRef.current = sound;
    setPlayingUri(uri);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || status.didJustFinish) {
        setPlayingUri(null);
      }
    });
    await sound.playAsync();
  }

  function handleMonthlyRecap() {
    // This is where you would implement logic for generating a monthly recap.
    // For now, it will just log a message.
    const monthName = new Date(year, month).toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    console.log(`Generating monthly recap for ${monthName}`);
    alert(`Generating monthly recap for ${monthName}. (Feature coming soon!)`);
  }

  function renderEntry({ item }: { item: any }) {
    const commonContent = (
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.entryTime}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </ThemedText>
        {item.type === "text" ? (
          <ThemedText style={styles.textEntryContent}>{item.text}</ThemedText>
        ) : (
          item.transcription && (
            <ThemedText style={styles.textEntryContent}>
              Transcribed: {item.transcription}
            </ThemedText>
          )
        )}
      </View>
    );

    const deleteButton = (
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleDeleteEntry(selectedDate, item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    );

    if (item.type === "text") {
      return (
        <View style={styles.textEntryItem}>
          <Ionicons
            name="document-text"
            size={24}
            color="#10b981"
            style={{ marginRight: 10, alignSelf: "flex-start" }}
          />
          {commonContent}
          {deleteButton}
        </View>
      );
    }
    // Voice/audio entry
    if (item.type === "voice") {
      return (
        <View style={styles.recordingItem}>
          <View style={styles.recordingInfo}>
            <Ionicons
              name="mic"
              size={24}
              color="#3b82f6"
              style={{ marginRight: 10, alignSelf: "flex-start" }}
            />
            {commonContent}
          </View>
          <View style={styles.audioControls}>
            {item.uri && (
              <TouchableOpacity
                style={styles.audioButton}
                onPress={() => handlePlayPause(item.uri)}
              >
                <Ionicons
                  name={playingUri === item.uri ? "pause" : "play"}
                  size={22}
                  color="#2563eb"
                />
              </TouchableOpacity>
            )}
            {deleteButton}
          </View>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={() => {
            if (month === 0) {
              setMonth(11);
              setYear(year - 1);
            } else {
              setMonth(month - 1);
            }
          }}
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <ThemedText style={styles.calendarHeaderText}>
          {new Date(year, month).toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            if (month === 11) {
              setMonth(0);
              setYear(year + 1);
            } else {
              setMonth(month + 1);
            }
          }}
          style={styles.monthNavButton}
        >
          <Ionicons name="chevron-forward" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.heatmapTitle}>Monthly Entries</ThemedText>

      {/* Heatmap Grid */}
      <View style={styles.heatmapGrid}>
        {days.map((date) => (
          <TouchableOpacity
            key={date}
            style={[
              styles.dayBox,
              {
                // Heatmap logic: #93c5fd is light blue, #3b82f6 is medium blue for more entries
                backgroundColor:
                  entriesByDay[date]?.length > 2
                    ? "#3b82f6" // Darker for more than 2 entries
                    : entriesByDay[date]?.length > 0
                    ? "#93c5fd" // Lighter for 1 or 2 entries
                    : "#e5e7eb", // No entries
                borderWidth: selectedDate === date ? 3 : 0,
                borderColor: selectedDate === date ? "#ef4444" : "transparent", // Highlight selected date in red
              },
            ]}
            onPress={() => setSelectedDate(date)}
            activeOpacity={0.8}
          >
            <ThemedText
              style={[
                styles.dayText,
                (entriesByDay[date]?.length || 0) > 2 && { color: "#fff" }, // White text on dark blue
                selectedDate === date && { color: "#ef4444" }, // Red text on selected date
              ]}
            >
              {new Date(date).getDate()}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected Day's Entries List */}
      {selectedDate && (
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.listHeader}>
            Entries for {new Date(selectedDate).toLocaleDateString()}
          </ThemedText>
          <FlatList
            data={entriesByDay[selectedDate] || []}
            keyExtractor={(item, index) =>
              String(item.timestamp) + (item.type || "") + index
            }
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
        </View>
      )}

      {/* Get Monthly Recap Button */}
      <TouchableOpacity style={styles.recapButton} onPress={handleMonthlyRecap}>
        <Ionicons
          name="calendar"
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <ThemedText style={styles.recapButtonText}>
          Get Monthly Recap
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 0,
    paddingTop: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  calendarHeaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563eb",
    marginHorizontal: 16,
  },
  monthNavButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#e0e7ff",
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
  listHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  entriesList: {
    flex: 1, // Ensure FlatList takes up available space
    paddingHorizontal: 8,
  },
  // Voice Entry Styles
  recordingItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  entryTime: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  audioButton: {
    backgroundColor: "#e0e7ff",
    borderRadius: 16,
    padding: 7,
  },
  // Text Entry Styles
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
  textEntryContent: {
    fontSize: 15,
    color: "#222",
  },
  // New Styles
  removeButton: {
    marginLeft: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  recapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recapButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});
