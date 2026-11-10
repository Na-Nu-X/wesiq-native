// Create Post Flow: 1. Media → 2. Details → 3. Audience → Upload With Progress → Done

import { useReducer, useRef } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { Button, Card, Chip, Icon, SegmentedControl, Sheet, Text, TextField, ToggleRow } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { getActiveSubscriptionPlan } from "@/lib/subscription"
import { toFormDataFile, uploadWithProgress } from "@/lib/api/upload"
import { isArrayOf, isRecord } from "@/lib/api/guards"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import MediaTile, { TILE_HEIGHT, TILE_WIDTH } from "./MediaTile"
import LocationField, { PostLocation } from "./LocationField"
import { DraftMedia, formatDuration, formatMegabytes, getMediaIssue, getMediaLimits, MAX_CAPTION_LENGTH, MAX_MEDIA_COUNT, MediaLimits } from "./mediaRules"

import type { ApiError, ApiResult } from "@/types/api"

// ---------- Types ----------

export interface CompressTask {
    task_id:string,
    post_media_id:number,
    post_id:string
}

// Progress Of Server Side Media Processing (get-upload-progress)
export interface UploadProgressResponse {
    success:boolean,
    upload_progress:{
        task_id:string,
        state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
        progress:number
    },
    message:string
}

interface UploadPostResponse {
    success:boolean,
    message:string,
    compress_tasks?:CompressTask[]
}

type Step = "media"|"details"|"audience"|"uploading"|"done"
type Audience = "everyone"|"followers"

interface DraftState {
    step:Step,
    media:DraftMedia[],
    caption:string,
    location:PostLocation,
    audience:Audience,
    allow_comments:boolean,
    hide_likes:boolean,
    progress:number,
    error:ApiError|null
}

type DraftAction =
    | { type:"set_step", step:Step }
    | { type:"add_media", media:DraftMedia[] }
    | { type:"remove_media", key:string }
    | { type:"move_media", key:string, direction:-1|1 }
    | { type:"update_media", key:string, changes:Partial<DraftMedia> }
    | { type:"set_caption", caption:string }
    | { type:"set_location", location:PostLocation }
    | { type:"set_audience", audience:Audience }
    | { type:"set_allow_comments", value:boolean }
    | { type:"set_hide_likes", value:boolean }
    | { type:"upload_started" }
    | { type:"upload_progress", progress:number }
    | { type:"upload_failed", error:ApiError }
    | { type:"upload_finished" }
    | { type:"reset" }

const INITIAL_STATE:DraftState = {
    step: "media",
    media: [],
    caption: "",
    location: { name: "", latitude: null, longitude: null },
    audience: "everyone",
    allow_comments: true,
    hide_likes: false,
    progress: 0,
    error: null,
}

// Function For Update The Draft
function draftReducer(state:DraftState, action:DraftAction):DraftState {
    switch(action.type) {
        case "set_step": return { ...state, step: action.step, error: null }
        case "add_media": return { ...state, media: [...state.media, ...action.media].slice(0, MAX_MEDIA_COUNT) }
        case "remove_media": return { ...state, media: state.media.filter((item:DraftMedia) => item.key !== action.key) }

        case "move_media": {
            const index:number = state.media.findIndex((item:DraftMedia) => item.key === action.key) // Gets The Current Index
            const target:number = index + action.direction // Gets The Target Index
            if(index === -1 || target < 0 || target >= state.media.length) return state

            const media:DraftMedia[] = [...state.media]
            const [moved] = media.splice(index, 1)
            if(moved) media.splice(target, 0, moved)
            return { ...state, media }
        }

        case "update_media": return { ...state, media: state.media.map((item:DraftMedia) => item.key === action.key ? { ...item, ...action.changes } : item) }
        case "set_caption": return { ...state, caption: action.caption.slice(0, MAX_CAPTION_LENGTH) }
        case "set_location": return { ...state, location: action.location }
        case "set_audience": return { ...state, audience: action.audience }
        case "set_allow_comments": return { ...state, allow_comments: action.value }
        case "set_hide_likes": return { ...state, hide_likes: action.value }
        case "upload_started": return { ...state, step: "uploading", progress: 0, error: null }
        case "upload_progress": return { ...state, progress: action.progress }
        case "upload_failed": return { ...state, step: "audience", error: action.error }
        case "upload_finished": return { ...state, step: "done", progress: 100 }
        case "reset": return INITIAL_STATE
    }
}

