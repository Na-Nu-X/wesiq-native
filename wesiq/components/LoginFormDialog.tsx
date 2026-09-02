import React, { useState, useRef, useEffect } from "react"
import { View, StyleSheet, Modal, Text, KeyboardAvoidingView, TextInput, Pressable, Animated, Easing, Platform, Keyboard, Alert } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, GREEN_COLOR, RED_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { LinearGradient } from "expo-linear-gradient"
import { FontAwesome6 } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

export interface LoggedInUser {
    id:number,
    first_name:string,
    last_name:string,
    username:string,
    role:"user"|"admin"|"developer"
    profile_picture_name:string,
    friend_code:string,
    saved_posts:number[],
    private_account:boolean,

    follow_requests:{
        from_user:{
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean
        },

        status:string,
        created_at:string
    }[],

    followers_amount:number,

    subscription:{
        is_active:boolean
    },

    data_saving_mode:boolean
}

interface LoginFormDialogProps {
    visible:boolean,
    onChangeActiveForm:() => void,
    onClose:() => void,
    onUserLogin?:(user:LoggedInUser) => void
}

export interface LoggedInUserResponse {
    success:boolean,
    logged_in_user?:LoggedInUser,
    message:string
}

interface LoginResponse {
    success:boolean, 
    access:string,
    refresh:string,
    message:string
}

