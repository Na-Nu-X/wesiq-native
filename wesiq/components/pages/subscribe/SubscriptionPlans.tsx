
import { Alert, Image, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useEffect, useState } from "react"
import Purchases, { PurchasesError, PurchasesOfferings, PurchasesPackage } from "react-native-purchases"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import AnimatedSubscriptionButton from "./AnimatedSubscriptionButton"

export default function SubscriptionPlans() {
    const { t } = useTranslation() // Initializes The Translations

    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User

    const [packages, setPackages] = useState<PurchasesPackage[]>([]) // Stores The Packages (Subscription Prices)
    const [is_loading, setIsLoading] = useState<boolean>(true) // Stores The Information If The Loading Is Active

    // Initializes The Load Of Offerings (Subscription Prices)
    useEffect(() => {
        // Function For Get Offerings (Subscription Prices)
        const getOfferings = async ():Promise<void> => {
            try {
                const offerings:PurchasesOfferings = await Purchases.getOfferings() // Gets The Offerings
                if(offerings.current !== null) setPackages(offerings.current.availablePackages) // Sets The Packages (Prices From  App Store / Google Play)
            } 
            
            catch {
                console.error(t("Pri načítavaní cien predplatných došlo k chybe."))
            }

            finally {
                setIsLoading(false);
            }
        }

        getOfferings() // Gets Offerings
    }, [])

    // Function For Handle The Purchase
    const handlePurchase = async (pack:PurchasesPackage):Promise<void> => {
        try {
            const { customerInfo } = await Purchases.purchasePackage(pack) // Gets The Customer Info
            
            // Success Subscription Activation
            if(typeof customerInfo.entitlements.active["subscription"] !== "undefined") {
                Alert.alert(t("Úspech"), t("Ďakujeme, predplatné bolo úspešne kúpené!")) // Shows The Alert
            }
        } 

        catch(error) {
            if(!(error as PurchasesError).userCancelled) Alert.alert(t("Chyba"), t("Pri nákupe predplatného nastala chyba.")) // Shows The Alert
            else console.log(t("Používateľ ukončil proces platby predplatného."))
        }
    }

    if(is_loading) return <Text>{t("Načítavam...")}</Text>

    const basic_subscription:PurchasesPackage = packages.find(one_package => one_package.identifier === "basic") || packages[0] // Gets The Basic Subscription
    const premium_subscription:PurchasesPackage = packages.find(one_package => one_package.identifier === "premium") || packages[1] // Gets The Premium Subscription

    return (
        <View className="subscription_plans" style={styles.subscription_plans}>
            <View className="basic" style={styles.basic}>
                <Text className="title" style={styles.title}>{t("Základné predplatné")}</Text>
                <Text className="description" style={styles.description}>{t("Vážime si Vašu podporu, ktorá nám pomáha držať aplikáciu pri živote.")}</Text>
                <Text className="price" style={styles.price}>{basic_subscription?.product.priceString || "0,99"}<Text style={styles.price_top}>€ / {t("mesiac")}</Text></Text>

                <View className="checks" style={styles.checks}>
                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Odznak na profile!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Obrázky až do 10MB!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Videá až do 50MB!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("2 minúty dlhé videá!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Lepšia kvalita obrázkov!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Lepšia kvalita videí!")}</Text>
                    </View>
                </View>

                <AnimatedSubscriptionButton 
                    logged_in_user={logged_in_user}
                    subscription_type="basic"
                    onBasicSubscriptionPurchase={() => handlePurchase(basic_subscription)}
                />
            </View>

            <View className="premium" style={styles.premium}>
                <Text className="title" style={styles.title}>{t("Prémiové predplatné")}</Text>
                <Text className="description" style={styles.description}>{t("Pre náročných používateľov, ktorí chcú z aplikácie vyťažiť absolútne maximum.")}</Text>
                <Text className="price" style={styles.price}>{premium_subscription?.product.priceString || "2,99"}<Text style={styles.price_top}>€ / {t("mesiac")}</Text></Text>

                <View className="checks" style={styles.checks}>
                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Odznak na profile!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Obrázky až do 10MB!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Videá až do 100MB!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("3 minúty dlhé videá!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Najlepšia kvalita obrázkov!")}</Text>
                    </View>

                    <View className="check" style={styles.check}>
                        <View className="checkbox checked" style={styles.checkbox}>
                            <Image
                                source={require("@/assets/images/check.png")}
                                resizeMode="contain"
                                style={styles.check_icon}
                            />
                        </View>
                        
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Najlepšia kvalita videí!")}</Text>
                    </View>
                </View>

                <AnimatedSubscriptionButton 
                    logged_in_user={logged_in_user}
                    subscription_type="premium"
                    onPremiumSubscriptionPurchase={() => handlePurchase(premium_subscription)}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    subscription_plans: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        flex: 1,
    },

    basic: {
        justifyContent: "space-between",
        gap: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease;
    
        // &:hover {
        //     transform: translateY(-2px);
        // }
    },

    premium: {
        // @include animated_border;
        transform: [{ scale: 1.02 }],
        justifyContent: "space-between",
        gap: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        // transition: transform 0.3s ease;
            
        // &:hover {
        //     transform: scale(1.05) translateY(-2px);
        // }
    },

    title: {
        textAlign: "center",
        textTransform: "uppercase",
        fontSize: 22,
        color: SECONDARY_COLOR,
    },

    description: {
        // font-size: 0.9em;
        textAlign: "center",
        color: SECONDARY_COLOR,
    },

    price: {
        marginBottom: 30,
        fontSize: 40,
        fontWeight: "bold",
        textAlign: "center",
        color: SECONDARY_COLOR,
        // background: linear-gradient(135deg, $secondary-color 20%, lighten($blue-color, 15%) 60%, $blue-color 100%);
        // background-clip: text;
        // -webkit-background-clip: text;
        // -webkit-text-fill-color: transparent;
    },

    price_top: {
        marginLeft: 2,
        fontSize: 10,
        verticalAlign: "top",
    },

    checks: {
        gap: 15,
    },

    check: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        // font-size: 0.9em;
        textAlign: "left",
    },

    checkbox: {
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: "#23a96d",
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },
    
    check_icon: {
        position: "absolute",
        width: "100%",
        height: "100%",
        transform: [{ scale: 1.5 }],
    },

    subscribe: {
        // @include crop_text;
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease;
        
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: translateY(-2px);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }

        // &.disabled {
        //     cursor: not-allowed;
        // }
    },

    premium_subscribe: {
        // @include crop_text;
        // @include glow_animated_border;
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        // background: linear-gradient(135deg, transparentize($blue-color, 0.35), transparentize($dark-blue-color, 0.55));
        color: SECONDARY_COLOR,
        // borderWidth: 1,
        // borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease;
        
        // &:hover,
        // &:focus-visible {
        //     background: linear-gradient(135deg, transparentize($blue-color, 0.15), transparentize($dark-blue-color, 0.45));
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: translateY(-2px);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }

        // &.disabled {
        //     cursor: not-allowed;
        // }
    },

    glow_container: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        width: "90%",
        height: 50,
        marginVertical: 10,
        borderRadius: MEDIUM_BORDER_RADIUS,
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
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
    },
})