// ---------- Helpers ----------

const isCompressTask = (value:unknown):value is CompressTask => {
    return isRecord(value) && typeof value.task_id === "string" && typeof value.post_media_id === "number" && typeof value.post_id === "string"
}

// Function For Make File Names Unique (The Server Matches Files And Covers By Name)
const makeUniqueName = (name:string, used_names:Set<string>):string => {
    if(!used_names.has(name)) {
        used_names.add(name)
        return name
    }

    const dot:number = name.lastIndexOf(".") // Gets The Extension Position
    const base:string = dot > 0 ? name.slice(0, dot) : name
    const extension:string = dot > 0 ? name.slice(dot) : ""
    let counter:number = 2

    while(used_names.has(`${base}_${counter}${extension}`)) counter++

    const unique_name:string = `${base}_${counter}${extension}`
    used_names.add(unique_name)
    return unique_name
}

// Function For Convert A Picker Asset To Draft Media
const toDraftMedia = (asset:ImagePicker.ImagePickerAsset, index:number, used_names:Set<string>):DraftMedia => {
    const is_video:boolean = asset.type === "video" || asset.type === "pairedVideo" // Stores The Information If The Asset Is A Video
    const fallback_name:string = `media_${Date.now()}_${index}.${is_video ? "mp4" : "jpg"}` // Gets The Fallback Name

    return {
        key: `${asset.assetId ?? asset.uri}_${Date.now()}_${index}`,
        uri: asset.uri,
        type: is_video ? "video" : "image",
        file_name: makeUniqueName(asset.fileName ?? fallback_name, used_names),
        mime_type: asset.mimeType ?? (is_video ? "video/mp4" : "image/jpeg"),
        file_size: typeof asset.fileSize === "number" ? asset.fileSize : (asset.file?.size ?? null),
        duration_seconds: typeof asset.duration === "number" ? asset.duration / 1000 : null, // The Picker Reports Milliseconds
        width: asset.width,
        height: asset.height,
        web_file: asset.file ?? null,
        is_muted: false,
        cover: null,
    }
}

// ---------- Component ----------

interface UploadPostSheetProps {
    visible:boolean,
    onClose:() => void,
    onUploaded:(compress_tasks:CompressTask[]) => void // Lets The Feed Track Video Processing
}