export default function LoginFormDialog({ visible, onChangeActiveForm, onClose, onUserLogin }:LoginFormDialogProps) {
    const [identifier, setIdentifier] = useState<string>("") // Stores The Identifier
    const [password, setPassword] = useState<string>("") // Stores The Password
    const [is_password_hidden, setIsPasswordHidden] = useState<boolean>(true) // Stores The Information If The Password Is Hidden
    const [is_authentication_loading, setIsAuthenticationLoading] = useState<boolean>(true) // Stores The Information If The Authentication Is Loading
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const spin_animation_value:Animated.Value = useRef(new Animated.Value(0)).current // Stores The Spin Animation Value

    // Initializes The Auto User Login
    useEffect(() => {
        // Function For Initialize The Auto Login
        const initializeAutoLogin = async () => {
            try {
                const logged_in_user_data:LoggedInUser|null = await getLoggedInUser() // Gets The Logged In User

                if(logged_in_user_data) {
                    setLoggedInUser(logged_in_user_data) // Sets The Logged In User
                    if(onUserLogin) onUserLogin(logged_in_user_data) // Sends The Data To The Parent Component
                }
            } 
            
            catch {
                console.error("Chyba pri automatickom prihlásení.")
            } 
            
            finally {
                setIsAuthenticationLoading(false) // Deactivates The Loading
            }
        }

        initializeAutoLogin() // Initializes The Auto Login
    }, [])

    // Initializes The Spin Animation
    useEffect(() => {
        // Function For Start The Spin Animation
        const startSpinAnimation = () => {
            spin_animation_value.setValue(0) // Resets The Spin Animation Value
            
            Animated.timing(spin_animation_value, {
                toValue: 1,
                duration: 4000, // 4 Seconds
                easing: Easing.linear,
                useNativeDriver: true
            }).start(({ finished }) => {
                if(finished) {
                    startSpinAnimation() // Loops The Animation
                }
            })
        }
    
        startSpinAnimation() // Starts The Spin Animation
    }, [])

    // Sets The Spin Animation
    const spin_animation:Animated.AnimatedInterpolation<string|number> = spin_animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"]
    })

    // Function For Handle The Login
    const handleLogin = async ():Promise<void> => {
        Keyboard.dismiss() // Hides The Keyboard
    
        if(!identifier.trim() || !password.trim()) {
            Alert.alert("Chyba", "Vyplnte všetky potrebné údaje pre prihlásenie.") // Shows The Alert
            return
        }
    
        setIsLoading(true) // Activates The Loading
    
        try {
            // Sends The POST Request To The Server
            const login_response:Response = await fetch(`${API_URL}/login/`, {
                method: "POST",
        
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },

                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                })
            })
    
            const login_data:LoginResponse = await login_response.json() // Gets The Login Data
    
            if(login_data.success) {
                if(login_data.access) await AsyncStorage.setItem("user_token", login_data.access) // Stores The User Token
                Alert.alert("Úspech", login_data.message) // Shows The Alert
            } 
            
            else {
                Alert.alert("Chyba", login_data.message) // Shows The Alert
            }
    
        } 
        
        catch {
            Alert.alert("Chyba", "Pri prihlasovaní došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setIsLoading(false) // Deactivates The Loading
            getLoggedInUser() // Gets The Logged In User
        }
    }

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
    
        } 
        
        catch {
            return null
        }
    }

    return (
        <Modal
            className="login_form_dialog"
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                    ]}
                />

                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ width: "100%", alignItems: "center" }}
                >
                    <View className="login_form" style={styles.login_form}>
                        <View style={styles.circle_decoration_before} />
                        <View style={styles.circle_decoration_after} />

                        <View style={styles.top}>
                            <View className="back" accessibilityLabel="Zavrieť">
                                <Icon
                                    icon_name="chevron-left"
                                    onPress={onClose}
                                    size={30}
                                    pressed_style={{ transform: [{ scale: 1.1 }] }}
                                />
                            </View>

                            <Text className="heading" style={styles.heading}>Prihlásenie</Text>
                        </View>

                        <View className="identifier_container" style={styles.identifier_container}>
                            <View className="identifier_icon" style={styles.identifier_icon}>
                                <Icon icon_name="envelope" />
                            </View>

                            <TextInput
                                className="identifier"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                textAlignVertical="top" 
                                placeholder="Používateľské meno alebo e-mail" 
                                placeholderTextColor={LIGHT_BLUE_COLOR}
                                accessibilityLabel="Používateľské meno alebo e-mail" 
                                value={identifier}
                                onChangeText={setIdentifier}
                                maxLength={50}

                                style={[
                                    styles.identifier, 
                                    { outlineStyle: "none" } as any
                                ]}
                            />
                        </View>

                        <View className="password_container" style={styles.password_container}>
                            <View className="password_icon" style={styles.password_icon}>
                                <Icon icon_name="lock" />
                            </View>

                            <TextInput
                                className="password"
                                autoCapitalize="none"
                                secureTextEntry={is_password_hidden ? true : false}
                                textAlignVertical="top" 
                                placeholder="Zadajte vaše heslo" 
                                placeholderTextColor={LIGHT_BLUE_COLOR}
                                accessibilityLabel="Zadajte vaše heslo" 
                                value={password}
                                onChangeText={setPassword}
                                maxLength={50}

                                style={[
                                    styles.password, 
                                    { outlineStyle: "none" } as any
                                ]}
                            />

                            <View 
                                className="show_hide_password" 
                                accessibilityLabel={is_password_hidden ? "Zobraziť heslo" : "Skryť heslo"}
                                style={styles.show_hide_password}
                            >
                                <Icon
                                    icon_name={is_password_hidden ? "eye-slash" : "eye"}
                                    onPress={() => setIsPasswordHidden(previous => !previous)} // Toggles The Value
                                />
                            </View>
                        </View>

                        <Text className="form_report" style={styles.form_report}></Text>

                        <Pressable 
                            className="login_form_submit"
                            onPress={handleLogin}
                            disabled={is_loading}
                            accessibilityLabel="Prihlásiť sa"

                            style={[
                                styles.login_form_submit, 
                                { outlineStyle: "none" } as any
                            ]}
                        >
                            <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>Prihlásiť sa</Text>
                        </Pressable>

                        <View className="login_methods">
                            <View
                                style={{ 
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                            >
                                <View
                                    style={{ 
                                        flex: 1,
                                        height: 1,
                                        backgroundColor: LIGHT_BLUE_COLOR,
                                    }}
                                />

                                <Text style={{ color: LIGHT_BLUE_COLOR }}>alebo</Text>

                                <View
                                    style={{ 
                                        flex: 1,
                                        height: 1,
                                        backgroundColor: LIGHT_BLUE_COLOR,
                                    }}
                                />
                            </View>

                            <View style={styles.glow_container}>
                                <Animated.View
                                    style={[
                                        styles.gradient_container,
                                        { transform: [{ rotate: spin_animation }] }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={[
                                            "red",
                                            "yellow",
                                            "green",
                                            "blue",
                                            "red"
                                        ]}

                                        locations={[0, 0.25, 0.5, 0.75, 1]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>

                                <View style={styles.inner_glow_container}>
                                    <Pressable
                                        // onPress={handleGoToGoogleLogin}
                                        accessibilityRole="button"
                                        accessibilityLabel="Google"
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        {({ pressed }) => (
                                            <View style={styles.google_content}>
                                                <View className="google_icon" style={styles.google_icon}>
                                                    <FontAwesome6
                                                        name="google"
                                                        size={20}
                                                        color={LIGHT_BLUE_COLOR}
                                                    />
                                                </View>

                                                <Text
                                                    style={[
                                                        { color: LIGHT_BLUE_COLOR, fontStyle: "italic" },
                                                    ]}
                                                >
                                                    Google
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        <View className="form_questions" style={styles.form_questions}>
                            <View 
                                style={{ 
                                    flexDirection: "row",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ color: SECONDARY_COLOR }}>Zabudli ste heslo? </Text>
                                <Pressable
                                    // onPress={handleGoToPasswordReset}
                                    accessibilityRole="button"
                                    accessibilityLabel="Zmeniť heslo" 
                                >
                                    {({ pressed }) => (
                                        <Text 
                                            style={[
                                                { color: SECONDARY_COLOR, fontStyle: "italic" },
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Zmeniť heslo
                                        </Text>
                                    )}
                                </Pressable>
                            </View>

                            <View 
                                style={{ 
                                    flexDirection: "row",
                                    justifyContent: "center",
                                }}
                            >
                                <Text style={{ color: SECONDARY_COLOR }}>Ešte nemáte účet? </Text>
                                <Pressable
                                    onPress={onChangeActiveForm}
                                    accessibilityRole="button"
                                    accessibilityLabel="Vytvoriť účet" 
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                { color: SECONDARY_COLOR, fontStyle: "italic" },
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Vytvoriť účet
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },
    
    login_form: {
        position: "fixed",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" }, 
            { translateY: "-50%" }
        ],

        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        overflow: "hidden",
    },

    circle_decoration_before: {
        position: "absolute",
        top: -250,
        left: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },
    
    circle_decoration_after: {
        position: "absolute",
        bottom: -200,
        right: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginBottom: 30,
    },

    heading: {
        flex: 1,
        marginRight: 18.75 + 20,
        textAlign: "center",
        color: SECONDARY_COLOR,
        fontSize: 30,
        // animation: fadeInScale 0.3s ease-out;
    },

    identifier_container: {
        position: "relative",
        alignItems: "center",
    },

    identifier_icon: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 16,
    },

    identifier: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },
    
    password_container: {
        position: "relative",
        alignItems: "center",
    },

    password_icon: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 15,
    },

    password: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        paddingLeft: 10,
        paddingRight: 28,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // -webkit-text-security: disc;
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    show_hide_password: {
        position: "absolute",
        bottom: 10,
        right: 20,
        paddingTop: 19,
        paddingBottom: 15,
    },

    form_report: {
        alignSelf: "center",
        // font-size: 0.9em;
    },

    success: {
        color: GREEN_COLOR,
    },

    error: {
        color: RED_COLOR,
    },

    login_form_submit: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 50,
        marginTop: 40,
        marginBottom: 10,
        marginHorizontal: "auto",
        paddingHorizontal: 10,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    google_icon: {
        position: "absolute",
        top: "50%",
        left: 14,
        transform: [{ translateY: "-50%" }],
        color: LIGHT_BLUE_COLOR,
    },

    glow_container: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        width: "90%",
        height: 50,
        marginVertical: 10,
        borderRadius: BIG_BORDER_RADIUS,
        overflow: "hidden",
    },

    gradient_container: {
        position: "absolute",
        width: 600,
        height: 600,
    },

    inner_glow_container: {
        position: "absolute",
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        backgroundColor: transparentize(MAIN_COLOR, 0.1),
        borderRadius: BIG_BORDER_RADIUS,
        overflow: "hidden",
    },

    google_content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 10,
    },

    form_questions: {
        marginTop: 10,
        color: SECONDARY_COLOR,
    },
})