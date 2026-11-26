import { useEffect, useState } from "react"
import { Platform, View, Alert } from "react-native"
import { GoogleSignin, isSuccessResponse, SignInResponse, statusCodes } from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui"
import { radii } from "@/theme"

const ENABLE_APPLE_AUTH:boolean = false
const GOOGLE_WEB_CLIENT_ID:string = "540480595540-tntaf1q3pdefl5tjcsk445ircs19dtn6.apps.googleusercontent.com" // Defines The Google Web Client ID

type SocialAuthButtonsProps = {
    onLoginSuccess:(access:string, refresh:string) => Promise<void>|void
}

export function SocialAuthButtons({ onLoginSuccess }:SocialAuthButtonsProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active

    // Initializes The Google Sign-In Configuration
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID
        })
    }, [])

    // Function For Handle Google Sign-In
    const handleGoogleSignIn = async ():Promise<void> => {
        if(is_loading) return

        setIsLoading(true) // Activates The Loading

        try {
            await GoogleSignin.hasPlayServices()

            const response:SignInResponse = await GoogleSignin.signIn() // Gets The Response From Google

            if(isSuccessResponse(response) && response.data.idToken) {
                // Gets The Google Sign-In Response
                const google_signin_response:Response = await fetch("https://wesiq.com/api/auth/google/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_token: response.data.idToken })
                })

                const google_signin_data = await google_signin_response.json() // Gets The Google Sign-In Data

                if(google_signin_data.success && google_signin_data.access && google_signin_data.refresh) await onLoginSuccess(google_signin_data.access, google_signin_data.refresh)
                else Alert.alert(t("Chyba"), google_signin_data.message || t("Prihlásenie cez Google zlyhalo.")) // Shows The Alert
            }
        } 
        
        catch(error:any) {
            if(error.code !== statusCodes.SIGN_IN_CANCELLED) Alert.alert(t("Chyba"), t("Nepodarilo sa prihlásiť cez Google účet.")) // Shows The Alert
        } 
        
        finally {
            setIsLoading(false) // Deactivates The Loading
        }
    }

    // Function For Handle Apple Sign-In
    const handleAppleSignIn = async ():Promise<void> => {
        if(is_loading) return

        setIsLoading(true) // Activates The Loading

        try {
            const credential:AppleAuthentication.AppleAuthenticationCredential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL
                ]
            })

            if(credential.identityToken) {
                // Gets The Apple Sign-In Response
                const apple_signin_response = await fetch("https://wesiq.com/api/auth/apple/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        identity_token: credential.identityToken,
                        first_name: credential.fullName?.givenName ?? "",
                        last_name: credential.fullName?.familyName ?? "",
                    }),
                })

                const apple_signin_data = await apple_signin_response.json() // Gets The Apple Sign-In Data

                if(apple_signin_data.success && apple_signin_data.access && apple_signin_data.refresh) await onLoginSuccess(apple_signin_data.access, apple_signin_data.refresh)
                else Alert.alert(t("Chyba"), apple_signin_data.message || t("Prihlásenie cez Apple zlyhalo.")) // Shows The Alert
            }
        } 
        
        catch(error:any) {
            if(error.code !== "ERR_REQUEST_CANCELED") Alert.alert(t("Chyba"), t("Nepodarilo sa prihlásiť cez Apple účet.")) // Shows The Alert
        } 
        
        finally {
            setIsLoading(false) // Deactivates The Loading
        }
    }

    return (
        <View style={{ gap: 10 }}>
            <Button
                label={t("Pokračovať cez Google")}
                onPress={handleGoogleSignIn}
                variant="secondary"
                icon="google"
                is_loading={is_loading}
                is_full_width
            />

            {Platform.OS === "ios" && ENABLE_APPLE_AUTH ? (
                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={radii.pill}
                    style={{ width: "100%", height: 48 }}
                    onPress={handleAppleSignIn}
                />
            ) : null}
        </View>
    )
}