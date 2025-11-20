// this is where we place the reminders or tasks that needs to be done --This is recommended by gemini AI coach for wellness

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../components/InfoCard';
import { AlignJustify } from 'lucide-react-native';

export default function Reminders() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Here are your daily reminders!</Text>
            <InfoCard />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
    }
});
export { Reminders };