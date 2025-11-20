//Card component for streaks and progress display
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CardStreak({ title, streakCount }: { title: string; streakCount: number }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.streak}>{streakCount} days</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    streak: {
        fontSize: 16,
        color: '#666',
    },
});

export { CardStreak };