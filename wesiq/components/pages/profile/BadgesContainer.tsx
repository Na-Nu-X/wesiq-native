import React, { useState, useRef } from "react"
import { Pressable, StyleProp, ViewStyle, Animated, ScrollView, View, StyleSheet, Text } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { useTranslation } from "react-i18next"

import type { Profile } from "@/app/(tabs)/profile/[username]"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"

type BadgesContainerProps = {
    is_found:boolean,
    profile:Profile|null
}

const BLUE_RARITY = "#3b82f6" // Defines The Blue Rarity Color
const GREEN_RARITY = "#10b981" // Defines The Green Rarity Color
const YELLOW_RARITY = "#f59e0b" // Defines The Yellow Rarity Color
const ORANGE_RARITY = "#fa541c" // Defines The Orange Rarity Color
const RED_RARITY = "#ef4444" // Defines The Red Rarity Color
const PURPLE_RARITY = "#8b5cf6" // Defines The Purple Rarity Color

export default function BadgesContainer({ is_found, profile }:BadgesContainerProps) {
    const { t } = useTranslation() // Initializes The Translations

    const MAX_EMPTY_BADGES:number = 16 // Defines The Amount Of The Maximum Empty Badges
    let badges_amount:number = 0 // Stores The Badges Amount

    if(profile) {
        badges_amount = [
            profile.role === "developer",
            profile.subscription && profile.subscription.is_active,
            profile.total_transactions_amount !== 0,
            profile.level >= 1,
            profile.xp !== 0,
            profile.max_activity_streak !== 0,
            profile.years_since_registration !== 0,
            profile.total_activities !== 0,
            profile.followers.length !== 0,
            profile.posts.length !== 0,
            profile.total_received_likes !== 0,
            profile.post_comments.length !== 0
        ].filter(Boolean).length + profile.badges.length
    }

    const remaining_empty_badges:number = MAX_EMPTY_BADGES - badges_amount // Gets The Number Of Remaining Empty Badges

    return (
        is_found && profile ? (
            <View className="badges_container" style={styles.badges_container}>
                <ScrollView 
                    className="badges" 
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    indicatorStyle="white"
                    style={styles.badges}
                    contentContainerStyle={styles.badges_content}
                >
                    {profile.role === "developer" && (
                        <View 
                            className="badge developer" 
                            accessibilityLabel={t("Vývojár")}

                            style={[
                                styles.badge,
                                styles.badge_developer,
                            ]}
                        >
                            <FontAwesome6
                                name="code"
                                size={20}
                                color={RED_RARITY}
                                style={styles.badge_icon}
                            />
                        </View>
                    )}

                    {profile.subscription && profile.subscription.is_active && (
                        <View 
                            className="badge subscriber" 
                            accessibilityLabel={profile.subscription.plan === "premium" ? t("Prémiový predplatiteľ") : t("Základný predplatiteľ")}

                            style={[
                                styles.badge,
                                styles.badge_subscriber,
                            ]}
                        >
                            <FontAwesome6
                                name="crown"
                                size={20}
                                color={YELLOW_RARITY}
                                style={styles.badge_icon}
                            />
                        </View>
                    )}
                    
                    {profile.total_transactions_amount !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "donations",
                                profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 && "blue",
                                profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 && "green",
                                profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 && "yellow",
                                profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 && "orange",
                                profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 && "red",
                                profile.total_transactions_amount >= 100 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Prispievateľ")}

                            style={[
                                styles.badge,
                                profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? styles.badge_blue_rarity : {},
                                profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? styles.badge_green_rarity : {},
                                profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? styles.badge_yellow_rarity : {},
                                profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? styles.badge_orange_rarity : {},
                                profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? styles.badge_red_rarity : {},
                                profile.total_transactions_amount >= 100 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="dollar-sign"
                                size={30}

                                color={
                                    profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? BLUE_RARITY :
                                    profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? GREEN_RARITY : 
                                    profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? YELLOW_RARITY : 
                                    profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? ORANGE_RARITY : 
                                    profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? { color: BLUE_RARITY } : {},
                                    profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? { color: GREEN_RARITY } : {},
                                    profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? { color: YELLOW_RARITY } : {},
                                    profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? { color: ORANGE_RARITY } : {},
                                    profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? { color: RED_RARITY } : {},
                                    profile.total_transactions_amount >= 100 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 && ("1€")}
                                {profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 && ("2€")}
                                {profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 && ("5€")}
                                {profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 && ("10€")}
                                {profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 && ("50€")}
                                {profile.total_transactions_amount >= 100 && ("100+€")}
                            </Text>
                        </View>
                    )}

                    <View 
                        className={[
                            "badge", 
                            "level",
                            profile.level >= 1 && profile.level <= 10 && "blue",
                            profile.level > 10 && profile.level <= 25 && "green",
                            profile.level > 25 && profile.level <= 50 && "yellow",
                            profile.level > 50 && profile.level <= 75 && "orange",
                            profile.level > 75 && profile.level <= 100 && "red",
                            profile.level > 100 && "purple"
                        ].filter(Boolean).join(" ")}
                        
                        accessibilityLabel={t("Level")}

                        style={[
                            styles.badge,
                            profile.level >= 1 && profile.level <= 10 ? styles.badge_blue_rarity : {},
                            profile.level > 10 && profile.level <= 25 ? styles.badge_green_rarity : {},
                            profile.level > 25 && profile.level <= 50 ? styles.badge_yellow_rarity : {},
                            profile.level > 50 && profile.level <= 75 ? styles.badge_orange_rarity : {},
                            profile.level > 75 && profile.level <= 100 ? styles.badge_red_rarity : {},
                            profile.level > 100 ? styles.badge_purple_rarity : {},
                        ]}
                    >
                        <FontAwesome6
                            name="arrow-trend-up"
                            size={30}

                            color={
                                profile.level >= 1 && profile.level <= 10 ? BLUE_RARITY :
                                profile.level > 10 && profile.level <= 25 ? GREEN_RARITY : 
                                profile.level > 25 && profile.level <= 50 ? YELLOW_RARITY : 
                                profile.level > 50 && profile.level <= 75 ? ORANGE_RARITY : 
                                profile.level > 75 && profile.level <= 100 ? RED_RARITY : 
                                PURPLE_RARITY
                            }

                            style={styles.badge_icon}
                        />

                        <Text 
                            style={[
                                styles.badge_text,
                                profile.level >= 1 && profile.level <= 10 ? { color: BLUE_RARITY } : {},
                                profile.level > 10 && profile.level <= 25 ? { color: GREEN_RARITY } : {},
                                profile.level > 25 && profile.level <= 50 ? { color: YELLOW_RARITY } : {},
                                profile.level > 50 && profile.level <= 75 ? { color: ORANGE_RARITY } : {},
                                profile.level > 75 && profile.level <= 100 ? { color: RED_RARITY } : {},
                                profile.level > 100 ? { color: PURPLE_RARITY } : {},
                            ]}
                        >
                            {profile.level}
                        </Text>
                    </View>

                    {profile.xp !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "xp",
                                profile.xp < 1000 && "blue",
                                profile.xp >= 1000 && profile.xp <= 5000 && "green",
                                profile.xp > 5000 && profile.xp <= 10000 && "yellow",
                                profile.xp > 10000 && profile.xp <= 50000 && "orange",
                                profile.xp > 50000 && profile.xp <= 100000 && "red",
                                profile.xp > 100000 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Získané XP")}

                            style={[
                                styles.badge,
                                profile.xp < 1000 ? styles.badge_blue_rarity : {},
                                profile.xp >= 1000 && profile.xp <= 5000 ? styles.badge_green_rarity : {},
                                profile.xp > 5000 && profile.xp <= 10000 ? styles.badge_yellow_rarity : {},
                                profile.xp > 10000 && profile.xp <= 50000 ? styles.badge_orange_rarity : {},
                                profile.xp > 50000 && profile.xp <= 100000 ? styles.badge_red_rarity : {},
                                profile.xp > 100000 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="bolt"
                                size={30}

                                color={
                                    profile.xp < 1000 ? BLUE_RARITY :
                                    profile.xp >= 1000 && profile.xp <= 5000 ? GREEN_RARITY : 
                                    profile.xp > 5000 && profile.xp <= 10000 ? YELLOW_RARITY : 
                                    profile.xp > 10000 && profile.xp <= 50000 ? ORANGE_RARITY : 
                                    profile.xp > 50000 && profile.xp <= 100000 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <View 
                                style={[
                                    {
                                        position: "absolute",
                                        top: 0, 
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                    },
                                    
                                    styles.badge_xp_text,
                                ]}
                            >
                                <Text 
                                    style={[
                                        { 
                                            textAlign: "center",
                                            lineHeight: 22,
                                            fontSize: 22,
                                            fontWeight: "bold", 
                                        },

                                        profile.xp < 1000 ? { color: BLUE_RARITY } : {},
                                        profile.xp >= 1000 && profile.xp <= 5000 ? { color: GREEN_RARITY } : {},
                                        profile.xp > 5000 && profile.xp <= 10000 ? { color: YELLOW_RARITY } : {},
                                        profile.xp > 10000 && profile.xp <= 50000 ? { color: ORANGE_RARITY } : {},
                                        profile.xp > 50000 && profile.xp <= 100000 ? { color: RED_RARITY } : {},
                                        profile.xp > 100000 ? { color: PURPLE_RARITY } : {},
                                    ]}
                                >
                                    {profile.xp < 1000 && "<1000"}
                                    {profile.xp >= 1000 && profile.xp <= 5000 && "1K"}
                                    {profile.xp > 5000 && profile.xp <= 10000 && "5K"}
                                    {profile.xp > 10000 && profile.xp <= 50000 && "10K"}
                                    {profile.xp > 50000 && profile.xp <= 100000 && "50K"}
                                    {profile.xp > 100000 && "100K+"}
                                </Text>

                                <Text 
                                    style={[
                                        { textAlign: "center" },
                                        profile.xp < 1000 ? { color: BLUE_RARITY } : {},
                                        profile.xp >= 1000 && profile.xp <= 5000 ? { color: GREEN_RARITY } : {},
                                        profile.xp > 5000 && profile.xp <= 10000 ? { color: YELLOW_RARITY } : {},
                                        profile.xp > 10000 && profile.xp <= 50000 ? { color: ORANGE_RARITY } : {},
                                        profile.xp > 50000 && profile.xp <= 100000 ? { color: RED_RARITY } : {},
                                        profile.xp > 100000 ? { color: PURPLE_RARITY } : {},
                                    ]}
                                >
                                    XP
                                </Text>
                            </View>
                        </View>
                    )}

                    {profile.max_activity_streak !== 0 && (
                        <View 
                            className="badge max_activity_streak" 
                            accessibilityLabel={t("Najdlhšia rada aktivity")}

                            style={[
                                styles.badge,
                                styles.badge_max_activity_streak,
                            ]}
                        >
                            <FontAwesome6
                                name="fire"
                                size={20}
                                color={YELLOW_RARITY}
                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    { color: YELLOW_RARITY }
                                ]}
                            >
                                {profile.max_activity_streak}
                            </Text>
                        </View>
                    )}

                    {profile.years_since_registration !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "years_since_registration",
                                profile.years_since_registration === 1 && "blue",
                                profile.years_since_registration === 2 && "green",
                                profile.years_since_registration === 3 && "yellow",
                                profile.years_since_registration === 4 && "orange",
                                profile.years_since_registration === 5 && "red",
                                profile.years_since_registration > 5 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Roky od registrácie")}

                            style={[
                                styles.badge,
                                profile.years_since_registration === 1 ? styles.badge_blue_rarity : {},
                                profile.years_since_registration === 2 ? styles.badge_green_rarity : {},
                                profile.years_since_registration === 3 ? styles.badge_yellow_rarity : {},
                                profile.years_since_registration === 4 ? styles.badge_orange_rarity : {},
                                profile.years_since_registration === 5 ? styles.badge_red_rarity : {},
                                profile.years_since_registration > 5 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="cake-candles"
                                size={30}

                                color={
                                    profile.years_since_registration === 1 ? BLUE_RARITY :
                                    profile.years_since_registration === 2 ? GREEN_RARITY : 
                                    profile.years_since_registration === 3 ? YELLOW_RARITY : 
                                    profile.years_since_registration === 4 ? ORANGE_RARITY : 
                                    profile.years_since_registration === 5 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.years_since_registration === 1 ? { color: BLUE_RARITY } : {},
                                    profile.years_since_registration === 2 ? { color: GREEN_RARITY } : {},
                                    profile.years_since_registration === 3 ? { color: YELLOW_RARITY } : {},
                                    profile.years_since_registration === 4 ? { color: ORANGE_RARITY } : {},
                                    profile.years_since_registration === 5 ? { color: RED_RARITY } : {},
                                    profile.years_since_registration > 5 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.years_since_registration}
                            </Text>
                        </View>
                    )}

                    {profile.total_activities !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "total_activities",
                                profile.total_activities < 10 && "blue",
                                profile.total_activities <= 50 && "green",
                                profile.total_activities <= 100 && "yellow",
                                profile.total_activities <= 250 && "orange",
                                profile.total_activities <= 500 && "red",
                                profile.total_activities > 500 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Zaznamenané aktivity")}

                            style={[
                                styles.badge,
                                profile.total_activities >= 1 && profile.total_activities < 10 ? styles.badge_blue_rarity : {},
                                profile.total_activities >= 10 && profile.total_activities <= 50 ? styles.badge_green_rarity : {},
                                profile.total_activities > 50 && profile.total_activities <= 100 ? styles.badge_yellow_rarity : {},
                                profile.total_activities > 100 && profile.total_activities <= 250 ? styles.badge_orange_rarity : {},
                                profile.total_activities > 250 && profile.total_activities <= 500 ? styles.badge_red_rarity : {},
                                profile.total_activities > 500 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="dumbbell"
                                size={30}

                                color={
                                    profile.total_activities >= 1 && profile.total_activities < 10 ? BLUE_RARITY :
                                    profile.total_activities >= 10 && profile.total_activities <= 50 ? GREEN_RARITY : 
                                    profile.total_activities > 50 && profile.total_activities <= 100 ? YELLOW_RARITY : 
                                    profile.total_activities > 100 && profile.total_activities <= 250 ? ORANGE_RARITY : 
                                    profile.total_activities > 250 && profile.total_activities <= 500 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.total_activities >= 1 && profile.total_activities < 10 ? { color: BLUE_RARITY } : {},
                                    profile.total_activities >= 10 && profile.total_activities <= 50 ? { color: GREEN_RARITY } : {},
                                    profile.total_activities > 50 && profile.total_activities <= 100 ? { color: YELLOW_RARITY } : {},
                                    profile.total_activities > 100 && profile.total_activities <= 250 ? { color: ORANGE_RARITY } : {},
                                    profile.total_activities > 250 && profile.total_activities <= 500 ? { color: RED_RARITY } : {},
                                    profile.total_activities > 500 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.total_activities < 10 && "1"}
                                {profile.total_activities >= 10 && profile.total_activities <= 50 && "10"}
                                {profile.total_activities > 50 && profile.total_activities <= 100 && "50"}
                                {profile.total_activities > 100 && profile.total_activities <= 250 && "100"}
                                {profile.total_activities > 250 && profile.total_activities <= 500 && "250"}
                                {profile.total_activities > 500 && "500+"}
                            </Text>
                        </View>
                    )}

                    {profile.followers.length !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "followers",
                                profile.followers.length >= 1 && profile.followers.length < 5 && "blue",
                                profile.followers.length >= 5 && profile.followers.length <= 10 && "green",
                                profile.followers.length > 10 && profile.followers.length <= 25 && "yellow",
                                profile.followers.length > 25 && profile.followers.length <= 50 && "orange",
                                profile.followers.length > 50 && profile.followers.length <= 100 && "red",
                                profile.followers.length > 100 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Počet sledovateľov")}

                            style={[
                                styles.badge,
                                profile.followers.length >= 1 && profile.followers.length < 5 ? styles.badge_blue_rarity : {},
                                profile.followers.length >= 5 && profile.followers.length <= 10 ? styles.badge_green_rarity : {},
                                profile.followers.length > 10 && profile.followers.length <= 25 ? styles.badge_yellow_rarity : {},
                                profile.followers.length > 25 && profile.followers.length <= 50 ? styles.badge_orange_rarity : {},
                                profile.followers.length > 50 && profile.followers.length <= 100 ? styles.badge_red_rarity : {},
                                profile.followers.length > 100 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="bluesky"
                                size={30}

                                color={
                                    profile.followers.length >= 1 && profile.followers.length < 5 ? BLUE_RARITY :
                                    profile.followers.length >= 5 && profile.followers.length <= 10 ? GREEN_RARITY : 
                                    profile.followers.length > 10 && profile.followers.length <= 25 ? YELLOW_RARITY : 
                                    profile.followers.length > 25 && profile.followers.length <= 50 ? ORANGE_RARITY : 
                                    profile.followers.length > 50 && profile.followers.length <= 100 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.followers.length >= 1 && profile.followers.length < 5 ? { color: BLUE_RARITY } : {},
                                    profile.followers.length >= 5 && profile.followers.length <= 10 ? { color: GREEN_RARITY } : {},
                                    profile.followers.length > 10 && profile.followers.length <= 25 ? { color: YELLOW_RARITY } : {},
                                    profile.followers.length > 25 && profile.followers.length <= 50 ? { color: ORANGE_RARITY } : {},
                                    profile.followers.length > 50 && profile.followers.length <= 100 ? { color: RED_RARITY } : {},
                                    profile.followers.length > 100 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.followers.length < 5 && "1"}
                                {profile.followers.length >= 5 && profile.followers.length <= 10 && "5"}
                                {profile.followers.length > 10 && profile.followers.length <= 25 && "10"}
                                {profile.followers.length > 25 && profile.followers.length <= 50 && "25"}
                                {profile.followers.length > 50 && profile.followers.length <= 100 && "50"}
                                {profile.followers.length > 100 && "100+"}
                            </Text>
                        </View>
                    )}

                    {profile.posts.length !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "posts",
                                profile.posts.length >= 1 && profile.posts.length < 5 && "blue",
                                profile.posts.length >= 5 && profile.posts.length <= 10 && "green",
                                profile.posts.length > 10 && profile.posts.length <= 25 && "yellow",
                                profile.posts.length > 25 && profile.posts.length <= 50 && "orange",
                                profile.posts.length > 50 && profile.posts.length <= 100 && "red",
                                profile.posts.length > 100 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Počet príspevkov")}

                            style={[
                                styles.badge,
                                profile.posts.length >= 1 && profile.posts.length < 5 ? styles.badge_blue_rarity : {},
                                profile.posts.length >= 5 && profile.posts.length <= 10 ? styles.badge_green_rarity : {},
                                profile.posts.length > 10 && profile.posts.length <= 25 ? styles.badge_yellow_rarity : {},
                                profile.posts.length > 25 && profile.posts.length <= 50 ? styles.badge_orange_rarity : {},
                                profile.posts.length > 50 && profile.posts.length <= 100 ? styles.badge_red_rarity : {},
                                profile.posts.length > 100 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="bluesky"
                                size={30}

                                color={
                                    profile.posts.length >= 1 && profile.posts.length < 5 ? BLUE_RARITY :
                                    profile.posts.length >= 5 && profile.posts.length <= 10 ? GREEN_RARITY : 
                                    profile.posts.length > 10 && profile.posts.length <= 25 ? YELLOW_RARITY : 
                                    profile.posts.length > 25 && profile.posts.length <= 50 ? ORANGE_RARITY : 
                                    profile.posts.length > 50 && profile.posts.length <= 100 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.posts.length >= 1 && profile.posts.length < 5 ? { color: BLUE_RARITY } : {},
                                    profile.posts.length >= 5 && profile.posts.length <= 10 ? { color: GREEN_RARITY } : {},
                                    profile.posts.length > 10 && profile.posts.length <= 25 ? { color: YELLOW_RARITY } : {},
                                    profile.posts.length > 25 && profile.posts.length <= 50 ? { color: ORANGE_RARITY } : {},
                                    profile.posts.length > 50 && profile.posts.length <= 100 ? { color: RED_RARITY } : {},
                                    profile.posts.length > 100 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.posts.length >= 1 && profile.posts.length < 5 && "1"}
                                {profile.posts.length >= 5 && profile.posts.length <= 10 && "5"}
                                {profile.posts.length > 10 && profile.posts.length <= 25 && "10"}
                                {profile.posts.length > 25 && profile.posts.length <= 50 && "25"}
                                {profile.posts.length > 50 && profile.posts.length <= 100 && "50"}
                                {profile.posts.length > 100 && "100+"}
                            </Text>
                        </View>
                    )}

                    {profile.total_received_likes !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "received_likes",
                                profile.total_received_likes >= 1 && profile.total_received_likes < 5 && "blue",
                                profile.total_received_likes >= 5 && profile.total_received_likes <= 10 && "green",
                                profile.total_received_likes > 10 && profile.total_received_likes <= 25 && "yellow",
                                profile.total_received_likes > 25 && profile.total_received_likes <= 50 && "orange",
                                profile.total_received_likes > 50 && profile.total_received_likes <= 100 && "red",
                                profile.total_received_likes > 100 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Získané lajky")}

                            style={[
                                styles.badge,
                                profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? styles.badge_blue_rarity : {},
                                profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? styles.badge_green_rarity : {},
                                profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? styles.badge_yellow_rarity : {},
                                profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? styles.badge_orange_rarity : {},
                                profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? styles.badge_red_rarity : {},
                                profile.total_received_likes > 100 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="heart"
                                size={30}

                                color={
                                    profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? BLUE_RARITY :
                                    profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? GREEN_RARITY : 
                                    profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? YELLOW_RARITY : 
                                    profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? ORANGE_RARITY : 
                                    profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? { color: BLUE_RARITY } : {},
                                    profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? { color: GREEN_RARITY } : {},
                                    profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? { color: YELLOW_RARITY } : {},
                                    profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? { color: ORANGE_RARITY } : {},
                                    profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? { color: RED_RARITY } : {},
                                    profile.total_received_likes > 100 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.total_received_likes >= 1 && profile.total_received_likes < 5 && "1"}
                                {profile.total_received_likes >= 5 && profile.total_received_likes <= 10 && "5"}
                                {profile.total_received_likes > 10 && profile.total_received_likes <= 25 && "10"}
                                {profile.total_received_likes > 25 && profile.total_received_likes <= 50 && "25"}
                                {profile.total_received_likes > 50 && profile.total_received_likes <= 100 && "50"}
                                {profile.total_received_likes > 100 && "100+"}
                            </Text>
                        </View>
                    )}

                    {profile.post_comments.length !== 0 && (
                        <View 
                            className={[
                                "badge", 
                                "written_comments",
                                profile.post_comments.length >= 1 && profile.post_comments.length < 5 && "blue",
                                profile.post_comments.length >= 5 && profile.post_comments.length <= 10 && "green",
                                profile.post_comments.length > 10 && profile.post_comments.length <= 25 && "yellow",
                                profile.post_comments.length > 25 && profile.post_comments.length <= 50 && "orange",
                                profile.post_comments.length > 50 && profile.post_comments.length <= 100 && "red",
                                profile.post_comments.length > 100 && "purple"
                            ].filter(Boolean).join(" ")}
                            
                            accessibilityLabel={t("Získané lajky")}

                            style={[
                                styles.badge,
                                profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? styles.badge_blue_rarity : {},
                                profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? styles.badge_green_rarity : {},
                                profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? styles.badge_yellow_rarity : {},
                                profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? styles.badge_orange_rarity : {},
                                profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? styles.badge_red_rarity : {},
                                profile.post_comments.length > 100 ? styles.badge_purple_rarity : {},
                            ]}
                        >
                            <FontAwesome6
                                name="heart"
                                size={30}

                                color={
                                    profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? BLUE_RARITY :
                                    profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? GREEN_RARITY : 
                                    profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? YELLOW_RARITY : 
                                    profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? ORANGE_RARITY : 
                                    profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? RED_RARITY : 
                                    PURPLE_RARITY
                                }

                                style={styles.badge_icon}
                            />

                            <Text 
                                style={[
                                    styles.badge_text,
                                    profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? { color: BLUE_RARITY } : {},
                                    profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? { color: GREEN_RARITY } : {},
                                    profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? { color: YELLOW_RARITY } : {},
                                    profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? { color: ORANGE_RARITY } : {},
                                    profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? { color: RED_RARITY } : {},
                                    profile.post_comments.length > 100 ? { color: PURPLE_RARITY } : {},
                                ]}
                            >
                                {profile.post_comments.length >= 1 && profile.post_comments.length < 5 && "1"}
                                {profile.post_comments.length >= 5 && profile.post_comments.length <= 10 && "5"}
                                {profile.post_comments.length > 10 && profile.post_comments.length <= 25 && "10"}
                                {profile.post_comments.length > 25 && profile.post_comments.length <= 50 && "25"}
                                {profile.post_comments.length > 50 && profile.post_comments.length <= 100 && "50"}
                                {profile.post_comments.length > 100 && "100+"}
                            </Text>
                        </View>
                    )}

                    {profile.badges.map((one_badge:{ title:string, data:string }, index:number) => (
                        <View 
                            key={index} 
                            className="badge"

                            style={[
                                styles.badge,
                                one_badge.data === "no_day_off_week" ? styles.badge_no_day_off_week : {},
                                one_badge.data === "xmas_activity" ? styles.badge_xmas_activity : {},
                                one_badge.data === "new_year_new_goals" ? styles.badge_new_year_new_goals : {},
                            ]}
                        >
                            {one_badge.data === "no_day_off_week" && (
                                <>
                                    <FontAwesome6
                                        name="calendar-check"
                                        size={30}
                                        color={YELLOW_RARITY}
                                        style={styles.badge_icon}
                                    />

                                    <Text 
                                        style={[
                                            styles.badge_text,
                                            { color: YELLOW_RARITY },
                                        ]}
                                    >
                                        7
                                    </Text>
                                </>
                            )}

                            {one_badge.data === "xmas_activity" && (
                                <>
                                    <FontAwesome6
                                        name="gift"
                                        size={20}
                                        color={"#dc2626"}
                                        style={styles.badge_icon}
                                    />
                                </>
                            )}

                            {one_badge.data === "new_year_new_goals" && (
                                <>
                                    <FontAwesome6
                                        name="champagne-glasses"
                                        size={20}
                                        color={"#a57e05"}
                                        style={styles.badge_icon}
                                    />
                                </>
                            )}
                        </View>
                    ))}

                    {profile.badges.length < MAX_EMPTY_BADGES && (
                        Array.from({ length: remaining_empty_badges }).map((_, index:number) => (
                            <View key={index} className="badge" style={styles.badge} /> // Creates An Empty Badge
                        )
                    ))}
                </ScrollView>
            </View>
        ) : (
            <View className="badges_container" style={styles.badges_container}>
                <View className="badges" style={styles.badges}>
                    <View 
                        className="badge level blue" 
                        accessibilityLabel={t("Level")} 
                        style={styles.badge}
                    >
                        <FontAwesome6
                            name="arrow-trend-up"
                            size={20}
                            color={BLUE_COLOR}
                        />

                        <Text>1</Text>
                    </View>
                </View>
            </View>
        )
    )
}

const styles = StyleSheet.create({
    badges_container: {
        position: "relative",
        marginBottom: 40,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        overflow: "visible",
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    badges: {
        flex: 1,
        width: "100%",
    },
    
    badges_content: {
        flexDirection: "column",
        alignContent: "flex-start",
        flexWrap: "wrap",
        gap: 10,
        height: 55 + 10 + 55 + 20,             
        padding: 10,
    },

    badge: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: 55,
        height: 55,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 55 / 2,
        userSelect: "none",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    badge_text: {
        position: "absolute",
        fontSize: 22,
        fontWeight: "bold",

        // span {
        //     text-align: center;
        // }
    },

    badge_icon: {
        opacity: 0.2,
    },

    badge_blue_rarity: {
        backgroundColor: transparentize(BLUE_RARITY, 0.85),
        color: BLUE_RARITY,
        borderColor: transparentize(BLUE_RARITY, 0.7),
        shadowColor: BLUE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_green_rarity: {
        backgroundColor: transparentize(GREEN_RARITY, 0.85),
        color: GREEN_RARITY,
        borderColor: transparentize(GREEN_RARITY, 0.7),
        shadowColor: GREEN_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_yellow_rarity: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_orange_rarity: {
        backgroundColor: transparentize(ORANGE_RARITY, 0.85),
        color: ORANGE_RARITY,
        borderColor: transparentize(ORANGE_RARITY, 0.7),
        shadowColor: ORANGE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_red_rarity: {
        backgroundColor: transparentize(RED_RARITY, 0.85),
        color: RED_RARITY,
        borderColor: transparentize(RED_RARITY, 0.7),
        shadowColor: RED_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_developer: {
        backgroundColor: transparentize(RED_RARITY, 0.85),
        color: RED_RARITY,
        borderColor: transparentize(RED_RARITY, 0.7),
        shadowColor: RED_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_purple_rarity: {
        backgroundColor: transparentize(PURPLE_RARITY, 0.85),
        color: PURPLE_RARITY,
        borderColor: transparentize(PURPLE_RARITY, 0.7),
        shadowColor: PURPLE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_xp_text: {
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,

        // span {
        //     line-height: 1;
        //     font-weight: normal;
        // }
    },

    badge_subscriber: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_max_activity_streak: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_no_day_off_week: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_xmas_activity: {
        backgroundColor: transparentize("#dc2626", 0.88),
        color: "#dc2626",
        borderColor: transparentize("#dc2626", 0.6),
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_new_year_new_goals: {
        backgroundColor: transparentize("#eab308", 0.9),
        color: "#a57e05",
        borderColor: transparentize("#eab308", 0.5),
        shadowColor: "#eab308",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },
})