export default function UploadPostSheet({ visible, onClose, onUploaded }:UploadPostSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const [state, dispatch] = useReducer(draftReducer, INITIAL_STATE) // Stores The Draft
    const upload_controller = useRef<AbortController|null>(null) // Cancels The Upload

    const limits:MediaLimits = getMediaLimits(getActiveSubscriptionPlan(logged_in_user)) // Gets The Upload Limits
    const has_invalid_media:boolean = state.media.some((item:DraftMedia) => getMediaIssue(item, limits) !== null) // Stores The Information If Some Media Can't Be Uploaded
    const is_dirty:boolean = state.media.length > 0 || state.caption.trim().length > 0 || state.location.name.length > 0 // Stores The Information If There Is Something To Lose

    // ---------- Media ----------

    // Function For Pick Photos And Videos (The System Picker Needs No Permission Prompt)
    const pickMedia = async ():Promise<void> => {
        const remaining:number = MAX_MEDIA_COUNT - state.media.length // Gets The Remaining Slots
        if(remaining <= 0) return

        try {
            const result:ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "videos"],
                allowsMultipleSelection: true,
                selectionLimit: remaining,
                orderedSelection: true,
                quality: 1,
            })

            if(result.canceled) return

            const used_names:Set<string> = new Set(state.media.flatMap((item:DraftMedia) => [item.file_name, item.cover?.file_name ?? ""]))
            const supported:ImagePicker.ImagePickerAsset[] = result.assets.filter((asset) => !asset.mimeType || asset.mimeType.startsWith("image/") || asset.mimeType.startsWith("video/"))

            if(supported.length < result.assets.length) showAlert(t("Nepodporovaný formát"), t("Niektoré súbory boli vynechané, pretože nie sú fotkou ani videom."))
            if(supported.length > 0) dispatch({ type: "add_media", media: supported.slice(0, remaining).map((asset, index:number) => toDraftMedia(asset, index, used_names)) })
        }

        catch {
            showAlert(t("Chyba"), t("Pri výbere súborov došlo k chybe."))
        }
    }

    // Function For Pick A Video Cover
    const pickCover = async (media:DraftMedia):Promise<void> => {
        try {
            const result:ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 })
            const asset = result.canceled ? null : result.assets[0] // Gets The Picked Image
            if(!asset) return

            const used_names:Set<string> = new Set(state.media.flatMap((item:DraftMedia) => [item.file_name, item.cover?.file_name ?? ""]))

            dispatch({
                type: "update_media",
                key: media.key,
                changes: {
                    cover: {
                        uri: asset.uri,
                        file_name: makeUniqueName(`cover_${asset.fileName ?? `${Date.now()}.jpg`}`, used_names),
                        mime_type: asset.mimeType ?? "image/jpeg",
                        web_file: asset.file ?? null,
                    },
                },
            })
        }

        catch {
            showAlert(t("Chyba"), t("Pri výbere súborov došlo k chybe."))
        }
    }

    // ---------- Upload ----------

    // Function For Upload The Post
    const uploadPost = async ():Promise<void> => {
        if(!logged_in_user) {
            showAlert(t("Chyba"), t("Príspevok nie je možné pridať bez prihlásenia."))
            return
        }

        dispatch({ type: "upload_started" })

        const controller:AbortController = new AbortController()
        upload_controller.current = controller

        const form_data:FormData = new FormData()
        form_data.append("description", state.caption.trim())
        form_data.append("tagged_users", JSON.stringify([]))
        form_data.append("added_hashtags", JSON.stringify([]))
        form_data.append("location", state.location.name.trim())

        if(state.location.latitude !== null && state.location.longitude !== null) {
            form_data.append("latitude", String(state.location.latitude))
            form_data.append("longitude", String(state.location.longitude))
        }

        form_data.append("public_visibility", state.audience === "everyone" ? "True" : "False")
        form_data.append("allow_comments", state.allow_comments ? "True" : "False")
        form_data.append("hide_likes", state.hide_likes ? "True" : "False")

        form_data.append("media_data", JSON.stringify(state.media.map((item:DraftMedia, order:number) => ({
            filename: item.file_name,
            order,
            is_muted: item.type === "video" && item.is_muted,
            thumbnail_filename: item.cover?.file_name ?? "",
        }))))

        try {
            for(const item of state.media) {
                // React Native's FormData Accepts { uri, name, type } Objects, Which TypeScript's DOM Types Don't Know
                form_data.append("selected_posts", await toFormDataFile({ uri: item.uri, name: item.file_name, mime_type: item.mime_type, web_file: item.web_file }) as Blob)

                if(item.cover) {
                    form_data.append("select_thumbnail", await toFormDataFile({ uri: item.cover.uri, name: item.cover.file_name, mime_type: item.cover.mime_type, web_file: item.cover.web_file }) as Blob)
                }
            }
        }

        catch {
            dispatch({ type: "upload_failed", error: { kind: "invalid_response", status: null, message: t("Niektorý zo súborov sa nepodarilo načítať.") } })
            return
        }

        const response:ApiResult<UploadPostResponse> = await uploadWithProgress<UploadPostResponse>("upload-post/", form_data, {
            signal: controller.signal,
            onProgress: (progress:number) => dispatch({ type: "upload_progress", progress }),
        })

        upload_controller.current = null

        if(!response.ok) {
            if(response.error.kind === "aborted") {
                dispatch({ type: "set_step", step: "audience" })
                return
            }

            haptics.error()
            dispatch({ type: "upload_failed", error: response.error })
            return
        }

        const compress_tasks:CompressTask[] = isArrayOf(response.data.compress_tasks, isCompressTask) ? response.data.compress_tasks : [] // Gets The Processing Tasks
        if(compress_tasks.length > 0) onUploaded(compress_tasks)

        haptics.success()
        dispatch({ type: "upload_finished" })
    }

    // ---------- Closing ----------

    // Function For Close The Sheet (Asks Before Throwing Away A Draft)
    const requestClose = async ():Promise<void> => {
        if(state.step === "uploading") return

        if(state.step === "done") {
            onClose()
            dispatch({ type: "reset" })
            return
        }

        if(is_dirty) {
            const is_confirmed:boolean = await confirmAction({
                title: t("Zahodiť príspevok?"),
                message: t("Vybrané fotky a text sa neuložia."),
                confirm_label: t("Zahodiť"),
                cancel_label: t("Pokračovať v úpravách"),
                is_destructive: true,
            })

            if(!is_confirmed) return
            dispatch({ type: "reset" })
        }

        onClose()
    }

    // ---------- Rendering ----------

    const step_index:number = state.step === "media" ? 0 : state.step === "details" ? 1 : 2 // Gets The Step Index

    const titles:Record<Step, string> = {
        media: t("Vyberte fotky a videá"),
        details: t("Popis a miesto"),
        audience: t("Kto uvidí príspevok"),
        uploading: t("Nahráva sa príspevok"),
        done: t("Príspevok bol odoslaný"),
    }

    return (
        <Sheet
            visible={visible}
            onClose={requestClose}
            title={titles[state.step]}
            subtitle={state.step === "uploading" || state.step === "done" ? undefined : t("Krok {{step}} z {{count}}", { step: step_index + 1, count: 3 })}
            size="large"
            is_dismissable={state.step !== "uploading"}
            footer={renderFooter()}
        >
            {state.step !== "uploading" && state.step !== "done" && <StepIndicator active_index={step_index} />}

            {state.step === "media" && renderMediaStep()}
            {state.step === "details" && renderDetailsStep()}
            {state.step === "audience" && renderAudienceStep()}
            {state.step === "uploading" && renderUploadingStep()}
            {state.step === "done" && renderDoneStep()}
        </Sheet>
    )

    // Function For Render The Media Step
    function renderMediaStep() {
        return (
            <>
                {state.media.length === 0 ? (
                    <Card variant="outlined" padding="xxl" onPress={pickMedia} accessibility_label={t("Vybrať fotky alebo videá")} style={styles.picker_card}>
                        <View style={styles.picker_icon}>
                            <Icon name="images" size={26} color="primary" />
                        </View>

                        <Text variant="heading" align="center">{t("Vybrať fotky alebo videá")}</Text>
                        <Text variant="callout" color="text_secondary" align="center">{t("Až {{count}} súborov v jednom príspevku", { count: MAX_MEDIA_COUNT })}</Text>
                    </Card>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles} style={styles.tiles_scroll}>
                        {state.media.map((item:DraftMedia, index:number) => (
                            <MediaTile
                                key={item.key}
                                media={item}
                                index={index}
                                count={state.media.length}
                                issue={getMediaIssue(item, limits)}
                                onRemove={() => dispatch({ type: "remove_media", key: item.key })}
                                onMove={(direction:-1|1) => dispatch({ type: "move_media", key: item.key, direction })}
                                onToggleMute={() => dispatch({ type: "update_media", key: item.key, changes: { is_muted: !item.is_muted } })}
                                onPickCover={() => pickCover(item)}
                            />
                        ))}

                        {state.media.length < MAX_MEDIA_COUNT && (
                            <Card variant="outlined" padding="none" onPress={pickMedia} accessibility_label={t("Pridať ďalšie")} style={styles.add_tile}>
                                <Icon name="plus" size={22} color="primary" />
                                <Text variant="label" color="primary_text">{t("Pridať")}</Text>
                                <Text variant="caption" color="text_muted">{state.media.length}/{MAX_MEDIA_COUNT}</Text>
                            </Card>
                        )}
                    </ScrollView>
                )}

                <Card variant="raised" padding="md">
                    <View style={styles.limits_row}>
                        <Icon name="circle-info" size={14} color="text_secondary" />

                        <Text variant="caption" color="text_secondary" style={styles.flex}>
                            {t("Fotky do {{image_size}}, videá do {{video_size}} a {{duration}} min.", {
                                image_size: formatMegabytes(limits.max_image_bytes),
                                video_size: formatMegabytes(limits.max_video_bytes),
                                duration: formatDuration(limits.max_video_seconds),
                            })}
                            {" "}
                            {state.media.length > 1 ? t("Poradie zmeníte šípkami pod náhľadom.") : ""}
                        </Text>
                    </View>
                </Card>
            </>
        )
    }

    // Function For Render The Details Step
    function renderDetailsStep() {
        return (
            <>
                <TextField
                    label={t("Popis príspevku")}
                    placeholder={t("Napíšte niečo o tréningu...")}
                    value={state.caption}
                    onChangeText={(caption:string) => dispatch({ type: "set_caption", caption })}
                    multiline
                    maxLength={MAX_CAPTION_LENGTH}
                    is_counter_visible
                    autoCapitalize="sentences"
                    autoFocus={state.caption.length === 0}
                />

                <View style={styles.chips}>
                    <Chip
                        label={t("Hashtag")}
                        icon="hashtag"
                        onPress={() => {
                            const needs_space:boolean = state.caption.length > 0 && !/\s$/.test(state.caption) // Stores The Information If A Space Is Needed
                            dispatch({ type: "set_caption", caption: `${state.caption}${needs_space ? " " : ""}#` })
                        }}
                    />
                </View>

                <LocationField value={state.location} onChange={(location:PostLocation) => dispatch({ type: "set_location", location })} />
            </>
        )
    }

    // Function For Render The Audience Step
    function renderAudienceStep() {
        const first_media:DraftMedia|undefined = state.media[0] // Gets The Cover Media

        return (
            <>
                {state.error && (
                    <Card variant="outlined" padding="md" style={styles.error_card}>
                        <View style={styles.limits_row}>
                            <Icon name="triangle-exclamation" size={14} color="danger" />
                            <Text variant="callout" color="danger" style={styles.flex}>{state.error.message}</Text>
                        </View>
                    </Card>
                )}

                <SegmentedControl<Audience>
                    value={state.audience}
                    onChange={(audience:Audience) => dispatch({ type: "set_audience", audience })}
                    accessibility_label={t("Kto uvidí príspevok")}
                    options={[
                        { value: "everyone", label: t("Všetci"), icon: "earth-europe" },
                        { value: "followers", label: t("Sledovatelia"), icon: "user-group" },
                    ]}
                />

                <Text variant="caption" color="text_secondary" style={styles.audience_hint}>
                    {state.audience === "everyone" ? t("Príspevok sa zobrazí všetkým v komunite.") : t("Príspevok uvidia len vaši sledovatelia.")}
                </Text>

                <Card padding="xs">
                    <ToggleRow
                        icon="comment"
                        label={t("Povoliť komentáre")}
                        value={state.allow_comments}
                        onChange={(value:boolean) => dispatch({ type: "set_allow_comments", value })}
                    />

                    <ToggleRow
                        icon="heart"
                        label={t("Skryť počet označení páči sa mi to")}
                        description={t("Počet uvidíte len vy.")}
                        value={state.hide_likes}
                        onChange={(value:boolean) => dispatch({ type: "set_hide_likes", value })}
                    />
                </Card>

                {first_media && (
                    <Card variant="raised" padding="md">
                        <View style={styles.summary}>
                            <Image source={{ uri: first_media.cover?.uri ?? first_media.uri }} style={styles.summary_image} contentFit="cover" />

                            <View style={styles.flex}>
                                <Text variant="label" color="text_secondary">
                                    {t("Súbory: {{count}}", { count: state.media.length })}
                                    {state.location.name ? ` · ${state.location.name}` : ""}
                                </Text>

                                <Text variant="callout" numberOfLines={3} color={state.caption ? "text" : "text_muted"}>
                                    {state.caption.trim() || t("Bez popisu")}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}
            </>
        )
    }

    // Function For Render The Uploading Step
    function renderUploadingStep() {
        return (
            <View style={styles.status} accessibilityLiveRegion="polite">
                <Text variant="display" color="primary" is_tabular>{state.progress}%</Text>

                <View style={styles.progress_track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: state.progress }}>
                    <View style={[styles.progress_fill, { width: `${state.progress}%` }]} />
                </View>

                <Text variant="callout" color="text_secondary" align="center">
                    {state.progress < 100 ? t("Nechajte aplikáciu otvorenú, kým sa súbory nahrajú.") : t("Dokončuje sa...")}
                </Text>
            </View>
        )
    }

    // Function For Render The Done Step
    function renderDoneStep() {
        return (
            <View style={styles.status}>
                <View style={styles.done_icon}>
                    <Icon name="check" size={30} color="success" />
                </View>

                <Text variant="heading" align="center">{t("Hotovo!")}</Text>
                <Text variant="callout" color="text_secondary" align="center">{t("Príspevok sa spracováva a o chvíľu sa zobrazí v komunite.")}</Text>
            </View>
        )
    }

    // Function For Render The Footer Buttons
    function renderFooter() {
        if(state.step === "media") {
            return (
                <Button
                    label={has_invalid_media ? t("Odstráňte označené súbory") : t("Pokračovať")}
                    icon="arrow-right"
                    icon_position="right"
                    onPress={() => dispatch({ type: "set_step", step: "details" })}
                    is_disabled={state.media.length === 0 || has_invalid_media}
                    is_full_width
                />
            )
        }

        if(state.step === "details" || state.step === "audience") {
            const is_last:boolean = state.step === "audience" // Stores The Information If This Is The Last Step

            return (
                <View style={styles.footer_row}>
                    <Button label={t("Späť")} variant="secondary" onPress={() => dispatch({ type: "set_step", step: is_last ? "details" : "media" })} />

                    <Button
                        label={is_last ? (state.error ? t("Skúsiť znova") : t("Zdieľať príspevok")) : t("Pokračovať")}
                        icon={is_last ? "paper-plane" : "arrow-right"}
                        icon_position={is_last ? "left" : "right"}
                        onPress={() => is_last ? uploadPost() : dispatch({ type: "set_step", step: "audience" })}
                        style={styles.flex}
                    />
                </View>
            )
        }

        if(state.step === "uploading") {
            return <Button label={t("Zrušiť nahrávanie")} variant="danger" onPress={() => upload_controller.current?.abort()} is_full_width />
        }

        return <Button label={t("Hotovo")} onPress={requestClose} is_full_width />
    }
}

