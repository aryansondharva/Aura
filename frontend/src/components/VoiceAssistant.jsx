import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Murf AI Config (To be filled by user)
const MURF_API_KEY = import.meta.env.VITE_MURF_API_KEY || '';
const VOICE_ID = 'en-US-marcus'; // Default professional voice

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const audioRef = useRef(new Audio());

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current][0].transcript.toLowerCase();
        setTranscript(result);
        
        // Log interim results for live transcription monitoring
        console.log(`[🎙️ Live Transcript]: ${result}`);
        
        if (event.results[current].isFinal) {
          console.log(`\n=========================================\n🗣️ USER FINAL COMMAND: "${result}"\n=========================================`);
          handleCommand(result);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListeningRef.current) recognitionRef.current.start();
      };
    } else {
      console.error('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const speakWithMurf = async (text) => {
    if (!text) return;
    
    console.log(`\n=========================================\n🤖 AURA AI RESPONSE: "${text}"\n==========================================\n`);
    
    // Fallback to native synthesis if Murf key is missing
    if (!MURF_API_KEY) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      return;
    }

    try {
      setIsProcessing(true);
      const response = await axios.post(
        'https://api.murf.ai/v1/speech/generate',
        {
          text: text,
          voiceId: VOICE_ID,
          style: 'Cheerful',
          rate: 0,
          pitch: 0,
          sampleRate: 48000,
          format: 'MP3',
          channel: 'Mono'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': MURF_API_KEY
          }
        }
      );

      if (response.data?.audioFile) {
        audioRef.current.src = response.data.audioFile;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Murf AI error:', error);
      // Fallback
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommand = (command) => {
    console.log('Processing command:', command);

    if (command.includes('home') || command.includes('go home')) {
      speakWithMurf('Heading home now.');
      navigate('/');
    } else if (command.includes('dashboard')) {
      speakWithMurf('Opening your dashboard.');
      navigate('/dashboard');
    } else if (command.includes('chat')) {
      speakWithMurf('Starting a new chat session.');
      navigate('/chat');
    } else if (command.includes('feature')) {
      speakWithMurf('Checking out the features.');
      navigate('/features');
    } else if (command.includes('developer')) {
      speakWithMurf('Meeting the team.');
      navigate('/developers');
    } else if (command.includes('todo') || command.includes('task')) {
      speakWithMurf('Opening your task list.');
      navigate('/todo');
    } else if (command.includes('settings')) {
      speakWithMurf('Opening settings.');
      navigate('/settings');
    } else if (command.includes('profile')) {
      speakWithMurf('Viewing your profile.');
      navigate('/profile');
    } else if (command.includes('login') || command.includes('sign in')) {
      speakWithMurf('Taking you to the login page.');
      navigate('/signin');
    } else if (command.includes('topic') || command.includes('subject')) {
      speakWithMurf('Opening study topics.');
      navigate('/topics');
    } else if (command.includes('exam') || command.includes('test') || command.includes('quiz')) {
      speakWithMurf('Taking you to the exam arena. Good luck!');
      navigate('/exam');
    } else if (command.includes('progress') || command.includes('performance')) {
      speakWithMurf('Opening your progress report.');
      navigate('/progress');
    } else if (command.includes('archive') || command.includes('history')) {
      speakWithMurf('Accessing your archives and history.');
      navigate('/archive');
    } else if (command.includes('metrics') || command.includes('analytics')) {
      speakWithMurf('Analyzing your study metrics.');
      navigate('/studymetrics');
    } else if (command.includes('scroll down')) {
      window.scrollBy({ top: 500, behavior: 'smooth' });
      speakWithMurf('Scrolling down.');
    } else if (command.includes('scroll up')) {
      window.scrollBy({ top: -500, behavior: 'smooth' });
      speakWithMurf('Scrolling up.');
    } else if (command.includes('scroll to top') || command.includes('go to top')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      speakWithMurf('Taking you to the top of the page.');
    } else if (command.includes('scroll to bottom') || command.includes('go to bottom')) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      speakWithMurf('Taking you to the bottom of the page.');
    } else if (command.includes('go back')) {
      window.history.back();
      speakWithMurf('Going back.');
    } else if (command.includes('reload') || command.includes('refresh')) {
      speakWithMurf('Refreshing the page for you.');
      setTimeout(() => window.location.reload(), 1500);
    } else if (command.includes('logout') || command.includes('sign out')) {
      speakWithMurf('Logging you out. Goodbye.');
      navigate('/');
    } else if (command.includes('time is it') || command.includes('current time')) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      speakWithMurf(`The current time is ${time}.`);
    } else if (command.includes('joke')) {
      speakWithMurf('Why do programmers prefer dark mode? Because light attracts bugs!');
    } else if (command.includes('who are you') || command.includes('what are you')) {
      speakWithMurf('I am Aura, your personal AI study assistant and guide. I am here to make your experience smooth and efficient.');
    } else if (command.includes('thank you') || command.includes('thanks')) {
      speakWithMurf('You are very welcome. Let me know if you need anything else.');
    } else if (command.includes('hello') || command.includes('hi aura') || command.includes('you there')) {
      speakWithMurf('I am here and listening! How can I help you navigate Aura today?');
    } else {
      console.log('Unrecognized command:', command);
      // Logic for unknown commands or conversational AI could go here
    }
    
    // Reset transcript after processing
    setTimeout(() => setTranscript(''), 2000);
  };

  const toggleListening = () => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      speakWithMurf('Voice assistant deactivated.');
    } else {
      isListeningRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch(e) {
        console.log("Already started or failed to start.");
      }
      setIsListening(true);
      speakWithMurf('Listening. Tell me where you want to go.');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="voice-assistant-container" style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '15px'
    }}>
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '12px 20px',
              borderRadius: '20px',
              color: 'white',
              fontSize: '14px',
              maxWidth: '250px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '10px'
            }}
          >
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleListening}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isListening ? '#edb437' : '#272727',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        {isListening ? (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5
            }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(237, 180, 55, 0.4)'
            }}
          />
        ) : null}
        
        {isListening ? <Mic color="#060606" size={24} /> : <MicOff color="white" size={24} />}
      </motion.button>

      {!isListening && (
         <div style={{
           fontSize: '10px',
           color: 'rgba(255, 255, 255, 0.5)',
           textAlign: 'right',
           marginTop: '-5px'
         }}>
           Voice Command
         </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
