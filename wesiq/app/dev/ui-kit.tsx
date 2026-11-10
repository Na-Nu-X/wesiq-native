// UI Kit Gallery (Development Builds Only, Production Redirects Home) - Open /dev/ui-kit

import { useState } from "react"
import { StyleSheet, View } from "react-native"
import { Redirect, useLocalSearchParams } from "expo-router"
import { Avatar, Button, Card, Chip, Divider, EmptyState, Header, IconButton, Screen, SegmentedControl, Sheet, Skeleton, Stepper, Text, TextField, UserRow, UserRowSkeleton } from "@/components/ui"
import { spacing } from "@/theme"
import { MOCK_USERS } from "@/lib/api/mocks/data"

import type { UserListItem } from "@/types/models"

type Tab = "followers"|"following"|"requests"

export default function UiKitScreen() {
    const [tab, setTab] = useState<Tab>("followers")
    const [reps, setReps] = useState<number>(12)
    const [name, setName] = useState<string>("")
    const { sheet } = useLocalSearchParams<{ sheet?:string }>() // "?sheet=1" Opens The Sheet (For Screenshots)
    const [is_sheet_open, setIsSheetOpen] = useState<boolean>(sheet === "1")
    const [selected_day, setSelectedDay] = useState<number>(1)

    if(!__DEV__) return <Redirect href="/" />

    return (
        <Screen
            edges={["top", "left", "right", "bottom"]}
            header={<Header title="UI kit" subtitle="Development preview" has_back_button right={<IconButton icon="gear" accessibility_label="Settings" onPress={() => {}} variant="soft" badge_count={3} />} />}
        >
            <Text variant="display">Display</Text>
            <Text variant="title">Title text</Text>
            <Text variant="heading">Heading text</Text>
            <Text variant="body" color="text_secondary">Body text in secondary color for supporting content.</Text>
            <Text variant="timer" color="primary">12:45</Text>

            <View style={styles.row}>
                <Button label="Primary" onPress={() => {}} icon="check" />
                <Button label="Secondary" onPress={() => {}} variant="secondary" />
                <Button label="Outline" onPress={() => {}} variant="outline" />
                <Button label="Ghost" onPress={() => {}} variant="ghost" />
                <Button label="Delete" onPress={() => {}} variant="danger" icon="trash" />
                <Button label="Saving" onPress={() => {}} is_loading />
                <Button label="Disabled" onPress={() => {}} is_disabled />
            </View>

            <SegmentedControl<Tab>
                value={tab}
                onChange={setTab}
                options={[{ value: "followers", label: "Followers", badge: 4 }, { value: "following", label: "Following" }, { value: "requests", label: "Requests", badge: 2 }]}
            />

            <View style={styles.row}>
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day:string, index:number) => (
                    <Chip key={day} label={day} is_selected={selected_day === index} onPress={() => setSelectedDay(index)} />
                ))}
                <Chip label="Premium" icon="crown" tone="warning" is_selected />
            </View>

            <Card>
                <View style={styles.card_row}>
                    <View style={styles.flex}>
                        <Text variant="body_strong">Push-ups</Text>
                        <Text variant="caption" color="text_muted">Set 1 of 3</Text>
                    </View>

                    <Stepper value={reps} onChange={setReps} min={1} max={500} label="reps" accessibility_label="Repetitions" />
                </View>
            </Card>

            <TextField label="Training plan name" placeholder="e.g. Upper body" value={name} onChangeText={setName} maxLength={50} is_counter_visible icon="dumbbell" />
            <TextField label="Password" placeholder="Password" is_password helper="At least 8 characters" />
            <TextField label="Email" placeholder="you@example.com" error="Enter a valid e-mail address" value="alex@" />

            <Card variant="raised" padding="md">
                {MOCK_USERS.slice(0, 3).map((user:UserListItem, index:number) => (
                    <View key={user.id}>
                        {index > 0 && <Divider inset={56} />}
                        <UserRow user={user} onPress={() => {}} trailing={<Button label="Remove" size="sm" variant="secondary" onPress={() => {}} />} />
                    </View>
                ))}
                <UserRowSkeleton />
            </Card>

            <View style={styles.row}>
                <Avatar user={MOCK_USERS[0] as UserListItem} size={64} />
                <Avatar user={MOCK_USERS[1] as UserListItem} size={48} />
                <Avatar user={MOCK_USERS[2] as UserListItem} size={32} />
                <Skeleton width={120} height={16} />
            </View>

            <EmptyState icon="user-group" title="No followers yet" message="When people follow this account, they'll show up here." action={{ label: "Find people", onPress: () => {} }} />

            <Button label="Open sheet" onPress={() => setIsSheetOpen(true)} is_full_width variant="outline" />

            <Sheet
                visible={is_sheet_open}
                onClose={() => setIsSheetOpen(false)}
                title="Followers"
                subtitle="4 people follow you"
                footer={<Button label="Done" onPress={() => setIsSheetOpen(false)} is_full_width />}
            >
                {MOCK_USERS.map((user:UserListItem) => (
                    <UserRow key={user.id} user={user} trailing={<Button label="Remove" size="sm" variant="secondary" onPress={() => {}} />} />
                ))}
            </Sheet>
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: spacing.sm,
    },

    card_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
})
