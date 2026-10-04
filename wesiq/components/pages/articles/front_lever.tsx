import { Text, View, StyleSheet } from "react-native"
import { useTranslation } from "react-i18next"
import { SECONDARY_COLOR } from "@/constants/colors"

export default function FrontLever() {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <>
            <Text style={styles.h2}>Front Lever</Text>
            <Text style={styles.h3}>{t("Ako odomknúť tento ikonický cvik?")}</Text>

            <View style={styles.section}>
                <Text style={styles.p}>{t('Front Lever je jeden z prvých "High Level" cvikov vo svete kalisteniky, ktorý si môžeš odomknúť. To z neho však nerobí ľahkú záležitosť – práve naopak, predstavuje náročnú výzvu! Pri správnom a konzistentnom prístupe je však bežný atlét schopný naučiť sa ho v priebehu pol roka tréningu.')}</Text>
                <Text style={styles.p}>{t("Ako na to a čo všetko budeš potrebovať? Poďme sa pozrieť na kľúčové prvky, ktoré ťa dostanú do perfektnej horizontálnej pozície.")}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.h4}>{t("Kde začať?")}</Text>
                <Text style={styles.p}>{t("Front Lever vyžaduje extrémnu ťahovú silu a zapojenie takmer celého tela. Ešte predtým, ako sa do neho začneš naplno púšťať, by si mal mať zvládnuté pevné základy:")}</Text>

                <View style={{ marginLeft: 20 }}>
                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Zhyby na hrazde:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Úplným minimom je schopnosť urobiť väčšie množstvo striktných zhybov s vlastnou váhou.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Zhyby so záťažou:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Skvelý spôsob, ako prebudiť hrubú silu, je začať cvičiť zhyby s pridanou váhou.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Silný úchop:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("V kalistenike platí pravidlo – čím silnejší úchop, tým väčšie svalové prepojenie a zapojenie. S týmto ti veľmi pomôže pravidelné cvičenie Muscle Upov s dôrazom na maximálny Over Grip.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Magnézium:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Keďže je úchop taký dôležitý, nezabúdaj používať magnézium na ruky pre maximálnu silu na hrazde.")}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.h4}>{t("Zapojené Svaly a Správna Technika")}</Text>
                <Text style={styles.p}>{t("Pri držaní tela vodorovne so zemou bojuješ proti obrovskej páke. Najviac pri tom dostávajú zabrať nasledujúce partie:")}</Text>

                <View style={{ marginLeft: 20 }}>
                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Svaly chrbta (Krídla):")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Široký sval chrbta hrá pri Front Leveri hlavnú rolu. Tieto svaly sa dajú výborne posilniť a pripraviť zhybmi s užším úchopom rúk.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Scapular Retraction:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Spevnenie lopatiek (retrakcia a depresia) je absolútny technický základ. Bez silných a stabilných lopatiek túto pozíciu jednoducho neudržíš.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Stred tela (Core):")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Aj keď ide primárne o ťahový cvik, tvoje brucho a spodný chrbát musia byť zatnuté na maximum, aby telo zostalo v jednej priamke. To neznamená nesmierne silné brucho, ale základnú schopnosť pevného zatnutia.")}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.h4}>{t("Tréning s Expandérom")}</Text>
                <Text style={styles.p}>{t("Tvojím konečným cieľom je vydržať v plnej pozícii po čo najdlhšiu dobu. Kým sa tam však dostaneš, tvojím najlepším tréningovým nástrojom bude odporová guma (expandér), ktorá ti uľahčí boj s gravitáciou.")}</Text>

                <View style={{ marginLeft: 20 }}>
                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Správne umiestnenie:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Pre čo najefektívnejšiu pomoc zaves expandér na hrazdu a prevleč si ho cez zadok a nohy. Tým ti pomôže udržať ťažisko presne tam, kde je to najviac potrebné.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Cieľový čas:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Zvolená sila odporu gumy závisí od tvojej aktuálnej úrovne. Mal by si si vybrať taký expandér, s ktorým si schopný kontrolovane udržať čistý Front Lever minimálne 10 sekúnd.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Progres:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Akonáhle zvládneš tento časový cieľ s perfektnou formou, prejdi na tenší expandér s menším odporom.")}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.h4}>{t("Progresie Front Leveru")}</Text>
                <Text style={styles.p}>{t("Keďže skočiť rovno do plného Front Leveru je pre väčšinu ľudí nemožné (a riskantné z pohľadu zranení), tvoja cesta bude viesť cez systematické predlžovanie páky tela. Na ďalšiu, náročnejšiu progresiu prejdi až vtedy, keď dokážeš tú predchádzajúcu udržať s perfektnou technikou aspoň 10 až 15 sekúnd.")}</Text>

                <View style={{ marginLeft: 20 }}>
                    <View style={{ marginBottom: 10 }}>
                        <Text>1. </Text><Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Tuck Front Lever:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Úplný základ, kde maximálne skrátiš páku tela. Pokrč kolená a pritiahni ich čo najbližšie k hrudníku. Tvoj chrbát musí byť rovnobežne so zemou a lopatky pevne zatiahnuté smerom k sebe a dole.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text>2. </Text><Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Advanced Tuck Front Lever:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Akonáhle ti je klasický Tuck priľahký, začni kolená pomaly odťahovať od hrudníka. Cieľom je, aby tvoje stehná zvierali s trupom 90-stupňový uhol. Boky musia zostať vysoko a chrbát dokonale vystretý – nesmieš sa v ňom prehýbať.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text>3. </Text><Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("One Leg Front Lever:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Prvýkrát zapájaš plnú dĺžku páky, ale zatiaľ len pre jednu stranu. Jednu nohu úplne vystri a prepni (v kolene aj špičke) do vodorovnej línie, zatiaľ čo druhá zostáva pokrčená pri hrudníku. V sériách nohy poctivo striedaj, aby si nebudoval svalové disbalancie.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text>4. </Text><Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Straddle Front Lever:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Obe nohy máš už úplne vystreté, ale naširoko roznožené od seba. Roznoženie presúva časť váhy bližšie k ťažisku, vďaka čomu je cvik o niečo zvládnuteľnejší. Platí pravidlo: čím širšie máš nohy, tým je to ľahšie. Ako budeš silnieť, postupne ich dávaj bližšie k sebe.")}</Text>
                    </View>

                    <View style={{ marginBottom: 10 }}>
                        <Text>5. </Text><Text style={{ fontWeight: "bold", color: SECONDARY_COLOR }}>{t("Full Front Lever:")} </Text><Text style={{ color: SECONDARY_COLOR }}>{t("Finálny cieľ. Nohy sú spojené, prepnuté a celé telo od hlavy až po päty tvorí jednu dokonalú horizontálnu priamku rovnobežne so zemou. Žiadne klesanie zadku, žiadne krčenie lakťov – čistá estetika a brutalná sila.")}</Text>
                    </View>
                </View>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    section: {
        // transform: translateX(calc(-50%));
        // opacity: 0;
        // transition: transform 0.3s ease, opacity 0.3s ease;

        // &.animate {
        //     transform: translateX(0%);
        //     opacity: 1;
        // }

        // &:first-of-type {
        //     p:first-of-type {
        //         &::first-letter {
        //             margin-right: 10px;
        //             initial-letter: 2;
        //         }
        //     }
        // }
    },

    h2: {
        marginBottom: 30,
        textAlign: "center",
        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    h3: {
        marginBottom: 10,
        textAlign: "center",
        fontSize: 30,
        color: SECONDARY_COLOR,
    },

    h4: {
        // width: fit-content;
        marginTop: 20,
        marginBottom: 10,
        fontSize: 25,
        borderBottomWidth: 2,
        borderBottomColor: SECONDARY_COLOR,
        color: SECONDARY_COLOR,
    },

    p: {
        marginBottom: 20,
        color: SECONDARY_COLOR,
    },
    
        //     ul,
        //     ol {
        //         margin-left: 20px;
    
        //         li {
        //             margin-bottom: 10px;
        //         }
        //     }
})