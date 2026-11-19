const ERROR_KEYS = {
  'not-allowed': 'micPermissionDenied',
  'service-not-allowed': 'micPermissionDenied',
  'audio-capture': 'micNoDevice',
  network: 'micNetworkError',
  'no-speech': 'micNoSpeech',
  'language-not-supported': 'micLanguageUnsupported',
}

export function createSpeechRecognition(language, { onTranscript, onError, onEnd }) {
  if (typeof window === 'undefined') throw new Error('speechUnsupported')
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) throw new Error('speechUnsupported')
  if (!window.isSecureContext && !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
    throw new Error('micSecureContext')
  }

  const recognition = new SpeechRecognition()
  recognition.lang = language
  recognition.continuous = false
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    let finalTranscript = ''
    let interimTranscript = ''
    for (let index = 0; index < event.results.length; index += 1) {
      const transcript = event.results[index]?.[0]?.transcript || ''
      if (event.results[index].isFinal) finalTranscript += `${transcript} `
      else interimTranscript += `${transcript} `
    }
    onTranscript?.(finalTranscript.trim(), interimTranscript.trim())
  }
  recognition.onerror = (event) => onError?.(ERROR_KEYS[event.error] || 'micUnavailable')
  recognition.onend = () => onEnd?.()

  try {
    recognition.start()
  } catch (error) {
    const key = ERROR_KEYS[error?.name] || (error?.name === 'NotAllowedError' ? 'micPermissionDenied' : 'micUnavailable')
    throw new Error(key)
  }

  return recognition
}
