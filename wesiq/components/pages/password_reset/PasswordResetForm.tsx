import { View, Text, Animated, StyleSheet, Easing, Platform, TextInput, Pressable, Keyboard, Alert, TextInputKeyPressEvent } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import Svg, { Circle } from "react-native-svg"
import { RefObject, useEffect, useRef, useState } from "react"
import { getFormattedTime } from "@/utils/time"
import Back from "@/components/Back"
import Icon from "@/components/Icon"
import { useTranslation } from "react-i18next"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { generateKey } from "@/utils/generateKey"
import { API_URL } from "@/constants/general"
import { ImperativeRouter, useRouter } from "expo-router"
import { MAIN_WIDTH } from "@/constants/dimensions"
import AsyncStorage from "@react-native-async-storage/async-storage"

import type { BasicResponse } from "../community/Feed"

interface PasswordResetFormProps {
    time:number, // Time In Seconds
    max_remaining_time:number,
    onShowLoginForm:() => void
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle) // Creates The Animated Circle

export default function PasswordResetForm({ time, max_remaining_time, onShowLoginForm }:PasswordResetFormProps) {
    const { t } = useTranslation() // Initializes The Translations

    const router:ImperativeRouter = useRouter() // Gets The Router

    const [password_reset_code, setPasswordResetCode] = useState<string[]>(['', '', '', '', '', '']) // Stores The Password Reset Code

    const [new_password, setNewPassword] = useState<string>("") // Stores The New Password
    const [is_password_hidden, setIsPasswordHidden] = useState<boolean>(true) // Stores The Information If The Password Is Hidden
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active

    const [remaining_time, setRemainingTime] = useState<number>(time) // Stores The Remaining Time

    const animated_time = useRef(new Animated.Value(time)).current // Animates The Time
    const last_time = useRef<number>(time) // Stores The Last Time

    const RADIUS:number = 40 // Defines The Radius
    const CIRCUMFERENCE:number = 2 * Math.PI * RADIUS // Defines The Circumference

    // Initializes The Timer
    useEffect(() => {
        const listener_id:string = animated_time.addListener(({ value }) => {
            const current_second:number = Math.ceil(value) // Gets The Current Second
            
            if(current_second !== last_time.current) {
                last_time.current = current_second // Sets The Last Time
                setRemainingTime(Math.max(0, current_second)) // Sets The Remaining Time
            }
        })

        startAnimation(time) // Starts The Animation

        return () => {
            animated_time.removeListener(listener_id)
            animated_time.stopAnimation()
        }
    }, [])

    // Function For Start The Animation
    const startAnimation = (duration:number):void => {
        Animated.timing(animated_time, {
            toValue: 0,
            duration: duration * 1000, 
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(({ finished }) => {

            if(finished) {
                // skipBreak() // Skips The Break If The Countdown Has Passed
            }
        })
    }

    // Gets The Stroke Dashoffset
    const stroke_dashoffset = animated_time.interpolate({
        inputRange: [0, max_remaining_time],
        outputRange: [CIRCUMFERENCE, 0], 
    })

    // Gets The Stroke Color
    const stroke_color = animated_time.interpolate({
        inputRange: [0, max_remaining_time],
        outputRange: ["rgb(255, 207, 32)", "rgb(82, 207, 32)"]
    })

    const minutes:number = Math.floor(remaining_time / 60) // Gets The Minutes
    const seconds:number = remaining_time % 60 // Gets The Seconds

    const break_timer_text_color:string = remaining_time <= 10 ? "#df3535" : SECONDARY_COLOR // Gets The Break Timer Text Color

    const otp_inputs:RefObject<TextInput[]> = useRef<TextInput[]>([]) // Stores The OTP Inputs References

    // Function For Handle The OTP Input Change
    const handleOtpInputChange = (text:string, index:number):void => {
        const numeric_text:string = text.replace(/[^0-9]/g, "") // Gets The Numeric Text

        // Handles The Paste
        if(numeric_text.length > 1) {
            const pasted_password_reset_code:string[] = numeric_text.slice(0, 6).split("") // Gets The Pasted Password Reset Code
            const new_password_reset_code:string[] = [...password_reset_code] // Gets The Password Reset Code
            
            pasted_password_reset_code.forEach((one_character:string, index_2:number) => {
                if(index + index_2 < 6) new_password_reset_code[index + index_2] = one_character // Adds The Character
            })

            setPasswordResetCode(new_password_reset_code) // Sets The Password Reset Code

            const next_index:number = Math.min(index + pasted_password_reset_code.length, 5) // Gets The Next Index

            otp_inputs.current[next_index].focus() // Adds Focus To The Next Input
            return
        }

        const new_password_reset_code:string[] = [...password_reset_code] // Gets The Password Reset Code

        new_password_reset_code[index] = numeric_text // Adds The Character
        setPasswordResetCode(new_password_reset_code) // Sets The Password Reset Code
        if(numeric_text && index < 5) otp_inputs.current[index + 1].focus() // Adds Focus To The Next Input
    }

    const handleKeyPress = (event:TextInputKeyPressEvent, index:number):void => {
        if(event.nativeEvent.key === "Backspace" && !password_reset_code[index] && index > 0) otp_inputs.current[index - 1].focus() // Adds Focus To The Previous Input
    }

    // Function For Generate The Password
    const generatePassword = ():void => {
        setNewPassword(generateKey(15)) // Sets Generated Password To The Password Input
    }

    // Function For Handle The Password Reset
    const handlePasswordReset = async ():Promise<void> => {
        Keyboard.dismiss() // Hides The Keyboard
    
        if(password_reset_code.length !== 6 || !new_password.trim()) {
            Alert.alert(t("Chyba"), t("Vyplnte všetky potrebné údaje pre obnovu hesla.")) // Shows The Alert
            return
        }
    
        setIsLoading(true) // Activates The Loading
    
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            // Sends The POST Request To The Server
            const password_reset_response:Response = await fetch(`${API_URL}/password-reset/`, {
                method: "POST",
        
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({ 
                    password_reset_code: password_reset_code.join(""),
                    new_password 
                })
            })

            // If The Response Isn't Success
            if(!password_reset_response.ok) {
                Alert.alert(t("Pri spracovaní žiadosti o zmenu hesla došlo k chybe.")) // Shows The Alert
                return
            }
    
            const password_reset_data:BasicResponse = await password_reset_response.json() // Gets The Password Reset Data

            // If The Response Isn't Success
            if(!password_reset_data.success) {
                Alert.alert(t("Chyba"), password_reset_data.message) // Shows The Alert
                return
            }
            
            Alert.alert(t("Úspech"), password_reset_data.message) // Shows The Alert
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri spracovaní žiadosti o zmenu hesla došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setIsLoading(false) // Deactivates The Loading
        }
    }

    // Function For Get The Password Reset Code
    const getPasswordResetCode = async ():Promise<void> => {
        try {
            const identifier:string|null = await AsyncStorage.getItem("identifier") // Gets The Identifier

            if(!identifier) {
                Alert.alert(t("Chyba"), t("Pre zmenu hesla chýbajú potrebné údaje.")) // Shows The Alert
                return
            }

            // Sends The POST Request To The Server
            const get_password_reset_code_response:Response = await fetch(`${API_URL}/get-password-reset-code/`, {
                method: "POST",
        
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({ identifier })
            })

            // If The Response Isn't Success
            if(!get_password_reset_code_response.ok) {
                Alert.alert(t("Chyba"), t("Pri odosielaní overovacieho kódu došlo k chybe.")) // Shows The Alert
                return
            }
    
            const get_password_reset_code_data:BasicResponse = await get_password_reset_code_response.json() // Gets The Password Reset Data

            // If The Response Isn't Success
            if(!get_password_reset_code_data.success) {
                Alert.alert(t("Chyba"), get_password_reset_code_data.message) // Shows The Alert
                return
            }
            
            Alert.alert(t("Úspech"), get_password_reset_code_data.message) // Shows The Alert
            await AsyncStorage.setItem("password_reset_start_time", JSON.stringify(Date.now())) // Saves The Password Reset Start Time To The Async Storage
            router.push("/password-reset") // Goes To The Password Reset Page
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odosielaní overovacieho kódu došlo k chybe.")) // Shows The Alert
        }
    }

    return (
        remaining_time > 0 ? (
            <View className="password_reset_form" style={styles.password_reset_form}>
                <View style={styles.circle_decoration_before} />
                <View style={styles.circle_decoration_after} />
    
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 20,
                        marginBottom: 30,
                    }}
                >
                    <Back />

                    <Text className="heading" style={styles.heading}>{t("Obnova hesla")}</Text>
                </View>
    
                <View className="timer" style={styles.timer}>
                    <Svg width="100" height="100" viewBox="0 0 100 100">
                        <Circle
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="transparent"
                            stroke={BLUE_COLOR}
                            strokeWidth="3"
                        />
                
                        <AnimatedCircle
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="transparent"
                            stroke={stroke_color} 
                            strokeWidth="5"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={stroke_dashoffset} 
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                        />
                    </Svg>
    
                    <Text 
                        style={[
                            styles.timer_text,
                            { color: break_timer_text_color },
                        ]}
                    >
                        <Text className="minutes">{String(minutes)}</Text> {/* Shows Remaining Minutes */}
                        :
                        <Text className="seconds">{getFormattedTime("seconds", seconds, true)}</Text> {/* Shows Remaining Seconds */}
                    </Text>
                </View>
    
                <View className="otp_container" style={styles.otp_container}>
                    {password_reset_code.map((digit, index) => (
                        <TextInput
                            key={index}
    
                            ref={(one_input:TextInput|null) => {
                                if(one_input) otp_inputs.current[index] = one_input
                            }}
    
                            value={digit}
                            onChangeText={(text) => handleOtpInputChange(text, index)}
                            onKeyPress={(event:TextInputKeyPressEvent) => handleKeyPress(event, index)}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
    
                            style={[
                                styles.otp_input,
                                digit ? styles.otp_input_active : null,
                                { outlineStyle: "none" } as any
                            ]}
                        />
                    ))}
                </View>
    
                <View className="password_container" style={styles.password_container}>
                    <View 
                        className="generate_password" 
                        accessibilityLabel={t("Navrhnúť heslo")}
                        style={styles.generate_password}
                    >
                        <Icon
                            icon_name="key"
                            onPress={generatePassword}
                        />
                    </View>
    
                    <TextInput
                        className="new_password"
                        autoCapitalize="none"
                        secureTextEntry={is_password_hidden ? true : false}
                        textAlignVertical="top" 
                        placeholder={t("Vytvorte heslo")} 
                        placeholderTextColor={LIGHT_BLUE_COLOR}
                        accessibilityLabel={t("Vytvorte heslo")}  
                        value={new_password}
                        onChangeText={(text) => setNewPassword(text)}
                        maxLength={50}
    
                        style={[
                            styles.new_password, 
                            { outlineStyle: "none" } as any
                        ]}
                    />
    
                    <View 
                        className="show_hide_password" 
                        accessibilityLabel={is_password_hidden ? t("Zobraziť heslo") : t("Skryť heslo")}
                        style={styles.show_hide_password}
                    >
                        <Icon
                            icon_name={is_password_hidden ? "eye-slash" : "eye"}
                            onPress={() => setIsPasswordHidden(previous => !previous)} // Toggles The Value
                        />
                    </View>
                </View>
    
                <Pressable 
                    className="password_reset_form_submit"
                    onPress={handlePasswordReset}
                    disabled={is_loading}
                    accessibilityLabel={t("Zmeniť heslo")}
    
                    style={[
                        styles.password_reset_form_submit, 
                        { outlineStyle: "none" } as any
                    ]}
                >
                    <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>{t("Zmeniť heslo")}</Text>
                </Pressable>
    
                <View className="form_questions" style={styles.form_questions}>
                    <View 
                        style={{ 
                            flexDirection: "row",
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Neprišiel vám overovací kód?")} </Text>
                        <Pressable
                            className="password_reset"
                            onPress={getPasswordResetCode}
                            accessibilityRole="button"
                            accessibilityLabel={t("Poslať overovací kód")}
                        >
                            {({ pressed }) => (
                                <Text 
                                    style={[
                                        { color: SECONDARY_COLOR, fontStyle: "italic" },
                                        pressed && { textDecorationLine: "underline" } 
                                    ]}
                                >
                                    {t("Skúsiť znovu")}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        ) : (
            <View className="code_expired" style={styles.code_expired}>
                <Text style={{ textAlign: "center", color: SECONDARY_COLOR }}>{t("Platnosť overovacieho kódu pre zmenu hesla k vášmu účtu vypršala.")}</Text>

                <View 
                    style={{ 
                        flexDirection: "row",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: SECONDARY_COLOR }}>{t("Na stránke s ")}</Text>

                    <Pressable
                        onPress={onShowLoginForm}
                        accessibilityRole="button"
                        accessibilityLabel={t("Prihlásiť sa")}
                    >
                        {({ pressed }) => (
                            <Text 
                                style={[
                                    { color: SECONDARY_COLOR, fontStyle: "italic" },
                                    pressed && { textDecorationLine: "underline" } 
                                ]}
                            >
                                {t("prihlásením")}
                            </Text>
                        )}
                    </Pressable>

                    <Text style={{ color: SECONDARY_COLOR }}>{t(" požiadajte o nový.")}</Text>
                </View>
            </View>
        )
    )
}

const styles = StyleSheet.create({
    password_reset_form: {
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

    heading: {
        flex: 1,
        marginRight: 18.75 + 20,
        textAlign: "center",
        color: SECONDARY_COLOR,
        fontSize: 30,
        // animation: fadeInScale 0.3s ease-out;
    },

    timer: {
        position: "relative",
        width: 100,
        height: 100,
        marginHorizontal: "auto",
        marginBottom: 20,
        borderRadius: 50,

        // svg {
        //     position: absolute;
        //     top: 50%;
        //     left: 50%;
        //     transform: rotate(-90deg) translate(50%, -50%);
    
        //     &:nth-child(1) {
        //         z-index: 10;
        //     }
    
        //     .progress {
        //         fill: none;
        //         stroke-width: 5;
        //         stroke-linecap: round;
        //         stroke-linejoin: round;
        //     }
    
        //     .progress_background {
        //         fill: none;
        //         stroke: $blue-color;
        //         stroke-width: 3;
        //         stroke-dasharray: 2 4;
        //     }
        // }
    },

    timer_text: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        color: SECONDARY_COLOR,
        // font-family: $timer-font;
        fontSize: 22,

        // span {
        //     font-family: inherit;
        //     font-size: inherit;
        // }
    },

    otp_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 15,
        width: "90%",
        marginHorizontal: "auto",
        marginBottom: 20,
    },

    otp_input: {
        width: 50,
        height: 50,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
    },

    otp_input_active: {
        borderColor: BLUE_COLOR,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
    },

    otp_input_disabled: {
        opacity: 0.5,
    },

    password_container: {
        position: "relative",
    },

    generate_password: {
        position: "absolute",
        bottom: 10,
        left: 3,
        paddingTop: 19,
        paddingBottom: 15,
    },

    new_password: {
        position: "relative",
        width: "90%",
        height: 50,
        marginBottom: 10,
        marginHorizontal: "auto",
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
        position: "absolute",
        bottom: 123,
        alignSelf: "center",
    },

    password_reset_form_submit: {
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

    form_questions: {
        marginTop: 10,
        color: SECONDARY_COLOR,
    },

    code_expired: {
        position: "fixed",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" }, 
            { translateY: "-50%" }
        ],

        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    
        // a {
        //     color: $secondary-color;
        //     text-decoration: none;
        //     font-style: italic;
    
        //     &:hover,
        //     &:active,
        //     &:focus-visible {
        //         text-decoration: underline;
        //     }
        // }
    },
})