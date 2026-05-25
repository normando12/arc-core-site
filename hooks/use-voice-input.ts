"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: Iterable<SpeechRecognitionResultLike> & {
    readonly length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  lang: string
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type VoiceInputState = "idle" | "listening" | "unsupported"

export function useVoiceInput(options: {
  onFinalTranscript: (text: string) => void
  onInterimTranscript?: (text: string) => void
  onError?: (message: string) => void
  lang?: string
  disabled?: boolean
}) {
  const { onFinalTranscript, onInterimTranscript, onError, lang, disabled } = options
  const [state, setState] = useState<VoiceInputState>("idle")
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript, onError })
  callbacksRef.current = { onFinalTranscript, onInterimTranscript, onError }

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setState("unsupported")
      return
    }

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang =
      lang ?? (typeof navigator !== "undefined" ? navigator.language : undefined) ?? "pt-BR"

    recognition.onstart = () => setState("listening")

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i]?.[0]?.transcript ?? ""
        if (event.results[i]?.isFinal) final += transcript
        else interim += transcript
      }
      if (interim) callbacksRef.current.onInterimTranscript?.(interim)
      const trimmed = final.trim()
      if (trimmed) callbacksRef.current.onFinalTranscript(trimmed)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (event.error === "aborted") return
      const message =
        event.error === "not-allowed"
          ? "Microphone permission denied."
          : event.error === "no-speech"
            ? "No speech detected. Try again."
            : event.error === "network"
              ? "Voice recognition needs a network connection."
              : "Voice recognition failed. Try again."
      callbacksRef.current.onError?.(message)
      setState("idle")
    }

    recognition.onend = () => setState("idle")

    recognitionRef.current = recognition
    setState("idle")

    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [lang])

  useEffect(() => {
    if (disabled && state === "listening") recognitionRef.current?.stop()
  }, [disabled, state])

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || state === "unsupported" || disabled) return

    if (state === "listening") {
      recognition.stop()
      return
    }

    try {
      recognition.start()
    } catch {
      recognition.stop()
      window.setTimeout(() => {
        try {
          recognition.start()
        } catch {
          callbacksRef.current.onError?.("Could not start voice recognition.")
        }
      }, 120)
    }
  }, [disabled, state])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return {
    state,
    isListening: state === "listening",
    isSupported: state !== "unsupported",
    toggleListening,
    stopListening,
  }
}
