import { useEffect, useState } from "react"
import { Platform, View, Alert } from "react-native"
import { GoogleSignin, isSuccessResponse, SignInResponse, statusCodes } from "@react-native-google-signin/google-signin"
import * as AppleAuthentication from "expo-apple-authentication"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui"
import { radii } from "@/theme"
import { appleLogin, googleLogin, toServerLanguage } from "@/lib/api/endpoints/auth"

const ENABLE_APPLE_AUTH:boolean = false
const GOOGLE_WEB_CLIENT_ID:string = "540480595540-tntaf1q3pdefl5tjcsk445ircs19dtn6.apps.googleusercontent.com" // Defines The Google Web Client ID (The ID Token's Audience, Must Match GOOGLE_WEB_CLIENT_ID On The Server)
const GOOGLE_IOS_CLIENT_ID:string = "540480595540-hs88vg1pp6sju9k8n71nj58p247mo4nr.apps.googleusercontent.com" // Defines The Google iOS Client ID (Its Reversed Form Is The "iosUrlScheme" In app.json)

type SocialAuthButtonsProps = {
    onLoginSuccess:() => Promise<void>|void // Called After The Session Tokens Were Saved
}

export function SocialAuthButtons({ onLoginSuccess }:SocialAuthButtonsProps) {
    const { t, i18n } = useTranslation() // Initializes The Translations

    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active

    // Initializes The Google Sign-In Configuration
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
            iosClientId: GOOGLE_IOS_CLIENT_ID
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
                const login_response = await googleLogin(response.data.idToken, toServerLanguage(i18n.language)) // Sends The Google ID Token To The Server (The Language Is Used Only For A New Account)

                if(login_response.ok) await onLoginSuccess()
                else Alert.alert(t("Chyba"), login_response.error.message || t("Prihlásenie cez Google zlyhalo.")) // Shows The Alert
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
                // Apple Only Gives The Name On The First Sign-In, So It Is Sent Along With The Identity Token
                const login_response = await appleLogin(credential.identityToken, credential.fullName?.givenName ?? "", credential.fullName?.familyName ?? "", toServerLanguage(i18n.language))

                if(login_response.ok) await onLoginSuccess()
                else Alert.alert(t("Chyba"), login_response.error.message || t("Prihlásenie cez Apple zlyhalo.")) // Shows The Alert
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
