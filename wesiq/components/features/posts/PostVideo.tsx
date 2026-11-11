// Video Inside A Post (Wraps The Existing Player And Owns Its Control State)

import { createContext, ReactNode, useContext, useRef, useState } from "react"
import { DynamicVideo } from "@/components/pages/community/DynamicVideo"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { Post, PostMedia } from "@/types/models"
import type { vtt } from "@/components/pages/activity/CustomVideoControls"

// ---------- Only One Video Plays At A Time ----------

interface PlayingVideoValue {
    playing_media_id:number|null,
    setPlayingMediaId:(id:number|null) => void
}

const PlayingVideoContext = createContext<PlayingVideoValue>({ playing_media_id: null, setPlayingMediaId: () => {} })

export function PlayingVideoProvider({ children }:{ children:ReactNode }) {
    const [playing_media_id, setPlayingMediaId] = useState<number|null>(null) // Stores The Playing Video
    return <PlayingVideoContext.Provider value={{ playing_media_id, setPlayingMediaId }}>{children}</PlayingVideoContext.Provider>
}

// ---------- Player ----------

interface PostVideoProps {
    post:Post,
    media:PostMedia,
    onDurationLoad?:(seconds:number) => void
}

export default function PostVideo({ post, media, onDurationLoad }:PostVideoProps) {
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { playing_media_id, setPlayingMediaId } = useContext(PlayingVideoContext) // Gets The Playing Video

    const [is_initialized, setIsInitialized] = useState<boolean>(false)
    const [show_controls, setShowControls] = useState<boolean>(true)
    const [is_scrubber_dragged, setIsScrubberDragged] = useState<boolean>(false)
    const [scrubber_preview, setScrubberPreview] = useState<vtt|null>(null)
    const [scrubber_preview_image, setScrubberPreviewImage] = useState<string>("")
    const [scrubber_position, setScrubberPosition] = useState<number>(0)
    const [scrubber_width, setScrubberWidth] = useState<number>(0)
    const controls_timeout = useRef<ReturnType<typeof setTimeout>|null>(null)

    return (
        <DynamicVideo
            logged_in_user={logged_in_user}
            one_post={post}
            one_post_media={media}
            onSetPlayingVideo={setPlayingMediaId}
            playing_video={playing_media_id}
            data_saving_mode={logged_in_user?.data_saving_mode ?? false}
            onVideoDurationLoad={(seconds:number) => onDurationLoad?.(seconds)}
            onSetIsVideoInitialized={setIsInitialized}
            is_video_initialized={is_initialized}
            onShowControls={setShowControls}
            show_controls={show_controls}
            onIsScrubberDragged={setIsScrubberDragged}
            is_scrubber_dragged={is_scrubber_dragged}
            onVttVideoScrubberPreviewUpdate={setScrubberPreview}
            video_scrubber_preview={scrubber_preview}
            onVttVideoScrubberPreviewImageUpdate={setScrubberPreviewImage}
            video_scrubber_preview_image={scrubber_preview_image}
            onScrubberPositionUpdate={setScrubberPosition}
            scrubber_position={scrubber_position}
            onSetScrubberWidth={setScrubberWidth}
            scrubber_width={scrubber_width}

            onStopControlsTimer={() => {
                if(controls_timeout.current) clearTimeout(controls_timeout.current)
            }}

            onStartControlsTimer={() => {
                if(controls_timeout.current) clearTimeout(controls_timeout.current)
                controls_timeout.current = setTimeout(() => setShowControls(false), 5000) // Hides The Controls After 5 Seconds
            }}
        />
    )
}
