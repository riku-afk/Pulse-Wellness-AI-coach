// This is where we place the landing page
//import the CardStreak here to display the user's streaks and progress
import React from 'react';
import { View, Text } from 'react-native';
import { CardStreak } from '../components/CardStreak';

export default function Landing() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Welcome to Pulse! User123</Text>
            <CardStreak title="Daily Meditation" streakCount={5} />
        </View>
    );
}

export { Landing };