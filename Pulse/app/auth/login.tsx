import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';


export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = () => {
        console.log('Login:', { username, password });
        // Add your login logic here
        router.push('/(tabs)/landing'); //navigate to landing page after login
    };

    const handleNavigateToSignUp = () => {
        // Navigate to SignUp page
        router.push('/auth/signup');
        console.log('Navigate to Sign Up');
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            padding: 20
        }}>
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
                    Login to Pulse!
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
                        placeholder="Enter your username"
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

                <View style={{ marginBottom: 24 }}>
                    <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        marginBottom: 8,
                        color: '#555'
                    }}>
                        Password
                    </Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        secureTextEntry={!showPassword}
                        style={{
                            borderWidth: 1,
                            borderColor: '#ddd',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 16,
                            backgroundColor: '#fafafa'
                        }}
                    /><TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: 12,
                            top: 41
                        }}
                    >
                        {showPassword ?
                            <EyeOff size={20} color="#666" /> :
                            <Eye size={20} color="#666" />
                        }
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleLogin}
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
                        Login
                    </Text>
                </TouchableOpacity>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                        No account?
                    </Text>
                    <TouchableOpacity onPress={handleNavigateToSignUp}>
                        <Text style={{
                            color: '#6366f1',
                            fontSize: 14,
                            fontWeight: '600',
                            marginLeft: 4
                        }}>
                            Sign up
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export { Login };