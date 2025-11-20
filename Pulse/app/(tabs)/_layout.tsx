import { Tabs } from "expo-router";

export default function Tablayout() {
    return (
        <Tabs>
            <Tabs.Screen name="screens/landing" options={{ title: 'Home' }} />
            <Tabs.Screen name="screens/reminders" options={{ title: 'Reminders' }} />
        </Tabs>
    );
}