// .subscription_plans {
//     .basic,
//     .premium {
//         .checks {
//             .check {
//                 display: flex;
//                 align-items: center;
//                 gap: 10px;
//                 line-height: 1;
//                 list-style-type: none;
//                 font-size: 0.9em;
//                 text-align: left;

//                 &:has(.checkbox.checked) {
//                     border-color: transparentize($green-color, 0.8);
//                 }

//                 .checkbox {
//                     position: relative;
//                     display: block;
//                     flex-shrink: 0;
//                     width: 15px;
//                     height: 15px;
//                     border-radius: 2px;
//                     outline: 1px solid darken($secondary-color, 40%);
//                     background: transparentize($main-color, 0.5);

//                     &::before {
//                         content: "";
//                         position: absolute;
//                         width: inherit;
//                         height: inherit;
//                         background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
//                         background-size: contain;
//                         transform: scale(0);
//                         opacity: 0;
//                         transition: transform 0.2s ease, opacity 0.2s ease;
//                     }

//                     &.checked {
//                         outline: 1px solid darken($green-color, 10%);

//                         &::before {
//                             transform: scale(1.5);
//                             opacity: 1;
//                             transition: transform 0.3s ease, opacity 0.3s ease;
//                         }
//                     }
//                 }

//                 p {
//                     flex-grow: 1;
//                     margin-right: 22.95px + 10px;
//                     text-align: center;
//                 }
//             }
//         }

//         
    
//     
// }