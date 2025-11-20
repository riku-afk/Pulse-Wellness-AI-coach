import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, PanResponder } from 'react-native';

export default function InfoCard() {

    const [currentPage, setCurrentPage] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const itemsPerPage = 5;

    const slideAnim = useRef(new Animated.Value(0)).current;

    const infoData = [
        {
            id: 1,
            title: 'Hydration Reminder',
            info: 'Remember to drink at least 8 glasses of water today for optimal health.',
        },
        {
            id: 2,
            title: 'Take a Break',
            info: 'Step away from your screen for 5-10 minutes. Stretch, walk around, and rest your eyes.',
        },
        {
            id: 3,
            title: 'Practice Deep Breathing',
            info: 'Take 5 deep breaths: inhale for 4 counts, hold for 4, exhale for 4. This helps reduce stress and anxiety.',
        },
        {
            id: 4,
            title: 'Posture Check',
            info: 'Sit up straight with your shoulders back and feet flat on the floor. Good posture reduces back and neck pain.',
        },
        {
            id: 5,
            title: 'Mindful Eating',
            info: 'Eat slowly and without distractions. Pay attention to your food\'s taste, texture, and how it makes you feel.',
        },
        {
            id: 6,
            title: 'Move Your Body',
            info: 'Aim for at least 30 minutes of physical activity today. Even a short walk counts!',
        },
        {
            id: 7,
            title: 'Sleep Schedule',
            info: 'Try to get 7-9 hours of sleep tonight. Go to bed and wake up at consistent times.',
        },
        {
            id: 8,
            title: 'Gratitude Practice',
            info: 'Write down three things you\'re grateful for today. This simple practice can boost your mood.',
        },
        {
            id: 9,
            title: 'Social Connection',
            info: 'Reach out to a friend or loved one. Even a quick message can strengthen relationships and improve wellbeing.',
        },
        {
            id: 10,
            title: 'Limit Screen Time',
            info: 'Take a break from screens at least 1 hour before bed to improve sleep quality.',
        },
        {
            id: 11,
            title: 'Healthy Snack',
            info: 'Choose nutritious snacks like fruits, nuts, or vegetables instead of processed foods.',
        },
        {
            id: 12,
            title: 'Self-Compassion',
            info: 'Be kind to yourself. Treat yourself with the same compassion you\'d offer a good friend.',
        },
    ];

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (!isExpanded && gestureState.dy < 0) {
                    slideAnim.setValue(gestureState.dy);
                } else if (isExpanded && gestureState.dy > 0) {
                    slideAnim.setValue(-400 + gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (!isExpanded && gestureState.dy < -50) {
                    expandCard();
                } else if (isExpanded && gestureState.dy > 50) {
                    collapseCard();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: isExpanded ? -400 : 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const expandCard = () => {
        setIsExpanded(true);
        Animated.spring(slideAnim, {
            toValue: -400,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    };

    const collapseCard = () => {
        setIsExpanded(false);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
        }).start();
    };

    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = infoData.slice(startIndex, endIndex);
    const totalPages = Math.ceil(infoData.length / itemsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }]
                }
            ]}
        >
            <View {...panResponder.panHandlers} style={styles.handle}>
                <View style={styles.handleBar} />
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {currentItems.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.info}>{item.info}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.pagination}>
                <TouchableOpacity
                    onPress={handlePrevPage}
                    disabled={currentPage === 0}
                    style={[styles.button, currentPage === 0 && styles.buttonDisabled]}
                >
                    <Text style={styles.buttonText}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                    Page {currentPage + 1} of {totalPages}
                </Text>

                <TouchableOpacity
                    onPress={handleNextPage}
                    disabled={currentPage === totalPages - 1}
                    style={[styles.button, currentPage === totalPages - 1 && styles.buttonDisabled]}
                >
                    <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: -400,
        left: 0,
        right: 0,
        height: 450,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    handle: {
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
    },
    scrollContainer: {
        flex: 1,
        paddingHorizontal: 12,
    },
    card: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        color: '#333',
    },
    info: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    pageInfo: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
});

export { InfoCard };