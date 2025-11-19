import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { router } from 'expo-router';


export default function SignUp() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const handleSignUp = () => {
        if (!termsAccepted) {
            alert('Please accept the Terms and Conditions');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        console.log('Sign up:', { username, email, password });

        // Navigate back to Login page
        router.push('/auth/login');
        console.log('Navigate to Login');
    };

    const handleNavigateToLogin = () => {
        // Navigate to Login page
        router.push('/auth/login');
        console.log('Navigate to Login');
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            padding: 20
        }}>
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%'
                }}
            >
                <View style={{
                    width: '100%',
                    maxWidth: 400,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 32,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5
                }}>
                    <Text style={{
                        fontSize: 28,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        marginBottom: 32,
                        color: '#333'
                    }}>
                        Sign Up for Pulse!
                    </Text>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            marginBottom: 8,
                            color: '#555'
                        }}>
                            Username
                        </Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Choose a username"
                            style={{
                                borderWidth: 1,
                                borderColor: '#ddd',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 16,
                                backgroundColor: '#fafafa'
                            }}
                        />
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            marginBottom: 8,
                            color: '#555'
                        }}>
                            Email
                        </Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{
                                borderWidth: 1,
                                borderColor: '#ddd',
                                borderRadius: 8,
                                padding: 12,
                                fontSize: 16,
                                backgroundColor: '#fafafa'
                            }}
                        />
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            marginBottom: 8,
                            color: '#555'
                        }}>
                            Password
                        </Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Create a password"
                                secureTextEntry={!showPassword}
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    borderRadius: 8,
                                    padding: 12,
                                    paddingRight: 45,
                                    fontSize: 16,
                                    backgroundColor: '#fafafa'
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: 12
                                }}
                            >
                                {showPassword ?
                                    <EyeOff size={20} color="#666" /> :
                                    <Eye size={20} color="#666" />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginBottom: 24 }}>
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '600',
                            marginBottom: 8,
                            color: '#555'
                        }}>
                            Confirm Password
                        </Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm your password"
                                secureTextEntry={!showConfirmPassword}
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#ddd',
                                    borderRadius: 8,
                                    padding: 12,
                                    paddingRight: 45,
                                    fontSize: 16,
                                    backgroundColor: '#fafafa'
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: 12
                                }}
                            >
                                {showConfirmPassword ?
                                    <EyeOff size={20} color="#666" /> :
                                    <Eye size={20} color="#666" />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 24
                    }}>
                        <TouchableOpacity
                            onPress={() => setTermsAccepted(!termsAccepted)}
                            style={{
                                width: 20,
                                height: 20,
                                borderWidth: 2,
                                borderColor: '#6366f1',
                                borderRadius: 4,
                                marginRight: 10,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: termsAccepted ? '#6366f1' : 'white'
                            }}
                        >
                            {termsAccepted && (
                                <Text style={{
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}>
                                    ✓
                                </Text>
                            )}
                        </TouchableOpacity>
                        <Text style={{ color: '#666', fontSize: 14 }}>
                            I agree to the
                        </Text>
                        <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                            <Text style={{
                                color: '#6366f1',
                                fontSize: 14,
                                fontWeight: '600',
                                marginLeft: 4
                            }}>
                                Terms and Conditions
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={handleSignUp}
                        style={{
                            backgroundColor: '#6366f1',
                            borderRadius: 8,
                            padding: 14,
                            alignItems: 'center',
                            marginBottom: 20
                        }}
                    >
                        <Text style={{
                            color: 'white',
                            fontSize: 16,
                            fontWeight: '600'
                        }}>
                            Sign Up
                        </Text>
                    </TouchableOpacity>

                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Text style={{ color: '#666', fontSize: 14 }}>
                            Already have an account?
                        </Text>
                        <TouchableOpacity onPress={handleNavigateToLogin}>
                            <Text style={{
                                color: '#6366f1',
                                fontSize: 14,
                                fontWeight: '600',
                                marginLeft: 4
                            }}>
                                Login
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showTermsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 12,
                        padding: 24,
                        width: '100%',
                        maxWidth: 500,
                        maxHeight: '80%'
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20
                        }}>
                            <Text style={{
                                fontSize: 22,
                                fontWeight: 'bold',
                                color: '#333'
                            }}>
                                Terms and Conditions
                            </Text>
                            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginBottom: 20 }}>
                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555',
                                marginBottom: 16
                            }}>
                                Welcome to Pulse! By creating an account, you agree to the following terms and conditions:
                            </Text>

                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#333',
                                marginBottom: 8
                            }}>
                                1. Account Usage
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555',
                                marginBottom: 16
                            }}>
                                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                            </Text>

                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#333',
                                marginBottom: 8
                            }}>
                                2. User Conduct
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555',
                                marginBottom: 16
                            }}>
                                You agree to use Pulse in accordance with all applicable laws and regulations. You will not use the service for any unlawful or harmful purposes.
                            </Text>

                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#333',
                                marginBottom: 8
                            }}>
                                3. Privacy
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555',
                                marginBottom: 16
                            }}>
                                We respect your privacy and are committed to protecting your personal information. Please review our Privacy Policy for details on how we collect and use your data.
                            </Text>

                            <Text style={{
                                fontSize: 16,
                                fontWeight: '600',
                                color: '#333',
                                marginBottom: 8
                            }}>
                                4. Termination
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555',
                                marginBottom: 16
                            }}>
                                We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our discretion.
                            </Text>

                            <Text style={{
                                fontSize: 14,
                                lineHeight: 22,
                                color: '#555'
                            }}>
                                By clicking "Sign Up", you acknowledge that you have read and agree to these Terms and Conditions.
                            </Text>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowTermsModal(false)}
                            style={{
                                backgroundColor: '#6366f1',
                                borderRadius: 8,
                                padding: 14,
                                alignItems: 'center'
                            }}
                        >
                            <Text style={{
                                color: 'white',
                                fontSize: 16,
                                fontWeight: '600'
                            }}>
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export { SignUp };