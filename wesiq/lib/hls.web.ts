// Web Video Playback: hls.js For The .m3u8 Streams (Same As The Website) And Keeping The Position When The
// Player Moves Between The Post And The Fullscreen View (Each View Has Its Own <video> Element On Web)

import { useEffect } from "react"
import HlsJs, { ErrorTypes, Events } from "hls.js"

import type { VideoPlayer } from "expo-video"

// Stores The Information If hls.js Plays The Stream: Preferred Whenever Supported, Like On The Website (Chrome's Own
// HLS Playback Is New And Stalls After Seeking); Browsers Without Media Source Extensions Fall Back To Native HLS
export const needs_hls_library:boolean = typeof window !== "undefined" && HlsJs.isSupported() // eslint-disable-line import/no-named-as-default-member

// The Parts Of The expo-video Web Player Used Here (It Mounts One <video> Per VideoView)
interface WebVideoPlayer {
    _mountedVideos?:Set<HTMLVideoElement>,
    _error:{ message:string }|null,
    status:string, // Setting "error" Emits statusChange With _error
    play:() => void,
    mountVideoView:(video:HTMLVideoElement) => void,
    unmountVideoView:(video:HTMLVideoElement) => void
}

interface PlaybackState {
    time:number, // Seconds
    is_playing:boolean
}

const last_states:WeakMap<object, PlaybackState> = new WeakMap() // Where Each Player Was When Its Last <video> Went Away

const MAX_NETWORK_RETRIES:number = 2 // A Missing Stream (404) Would Otherwise Be Retried Forever

// Function For Attach To Every <video> Of The Player (hls.js When A Stream Is Given, Position Handover Always; Returns The Cleanup)
const attachPlayer = (player:VideoPlayer, hls_uri:string|null, user_token:string|null):(() => void) => {
    const web_player = player as unknown as WebVideoPlayer
    const instances:Map<HTMLVideoElement, HlsJs|null> = new Map()

    // Function For Attach To One <video>
    const attach = (video:HTMLVideoElement):void => {
        if(instances.has(video)) return

        const resume:PlaybackState|undefined = last_states.get(player) // Position Of The Previous View / Quality
        last_states.delete(player)

        if(resume) {
            video.addEventListener("loadedmetadata", () => {
                if(resume.time > 0) video.currentTime = resume.time
                if(resume.is_playing) video.play().catch(() => {})
            }, { once: true })
        }

        if(!hls_uri) {
            instances.set(video, null)
            return
        }

        // The Token Goes With The Playlist And Every Segment, So The Server Can Check Access To Private Posts
        const hls:HlsJs = new HlsJs({
            xhrSetup: (xhr:XMLHttpRequest) => {
                if(user_token) xhr.setRequestHeader("Authorization", `Bearer ${user_token}`)
            },
        })
        let network_retries:number = 0
        if(web_player.status === "error") web_player.status = "loading" // A Retry Starts Clean, So A New Failure Is Reported Again

        // Recovers From Network / Media Hiccups Like The Website Player, Then Reports The Error Through The Player Status
        hls.on(Events.ERROR, (_event, data) => {
            if(!data.fatal) return

            const is_manifest_error:boolean = data.details.startsWith("manifest") // hls.js Already Retried Loading The Playlist

            if(data.type === ErrorTypes.NETWORK_ERROR && !is_manifest_error && network_retries < MAX_NETWORK_RETRIES) {
                network_retries += 1
                hls.startLoad()
            }

            else if(data.type === ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()

            else {
                hls.destroy()
                instances.set(video, null)
                web_player._error = { message: data.details }
                web_player.status = "error" // Shows The Error State In The Post
            }
        })

        hls.loadSource(hls_uri)
        hls.attachMedia(video)
        instances.set(video, hls)
    }

    // Function For Detach From One <video> (Remembers Where It Was)
    const detach = (video:HTMLVideoElement):void => {
        if(!instances.has(video)) return
        last_states.set(player, { time: video.currentTime, is_playing: !video.paused })
        instances.get(video)?.destroy()
        instances.delete(video)
    }

    web_player._mountedVideos?.forEach(attach) // Videos Mounted Before (The Post View)

    // expo-video Calls video.play() Without Handling The Rejection (No Source, Interrupted By pause()), Which Shows Up As
    // An Uncaught Error; The Failure Itself Reaches The UI Through The Player Status
    const play = web_player.play.bind(web_player)
    web_player.play = ():void => {
        web_player._mountedVideos?.forEach((video:HTMLVideoElement) => { video.play().catch(() => {}) })
    }

    // Videos Mounted Later (The Fullscreen View) Are Handled Too
    const mountVideoView = web_player.mountVideoView.bind(web_player)
    const unmountVideoView = web_player.unmountVideoView.bind(web_player)

    web_player.mountVideoView = (video:HTMLVideoElement):void => {
        mountVideoView(video)
        attach(video)
    }

    web_player.unmountVideoView = (video:HTMLVideoElement):void => {
        detach(video)
        unmountVideoView(video)
    }

    return () => {
        web_player.mountVideoView = mountVideoView
        web_player.unmountVideoView = unmountVideoView
        web_player.play = play
        instances.forEach((_hls, video:HTMLVideoElement) => detach(video)) // A Quality Switch Resumes From Here
    }
}

// Initializes hls.js (When Needed) And The Position Handover For The Player
export const useHlsSource = (player:VideoPlayer, hls_uri:string|null, user_token:string|null):void => {
    useEffect(() => attachPlayer(player, needs_hls_library ? hls_uri : null, user_token), [player, hls_uri, user_token])
}
