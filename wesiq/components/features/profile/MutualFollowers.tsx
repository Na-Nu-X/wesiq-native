import { StyleSheet, View, Text } from "react-native"
import { Avatar } from "@/components/ui"
import { SECONDARY_COLOR } from "@/constants/colors"
import { useTranslation } from "react-i18next"
import { colors } from "@/theme"

import type { MutualFollower } from "@/types/models"

interface MutualFollowersProps {
    mutual_followers:MutualFollower[],
    mutual_followers_count:number
}

export default function MutualFollowers({ mutual_followers, mutual_followers_count }:MutualFollowersProps) {
    const { t } = useTranslation() // Initializes The Translations

    if(mutual_followers.length === 0) return null

    return (
        <View style = {styles.mutual_followers_container}>
            <View style = {styles.avatars_stack}>
                {mutual_followers.map((one_mutual_follower:MutualFollower, index:number) => (
                    <View
                        key = {one_mutual_follower.id}

                        style = {[
                            styles.avatar_wrapper,
                            index > 0 && styles.avatar_overlap,
                            { zIndex: mutual_followers.length - index },
                        ]}
                    >
                        <Avatar
                            user = {one_mutual_follower}
                            size = {25}
                            is_ring_hidden
                        />
                    </View>
                ))}
            </View>

            {mutual_followers_count > 3 && (<Text style = {styles.mutual_followers_count}>+{mutual_followers_count - 3} {t("ďalší")}</Text>)}
        </View>
    )
}

const styles = StyleSheet.create({
    mutual_followers_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },

    avatars_stack: {
        flexDirection: "row",
        alignItems: "center",
    },

    avatar_wrapper: {
        borderRadius: 15,
        borderWidth: 2,
        borderColor: colors.surface,
        backgroundColor: colors.surface,
    },

    avatar_overlap: {
        marginLeft: -8,
    },

    mutual_followers_count: {
        color: SECONDARY_COLOR,
    },
})