// Function For Render The Step Indicator
function StepIndicator({ active_index }:{ active_index:number }) {
    return (
        <View style={styles.step_indicator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {[0, 1, 2].map((index:number) => (
                <View key={index} style={[styles.step_bar, index <= active_index ? styles.step_bar_active : null]} />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    step_indicator: {
        flexDirection: "row",
        gap: spacing.xs,
    },

    step_bar: {
        flex: 1,
        height: 4,
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    step_bar_active: {
        backgroundColor: colors.primary,
    },

    picker_card: {
        alignItems: "center",
        gap: spacing.sm,
        borderStyle: "dashed",
    },

    picker_icon: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    tiles_scroll: {
        marginHorizontal: -spacing.xl,
    },

    tiles: {
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
    },

    add_tile: {
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        borderStyle: "dashed",
    },

    limits_row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
    },

    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
        marginTop: -spacing.sm,
    },

    error_card: {
        borderColor: colors.danger,
        backgroundColor: colors.danger_soft,
    },

    audience_hint: {
        marginTop: -spacing.sm,
        paddingHorizontal: spacing.xs,
    },

    summary: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    summary_image: {
        width: 56,
        height: 70,
        borderRadius: radii.sm,
        backgroundColor: colors.surface_pressed,
    },

    status: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.lg,
        paddingVertical: spacing.huge,
    },

    progress_track: {
        width: "100%",
        height: 8,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    progress_fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },

    done_icon: {
        width: 72,
        height: 72,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.success_soft,
        borderRadius: radii.pill,
        borderWidth: layout.hairline,
        borderColor: colors.success,
    },

    footer_row: {
        flexDirection: "row",
        gap: spacing.sm,
    },
})
